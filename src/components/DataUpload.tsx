'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import Icon from '@/components/ui/AppIcon';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ColumnMapping {
  name: string;
  phone: string;
  package: string;
  branch: string;
  start_date: string;
  end_date: string;
  amount_paid: string;
  total_amount: string;
  status: string;
}

interface ParsedRow {
  [key: string]: string;
}

interface RowValidation {
  rowIndex: number;
  errors: { field: string; message: string }[];
}

interface ValidationSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  missingName: number;
  missingPhone: number;
  duplicatePhones: number;
  invalidDates: number;
  invalidAmounts: number;
  rowErrors: RowValidation[];
}

interface DataUploadProps {
  onUploadComplete?: (count: number) => void;
}

const REQUIRED_FIELDS: { key: keyof ColumnMapping; label: string; required: boolean }[] = [
  { key: 'name', label: 'Member Name', required: true },
  { key: 'phone', label: 'Phone Number', required: true },
  { key: 'package', label: 'Package Type', required: false },
  { key: 'branch', label: 'Branch', required: false },
  { key: 'start_date', label: 'Start Date', required: false },
  { key: 'end_date', label: 'End Date', required: false },
  { key: 'amount_paid', label: 'Amount Paid', required: false },
  { key: 'total_amount', label: 'Total Amount', required: false },
  { key: 'status', label: 'Status', required: false },
];

function parseCSV(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const row: ParsedRow = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });
  return { headers, rows };
}

function autoDetectMapping(headers: string[]): Partial<ColumnMapping> {
  const mapping: Partial<ColumnMapping> = {};
  const normalize = (s: string) => s.toLowerCase().replace(/[\s_-]/g, '');

  const patterns: { key: keyof ColumnMapping; patterns: string[] }[] = [
    { key: 'name', patterns: ['name', 'fullname', 'membername', 'clientname', 'customername', 'subscriber'] },
    { key: 'phone', patterns: ['phone', 'mobile', 'tel', 'telephone', 'phonenumber', 'contact'] },
    { key: 'package', patterns: ['package', 'plan', 'subscription', 'type', 'packagetype'] },
    { key: 'branch', patterns: ['branch', 'location', 'gym', 'center', 'club'] },
    { key: 'start_date', patterns: ['startdate', 'start', 'joindate', 'joineddate', 'from', 'startingdate'] },
    { key: 'end_date', patterns: ['enddate', 'end', 'expiry', 'expirydate', 'expiration', 'to', 'expiresdate'] },
    { key: 'amount_paid', patterns: ['amountpaid', 'paid', 'paidamount', 'payment', 'amountpayed'] },
    { key: 'total_amount', patterns: ['totalamount', 'total', 'price', 'cost', 'fee', 'amount'] },
    { key: 'status', patterns: ['status', 'memberstatus', 'state', 'active'] },
  ];

  headers.forEach((header) => {
    const norm = normalize(header);
    patterns.forEach(({ key, patterns: pats }) => {
      if (!mapping[key] && pats.some((p) => norm.includes(p) || p.includes(norm))) {
        mapping[key] = header;
      }
    });
  });

  return mapping;
}

function isValidDate(value: string): boolean {
  if (!value || value.trim() === '') return true; // empty is OK (optional field)
  // Accept common formats: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY
  const patterns = [
    /^\d{4}-\d{2}-\d{2}$/,
    /^\d{2}\/\d{2}\/\d{4}$/,
    /^\d{2}-\d{2}-\d{4}$/,
    /^\d{1,2}\/\d{1,2}\/\d{4}$/,
    /^\d{1,2}-\d{1,2}-\d{4}$/,
  ];
  const matchesPattern = patterns.some((p) => p.test(value.trim()));
  if (!matchesPattern) return false;
  const d = new Date(value.trim());
  return !isNaN(d.getTime());
}

function isValidAmount(value: string): boolean {
  if (!value || value.trim() === '') return true; // empty is OK (optional field)
  const cleaned = value.trim().replace(/[,\s]/g, '');
  return /^\d+(\.\d{1,2})?$/.test(cleaned) && parseFloat(cleaned) >= 0;
}

function validateRows(rows: ParsedRow[], mapping: Partial<ColumnMapping>): ValidationSummary {
  const rowErrors: RowValidation[] = [];
  const phoneSeen = new Map<string, number[]>(); // phone -> [rowIndexes]

  let missingName = 0;
  let missingPhone = 0;
  let invalidDates = 0;
  let invalidAmounts = 0;

  rows.forEach((row, idx) => {
    const errors: { field: string; message: string }[] = [];

    // Missing name
    if (mapping.name) {
      const nameVal = (row[mapping.name] || '').trim();
      if (!nameVal) {
        errors.push({ field: 'name', message: 'Member name is missing' });
        missingName++;
      }
    }

    // Missing phone
    if (mapping.phone) {
      const phoneVal = (row[mapping.phone] || '').trim();
      if (!phoneVal) {
        errors.push({ field: 'phone', message: 'Phone number is missing' });
        missingPhone++;
      } else {
        const normalized = phoneVal.replace(/[\s\-\(\)]/g, '');
        if (!phoneSeen.has(normalized)) phoneSeen.set(normalized, []);
        phoneSeen.get(normalized)!.push(idx);
      }
    }

    // Invalid start_date
    if (mapping.start_date) {
      const val = row[mapping.start_date] || '';
      if (!isValidDate(val)) {
        errors.push({ field: 'start_date', message: `Invalid start date: "${val}"` });
        invalidDates++;
      }
    }

    // Invalid end_date
    if (mapping.end_date) {
      const val = row[mapping.end_date] || '';
      if (!isValidDate(val)) {
        errors.push({ field: 'end_date', message: `Invalid end date: "${val}"` });
        invalidDates++;
      }
    }

    // Invalid amount_paid
    if (mapping.amount_paid) {
      const val = row[mapping.amount_paid] || '';
      if (!isValidAmount(val)) {
        errors.push({ field: 'amount_paid', message: `Invalid amount paid: "${val}"` });
        invalidAmounts++;
      }
    }

    // Invalid total_amount
    if (mapping.total_amount) {
      const val = row[mapping.total_amount] || '';
      if (!isValidAmount(val)) {
        errors.push({ field: 'total_amount', message: `Invalid total amount: "${val}"` });
        invalidAmounts++;
      }
    }

    if (errors.length > 0) {
      rowErrors.push({ rowIndex: idx, errors });
    }
  });

  // Mark duplicate phones
  let duplicatePhones = 0;
  phoneSeen.forEach((indexes) => {
    if (indexes.length > 1) {
      duplicatePhones += indexes.length;
      indexes.forEach((idx) => {
        let existing = rowErrors.find((r) => r.rowIndex === idx);
        if (!existing) {
          existing = { rowIndex: idx, errors: [] };
          rowErrors.push(existing);
        }
        existing.errors.push({ field: 'phone', message: 'Duplicate phone number in file' });
      });
    }
  });

  rowErrors.sort((a, b) => a.rowIndex - b.rowIndex);

  const invalidRowSet = new Set(rowErrors.map((r) => r.rowIndex));

  return {
    totalRows: rows.length,
    validRows: rows.length - invalidRowSet.size,
    invalidRows: invalidRowSet.size,
    missingName,
    missingPhone,
    duplicatePhones,
    invalidDates,
    invalidAmounts,
    rowErrors,
  };
}

export default function DataUpload({ onUploadComplete }: DataUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({});
  const [step, setStep] = useState<'upload' | 'map' | 'validate' | 'preview' | 'done'>('upload');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const [showAllErrors, setShowAllErrors] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const validation = useMemo<ValidationSummary | null>(() => {
    if (step !== 'validate' && step !== 'preview') return null;
    return validateRows(rows, mapping);
  }, [rows, mapping, step]);

  const processFile = useCallback((f: File) => {
    if (!f.name.match(/\.(csv|xlsx|xls)$/i)) {
      toast.error('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers: h, rows: r } = parseCSV(text);
      if (h.length === 0) {
        toast.error('Could not parse file. Please ensure it is a valid CSV.');
        return;
      }
      setHeaders(h);
      setRows(r);
      const autoMap = autoDetectMapping(h);
      setMapping(autoMap);
      setStep('map');
    };
    reader.readAsText(f);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }, [processFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const handleImport = async () => {
    if (!user) { toast.error('You must be logged in'); return; }
    if (!mapping.name || !mapping.phone) {
      toast.error('Please map at least the Name and Phone columns');
      return;
    }

    setIsImporting(true);
    const supabase = createClient();
    let success = 0;
    let failed = 0;

    // Only import valid rows (rows without errors)
    const errorRowIndexes = new Set(validation?.rowErrors.map((r) => r.rowIndex) ?? []);
    const validRows = rows.filter((_, idx) => !errorRowIndexes.has(idx));

    try {
      const { data: uploadLog } = await supabase
        .from('data_uploads')
        .insert({
          user_id: user.id,
          file_name: file?.name || 'upload.csv',
          file_type: 'csv',
          total_rows: rows.length,
          status: 'processing',
          column_mapping: mapping,
        })
        .select()
        .single();

      const batchSize = 50;
      for (let i = 0; i < validRows.length; i += batchSize) {
        const batch = validRows.slice(i, i + batchSize).map((row) => ({
          user_id: user.id,
          name: row[mapping.name!] || '',
          phone: row[mapping.phone!] || '',
          package: mapping.package ? (row[mapping.package] || 'Monthly') : 'Monthly',
          branch: mapping.branch ? (row[mapping.branch] || '') : '',
          start_date: mapping.start_date ? (row[mapping.start_date] || '') : '',
          end_date: mapping.end_date ? (row[mapping.end_date] || '') : '',
          amount_paid: mapping.amount_paid ? (parseFloat(row[mapping.amount_paid]) || 0) : 0,
          total_amount: mapping.total_amount ? (parseFloat(row[mapping.total_amount]) || 0) : 0,
          remaining_balance: 0,
          status: 'active' as const,
          payment_status: 'paid' as const,
          assigned_to: user?.user_metadata?.full_name || '',
        }));

        const { error } = await supabase.from('subscribers').insert(batch);
        if (error) {
          failed += batch.length;
        } else {
          success += batch.length;
        }
      }

      if (uploadLog?.id) {
        await supabase
          .from('data_uploads')
          .update({ status: 'completed', imported_rows: success, failed_rows: failed })
          .eq('id', uploadLog.id);
      }

      setImportResult({ success, failed: failed + (validation?.invalidRows ?? 0) });
      setStep('done');
      onUploadComplete?.(success);
      toast.success(`Successfully imported ${success} subscribers!`);
    } catch (err: any) {
      toast.error('Import failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsImporting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setHeaders([]);
    setRows([]);
    setMapping({});
    setStep('upload');
    setImportResult(null);
    setShowAllErrors(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getRowName = (row: ParsedRow) => {
    if (mapping.name && row[mapping.name]) return row[mapping.name];
    return null;
  };

  const getRowPhone = (row: ParsedRow) => {
    if (mapping.phone && row[mapping.phone]) return row[mapping.phone];
    return null;
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
            <Icon name="ArrowUpTrayIcon" size={18} className="text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-600 text-foreground">Upload Data</h3>
            <p className="text-xs text-muted-foreground">Import subscribers from Excel or CSV</p>
          </div>
        </div>
        {step !== 'upload' && (
          <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            <Icon name="ArrowPathIcon" size={13} />
            Start over
          </button>
        )}
      </div>

      <div className="p-6">
        {/* Step: Upload */}
        {step === 'upload' && (
          <div>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-150 ${
                isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center">
                  <Icon name="DocumentArrowUpIcon" size={28} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-600 text-foreground">Drop your file here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">Supports CSV, Excel (.xlsx, .xls)</p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 font-500">CSV</span>
                  <span className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 font-500">XLSX</span>
                  <span className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 font-500">XLS</span>
                </div>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="hidden" />
            <p className="text-xs text-muted-foreground text-center mt-3">
              Your file should have column headers in the first row. Columns will be auto-detected.
            </p>
          </div>
        )}

        {/* Step: Map Columns */}
        {step === 'map' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-info/10 border border-info/20 rounded-lg">
              <Icon name="InformationCircleIcon" size={16} className="text-info shrink-0" />
              <p className="text-xs text-info">
                <span className="font-600">File: {file?.name}</span> — {rows.length} rows detected. Map your columns below.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {REQUIRED_FIELDS.map(({ key, label, required }) => (
                <div key={key}>
                  <label className="block text-xs font-500 text-foreground mb-1.5">
                    {label}
                    {required && <span className="text-negative ml-1">*</span>}
                  </label>
                  <select
                    value={mapping[key] || ''}
                    onChange={(e) => setMapping((prev) => ({ ...prev, [key]: e.target.value || undefined }))}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">— Skip this field —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => { setShowAllErrors(false); setStep('validate'); }}
                disabled={!mapping.name || !mapping.phone}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-600 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
              >
                <Icon name="ShieldCheckIcon" size={15} />
                Validate Data
              </button>
              <button onClick={reset} className="px-4 py-2.5 border border-border rounded-xl text-sm font-500 text-muted-foreground hover:bg-muted transition-all duration-150">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Step: Validate */}
        {step === 'validate' && validation && (
          <div className="space-y-4">
            {/* Summary Banner */}
            {validation.invalidRows === 0 ? (
              <div className="flex items-center gap-3 p-4 bg-positive/10 border border-positive/20 rounded-xl">
                <div className="w-9 h-9 bg-positive/20 rounded-lg flex items-center justify-center shrink-0">
                  <Icon name="CheckCircleIcon" size={20} className="text-positive" />
                </div>
                <div>
                  <p className="text-sm font-600 text-positive">All {validation.totalRows} rows passed validation</p>
                  <p className="text-xs text-positive/80 mt-0.5">No issues detected — ready to import</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-4 bg-negative/10 border border-negative/20 rounded-xl">
                <div className="w-9 h-9 bg-negative/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name="ExclamationTriangleIcon" size={20} className="text-negative" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-600 text-negative">
                    {validation.invalidRows} of {validation.totalRows} rows have issues
                  </p>
                  <p className="text-xs text-negative/80 mt-0.5">
                    {validation.validRows} valid rows will be imported; invalid rows will be skipped
                  </p>
                </div>
              </div>
            )}

            {/* Error Type Breakdown */}
            {validation.invalidRows > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {validation.missingName > 0 && (
                  <div className="flex items-center gap-2 p-2.5 bg-negative/5 border border-negative/20 rounded-lg">
                    <Icon name="UserIcon" size={14} className="text-negative shrink-0" />
                    <div>
                      <p className="text-xs font-600 text-negative">{validation.missingName}</p>
                      <p className="text-xs text-muted-foreground">Missing name</p>
                    </div>
                  </div>
                )}
                {validation.missingPhone > 0 && (
                  <div className="flex items-center gap-2 p-2.5 bg-negative/5 border border-negative/20 rounded-lg">
                    <Icon name="PhoneIcon" size={14} className="text-negative shrink-0" />
                    <div>
                      <p className="text-xs font-600 text-negative">{validation.missingPhone}</p>
                      <p className="text-xs text-muted-foreground">Missing phone</p>
                    </div>
                  </div>
                )}
                {validation.duplicatePhones > 0 && (
                  <div className="flex items-center gap-2 p-2.5 bg-warning/10 border border-warning/20 rounded-lg">
                    <Icon name="DocumentDuplicateIcon" size={14} className="text-warning shrink-0" />
                    <div>
                      <p className="text-xs font-600 text-warning">{validation.duplicatePhones}</p>
                      <p className="text-xs text-muted-foreground">Duplicate phones</p>
                    </div>
                  </div>
                )}
                {validation.invalidDates > 0 && (
                  <div className="flex items-center gap-2 p-2.5 bg-warning/10 border border-warning/20 rounded-lg">
                    <Icon name="CalendarIcon" size={14} className="text-warning shrink-0" />
                    <div>
                      <p className="text-xs font-600 text-warning">{validation.invalidDates}</p>
                      <p className="text-xs text-muted-foreground">Invalid dates</p>
                    </div>
                  </div>
                )}
                {validation.invalidAmounts > 0 && (
                  <div className="flex items-center gap-2 p-2.5 bg-warning/10 border border-warning/20 rounded-lg">
                    <Icon name="CurrencyDollarIcon" size={14} className="text-warning shrink-0" />
                    <div>
                      <p className="text-xs font-600 text-warning">{validation.invalidAmounts}</p>
                      <p className="text-xs text-muted-foreground">Amount errors</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Row-Level Error Table */}
            {validation.rowErrors.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-muted border-b border-border">
                  <span className="text-xs font-600 text-foreground">Rows with issues</span>
                  <span className="text-xs text-muted-foreground">{validation.rowErrors.length} rows</span>
                </div>
                <div className="overflow-x-auto max-h-56 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                      <tr>
                        <th className="px-3 py-2 text-left font-600 text-muted-foreground w-12">Row</th>
                        <th className="px-3 py-2 text-left font-600 text-muted-foreground">Name</th>
                        <th className="px-3 py-2 text-left font-600 text-muted-foreground">Phone</th>
                        <th className="px-3 py-2 text-left font-600 text-muted-foreground">Issues</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(showAllErrors ? validation.rowErrors : validation.rowErrors.slice(0, 8)).map(({ rowIndex, errors }) => {
                        const row = rows[rowIndex];
                        return (
                          <tr key={rowIndex} className="bg-negative/5 hover:bg-negative/10 transition-colors">
                            <td className="px-3 py-2 text-muted-foreground font-500">{rowIndex + 2}</td>
                            <td className="px-3 py-2">
                              {getRowName(row) ? (
                                <span className="text-foreground">{getRowName(row)}</span>
                              ) : (
                                <span className="text-negative italic">empty</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {getRowPhone(row) ? (
                                <span className="text-foreground">{getRowPhone(row)}</span>
                              ) : (
                                <span className="text-negative italic">empty</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                {errors.map((err, ei) => (
                                  <span
                                    key={ei}
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-500 ${
                                      err.field === 'phone' && err.message.includes('Duplicate')
                                        ? 'bg-warning/15 text-warning' :'bg-negative/15 text-negative'
                                    }`}
                                  >
                                    {err.message}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {validation.rowErrors.length > 8 && (
                  <div className="px-3 py-2 bg-muted/50 border-t border-border text-center">
                    <button
                      onClick={() => setShowAllErrors((v) => !v)}
                      className="text-xs text-primary hover:underline font-500"
                    >
                      {showAllErrors
                        ? 'Show fewer rows'
                        : `Show all ${validation.rowErrors.length} rows with issues`}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-1">
              {validation.validRows > 0 ? (
                <button
                  onClick={() => setStep('preview')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-600 hover:bg-primary/90 transition-all duration-150"
                >
                  <Icon name="EyeIcon" size={15} />
                  {validation.invalidRows > 0
                    ? `Preview & Import ${validation.validRows} Valid Rows`
                    : `Preview ${validation.validRows} Rows`}
                </button>
              ) : (
                <button
                  disabled
                  className="flex items-center gap-2 px-4 py-2.5 bg-muted text-muted-foreground rounded-xl text-sm font-600 cursor-not-allowed"
                >
                  <Icon name="XCircleIcon" size={15} />
                  No Valid Rows to Import
                </button>
              )}
              <button
                onClick={() => setStep('map')}
                className="px-4 py-2.5 border border-border rounded-xl text-sm font-500 text-muted-foreground hover:bg-muted transition-all duration-150"
              >
                Back to Mapping
              </button>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && validation && (
          <div className="space-y-4">
            {validation.invalidRows > 0 ? (
              <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <Icon name="ExclamationTriangleIcon" size={16} className="text-warning shrink-0" />
                <p className="text-xs text-warning font-500">
                  {validation.invalidRows} invalid rows will be skipped — importing {validation.validRows} valid rows from {file?.name}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-positive/10 border border-positive/20 rounded-lg">
                <Icon name="CheckCircleIcon" size={16} className="text-positive shrink-0" />
                <p className="text-xs text-positive font-500">
                  All {validation.validRows} rows passed validation — ready to import from {file?.name}
                </p>
              </div>
            )}

            {/* Preview Table */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      <th className="px-3 py-2 text-left font-600 text-muted-foreground">Name</th>
                      <th className="px-3 py-2 text-left font-600 text-muted-foreground">Phone</th>
                      {mapping.package && <th className="px-3 py-2 text-left font-600 text-muted-foreground">Package</th>}
                      {mapping.branch && <th className="px-3 py-2 text-left font-600 text-muted-foreground">Branch</th>}
                      {mapping.amount_paid && <th className="px-3 py-2 text-left font-600 text-muted-foreground">Paid</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.slice(0, 5).map((row, i) => {
                      const hasError = validation.rowErrors.some((r) => r.rowIndex === i);
                      return (
                        <tr key={i} className={hasError ? 'bg-negative/5 opacity-60' : 'hover:bg-muted/50'}>
                          <td className="px-3 py-2 text-foreground">{row[mapping.name!] || '—'}</td>
                          <td className="px-3 py-2 text-muted-foreground">{row[mapping.phone!] || '—'}</td>
                          {mapping.package && <td className="px-3 py-2 text-muted-foreground">{row[mapping.package] || '—'}</td>}
                          {mapping.branch && <td className="px-3 py-2 text-muted-foreground">{row[mapping.branch] || '—'}</td>}
                          {mapping.amount_paid && <td className="px-3 py-2 text-muted-foreground">{row[mapping.amount_paid] || '—'}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {rows.length > 5 && (
                <div className="px-3 py-2 bg-muted/50 border-t border-border text-xs text-muted-foreground text-center">
                  Showing 5 of {rows.length} rows ({validation.validRows} valid)
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleImport}
                disabled={isImporting || validation.validRows === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-600 hover:bg-primary/90 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-150"
              >
                {isImporting ? (
                  <><Icon name="ArrowPathIcon" size={15} className="animate-spin" />Importing...</>
                ) : (
                  <><Icon name="ArrowUpTrayIcon" size={15} />Import {validation.validRows} Subscribers</>
                )}
              </button>
              <button onClick={() => setStep('validate')} className="px-4 py-2.5 border border-border rounded-xl text-sm font-500 text-muted-foreground hover:bg-muted transition-all duration-150">
                Back
              </button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && importResult && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-positive/10 rounded-full flex items-center justify-center mx-auto">
              <Icon name="CheckCircleIcon" size={32} className="text-positive" />
            </div>
            <div>
              <h4 className="text-base font-700 text-foreground">Import Complete!</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {importResult.success} subscribers imported successfully
                {importResult.failed > 0 && `, ${importResult.failed} rows skipped`}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={reset}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-600 hover:bg-primary/90 transition-all duration-150"
              >
                <Icon name="ArrowUpTrayIcon" size={15} />
                Upload Another File
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
