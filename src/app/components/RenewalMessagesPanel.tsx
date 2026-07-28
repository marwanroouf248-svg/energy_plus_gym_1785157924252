'use client';

import React, { useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { toast } from 'sonner';

const RENEWAL_TEMPLATES = [
  {
    id: 'renewal-1',
    name: 'Friendly Reminder',
    days: 7,
    message: `Hey [Name]! 👋

Your PowerFit membership expires in *7 days* — and we'd hate to see you go! 😊You've been crushing it lately 💪 Don't let your progress stop now!

🎁 Renew this week and get:
→ 1 free personal training session
→ Priority class booking for next month

Reply to renew or call us at 01xxxxxxxxx. We're rooting for you! 🏆`,
  },
  {
    id: 'renewal-2',
    name: 'Last Day Urgency',
    days: 1,
    message: `[Name], your membership ends *TODAY*! ⏰

We don't want to lose you as a member — you've worked too hard to stop now! 💪

✅ Renew in the next few hours and keep your streak going
✅ Same rate, no re-joining fee
✅ Your locker assignment stays the same

📲 Call us NOW: 01xxxxxxxxx
Or reply here and we'll sort it out for you! 🙌`,
  },
  {
    id: 'renewal-3',name: 'Win-Back Message',
    days: -14,
    message: `Hey [Name]! We miss you at the gym 😔

It's been a couple of weeks since your membership expired — and we want you back!

💥 Special comeback offer just for you:
→ 15% off your renewal this week only
→ Free body measurement update session
→ New classes added since you left!

Life gets busy, we get it. But your health always comes first 💪

DM us or call 01xxxxxxxxx — let's get you back on track! 🏃`,
  },
];

export default function RenewalMessagesPanel() {
  const [selected, setSelected] = useState('renewal-1');
  const current = RENEWAL_TEMPLATES.find((t) => t.id === selected)!;

  const handleCopy = () => {
    navigator.clipboard.writeText(current.message).then(() => {
      toast.success('Renewal message copied!');
    });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4 h-full">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-warning-bg flex items-center justify-center">
          <Icon name="ArrowPathIcon" size={16} className="text-warning" />
        </div>
        <div>
          <h3 className="text-sm font-600 text-foreground">Renewal Messages</h3>
          <p className="text-xs text-muted-foreground">Motivating tone for expiring members</p>
        </div>
      </div>

      {/* Template Selector */}
      <div className="flex flex-col gap-1.5">
        {RENEWAL_TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelected(t.id)}
            className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all duration-150 text-left ${
              selected === t.id
                ? 'bg-warning-bg border border-warning/30 text-warning' :'bg-muted text-muted-foreground hover:bg-border border border-transparent'
            }`}
          >
            <span className="font-500">{t.name}</span>
            <span className={`text-xs tabular-nums ${selected === t.id ? 'text-warning/70' : 'text-muted-foreground'}`}>
              {t.days > 0 ? `${t.days}d before` : t.days === 1 ? 'Last day' : `${Math.abs(t.days)}d after`}
            </span>
          </button>
        ))}
      </div>

      {/* Message Preview */}
      <div className="flex-1 bg-muted rounded-xl p-4 text-xs text-foreground leading-relaxed whitespace-pre-wrap font-400 overflow-y-auto scrollbar-thin" style={{ maxHeight: '200px' }}>
        {current.message}
      </div>

      <p className="text-xs text-muted-foreground">
        Replace <span className="font-600 text-foreground">[Name]</span> with the member's first name before sending.
      </p>

      <button
        onClick={handleCopy}
        className="flex items-center justify-center gap-2 w-full py-2.5 bg-warning text-white rounded-lg text-sm font-600 hover:bg-warning/90 active:scale-95 transition-all duration-150"
      >
        <Icon name="ClipboardDocumentIcon" size={15} />
        Copy Renewal Message
      </button>
    </div>
  );
}