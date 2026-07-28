'use client';

import React, { useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { toast } from 'sonner';

type Platform = 'whatsapp' | 'facebook';
type Tone = 'professional' | 'friendly' | 'urgent';

const TEMPLATES: Record<Platform, Record<Tone, string>> = {
  whatsapp: {
    professional: `Hello! 👋

We're excited to invite you to join *PowerFit Gym — Maadi Branch*.

🏋️ Our packages start from just *EGP 350/month* and include:
✅ Full gym access (6 AM – 11 PM)
✅ Free fitness assessment
✅ Certified trainer guidance

📍 Visit us at: 15 Road 9, Maadi, Cairo
📞 Call/WhatsApp: 01xxxxxxxxx

Limited spots available this week. Secure yours today!`,
    friendly: `Hey there! 😊 

Thinking about getting fit? We've got you! 💪

At *PowerFit Gym* we make fitness fun, affordable, and results-driven. 

🎯 Special offer this week: First month at 20% OFF!
📲 Just reply to this message to grab your spot.

See you at the gym! 🏃`,
    urgent: `⚡ LAST CHANCE — 48 HOURS ONLY!

*PowerFit Gym* has only *3 spots left* at our special rate of EGP 350/month!

🔥 Don't miss:
• Unlimited gym access
• Free body composition analysis
• No joining fee this week only

📲 Reply NOW or call 01xxxxxxxxx
⏰ Offer expires Sunday midnight!`,
  },
  facebook: {
    professional: `🏋️‍♂️ Ready to transform your fitness journey?

PowerFit Gym — Maadi is now accepting new members for August!

What you get with every membership:
→ State-of-the-art equipment
→ Personal trainer consultation
→ Group classes (Zumba, Yoga, CrossFit)
→ Locker rooms & shower facilities

Starting at EGP 350/month with flexible plans available.

📍 15 Road 9, Maadi, Cairo
DM us or call 01xxxxxxxxx to register today! 💪`,
    friendly: `Who's ready to crush their fitness goals this month? 🙌 We're PowerFit Gym and we're here to make your journey amazing! 

Drop a 💪 in the comments if you're ready to start, and we'll send you our latest offers!

📲 DM for a FREE trial session this week only!`,
    urgent: `🚨 Flash Sale — Today Only!

PowerFit Gym is offering 25% OFF all monthly memberships — but only for the next 24 hours!

✅ No joining fees
✅ Bring a friend for free
✅ All classes included

Tag a friend who needs this! 👇
DM us NOW before spots run out! ⚡`,
  },
};

export default function MessageDraftingPanel() {
  const [platform, setPlatform] = useState<Platform>('whatsapp');
  const [tone, setTone] = useState<Tone>('professional');

  const message = TEMPLATES[platform][tone];

  const handleCopy = () => {
    navigator.clipboard.writeText(message).then(() => {
      toast.success('Message copied to clipboard!');
    });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4 h-full">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-positive-bg flex items-center justify-center">
          <Icon name="ChatBubbleLeftRightIcon" size={16} className="text-positive" />
        </div>
        <div>
          <h3 className="text-sm font-600 text-foreground">Sales Message Drafts</h3>
          <p className="text-xs text-muted-foreground">WhatsApp & Facebook lead conversion</p>
        </div>
      </div>

      {/* Platform Selector */}
      <div className="flex gap-2">
        {(['whatsapp', 'facebook'] as Platform[]).map((p) => (
          <button
            key={`platform-${p}`}
            onClick={() => setPlatform(p)}
            className={`flex-1 py-2 rounded-lg text-xs font-600 transition-all duration-150 capitalize ${
              platform === p
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-border'
            }`}
          >
            {p === 'whatsapp' ? '💬 WhatsApp' : '📘 Facebook'}
          </button>
        ))}
      </div>

      {/* Tone Selector */}
      <div className="flex gap-1.5">
        {(['professional', 'friendly', 'urgent'] as Tone[]).map((t) => (
          <button
            key={`tone-${t}`}
            onClick={() => setTone(t)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-500 transition-all duration-150 capitalize ${
              tone === t
                ? 'bg-accent/15 text-accent border border-accent/30' :'bg-muted text-muted-foreground hover:bg-border border border-transparent'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Message Preview */}
      <div className="flex-1 bg-muted rounded-xl p-4 text-xs text-foreground leading-relaxed whitespace-pre-wrap font-400 overflow-y-auto scrollbar-thin min-h-0" style={{ maxHeight: '240px' }}>
        {message}
      </div>

      <button
        onClick={handleCopy}
        className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-600 hover:bg-primary/90 active:scale-95 transition-all duration-150"
      >
        <Icon name="ClipboardDocumentIcon" size={15} />
        Copy Message
      </button>
    </div>
  );
}