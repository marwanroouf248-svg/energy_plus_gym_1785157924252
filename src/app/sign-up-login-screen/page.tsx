import React from 'react';
import Image from 'next/image';
import LoginForm from './components/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex" style={{ background: '#0d0f14' }}>
      {/* Brand Panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0f1118 0%, #0d0f14 60%, #111008 100%)' }}
      >
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full opacity-30" style={{ background: 'radial-gradient(ellipse 60% 50% at 30% 20%, rgba(201,168,76,0.12) 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 right-0 w-96 h-96 opacity-20" style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.15) 0%, transparent 70%)' }} />
          <div className="absolute top-1/3 left-1/4 w-px h-48 opacity-20" style={{ background: 'linear-gradient(to bottom, transparent, #c9a84c, transparent)' }} />
          <div className="absolute top-1/2 right-1/3 w-px h-32 opacity-10" style={{ background: 'linear-gradient(to bottom, transparent, #c9a84c, transparent)' }} />
          <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#c9a84c" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl blur-md opacity-50" style={{ background: 'radial-gradient(circle, #c9a84c, transparent)' }} />
              <div className="relative w-12 h-12 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(201,168,76,0.3)' }}>
                <Image
                  src="/assets/images/328A1CF7-CBED-4839-A339-01A156563B74-1785160489268.jpg"
                  alt="Energy Plus Logo"
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
            </div>
            <div>
              <span className="font-700 text-xl tracking-tight" style={{ color: '#f0f2f8' }}>Energy Plus</span>
              <p className="text-[10px] tracking-widest uppercase font-500" style={{ color: '#c9a84c', letterSpacing: '0.14em' }}>Premium CRM</p>
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-6" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#c9a84c', boxShadow: '0 0 6px #c9a84c' }} />
              <span className="text-xs font-500" style={{ color: '#c9a84c' }}>Sales Command Center</span>
            </div>
            <h1 className="text-4xl font-800 leading-tight mb-4" style={{ color: '#f0f2f8' }}>
              Your team&apos;s<br />
              <span style={{ background: 'linear-gradient(135deg, #c9a84c, #e8b84b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                command center
              </span>
            </h1>
            <p className="text-base leading-relaxed" style={{ color: '#6b7494' }}>
              Register subscribers, track revenue, draft conversion messages, and hit your monthly targets — all in one place.
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="relative z-10 grid grid-cols-3 gap-3">
          {[
            { label: 'Avg Renewal Rate', value: '78%' },
            { label: 'Time Saved/Day', value: '2.4 hrs' },
            { label: 'Revenue Tracked', value: 'EGP 2M+' },
          ]?.map((stat) => (
            <div
              key={`stat-${stat?.label}`}
              className="rounded-xl p-4"
              style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.12)' }}
            >
              <p className="font-700 text-xl tabular-nums" style={{ color: '#c9a84c' }}>{stat?.value}</p>
              <p className="text-xs mt-1" style={{ color: '#6b7494' }}>{stat?.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Form Panel */}
      <div
        className="w-full lg:w-1/2 flex items-center justify-center p-8 overflow-y-auto"
        style={{ background: '#0d0f14' }}
      >
        <LoginForm />
      </div>
    </div>
  );
}