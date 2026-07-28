'use client';

import React, { useState, useRef } from 'react';
import Icon from '@/components/ui/AppIcon';

interface AudioPlayerProps {
  url: string;
  duration?: number;
  /** Optional metadata shown inline above the player */
  contactName?: string;
  contactPhone?: string;
  date?: string;
  time?: string;
  durationLabel?: string;
}

export default function AudioPlayer({
  url,
  duration,
  contactName,
  contactPhone,
  date,
  time,
  durationLabel,
}: AudioPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [error, setError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const hasMetadata = contactName || date || durationLabel;

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => setError(true));
      setPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration) {
      setTotalDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => setPlaying(false);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-xs text-muted-foreground">
        <Icon name="ExclamationTriangleIcon" size={14} className="text-warning shrink-0" />
        Recording unavailable
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-muted/40 overflow-hidden min-w-[220px] max-w-[320px]">
      {/* Metadata header */}
      {hasMetadata && (
        <div className="px-3 pt-2.5 pb-1.5 border-b border-border/60 space-y-0.5">
          {contactName && (
            <div className="flex items-center gap-1.5">
              <Icon name="UserIcon" size={11} className="text-muted-foreground shrink-0" />
              <span className="text-xs font-600 text-foreground truncate">{contactName}</span>
            </div>
          )}
          {contactPhone && (
            <div className="flex items-center gap-1.5">
              <Icon name="PhoneIcon" size={11} className="text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">{contactPhone}</span>
            </div>
          )}
          <div className="flex items-center gap-3 flex-wrap pt-0.5">
            {(date || time) && (
              <div className="flex items-center gap-1">
                <Icon name="CalendarIcon" size={11} className="text-muted-foreground shrink-0" />
                <span className="text-[11px] text-muted-foreground">
                  {[date, time].filter(Boolean).join(' · ')}
                </span>
              </div>
            )}
            {durationLabel && (
              <div className="flex items-center gap-1">
                <Icon name="ClockIcon" size={11} className="text-muted-foreground shrink-0" />
                <span className="text-[11px] text-muted-foreground">{durationLabel}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Player controls */}
      <div className="flex items-center gap-2 px-3 py-2">
        <audio
          ref={audioRef}
          src={url}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          preload="metadata"
        />
        <button
          onClick={togglePlay}
          className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 hover:bg-primary/90 transition-colors duration-150"
          title={playing ? 'Pause' : 'Play recording'}
        >
          <Icon name={playing ? 'PauseIcon' : 'PlayIcon'} size={13} className="text-primary-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <input
            type="range"
            min={0}
            max={totalDuration || 1}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 accent-primary cursor-pointer"
          />
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0 w-16 text-right">
          {fmt(currentTime)} / {fmt(totalDuration)}
        </span>
      </div>
    </div>
  );
}
