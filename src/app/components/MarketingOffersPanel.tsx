'use client';

import React, { useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { toast } from 'sonner';

const MARKETING_IDEAS = [
  {
    id: 'offer-1',
    season: 'Ramadan',
    icon: '🌙',
    title: 'Ramadan Night Owl Package',
    description: 'Offer late-night gym hours (10 PM – 2 AM) during Ramadan at a special rate.',
    offer: 'EGP 250/month for Ramadan-only membership',
    channel: 'WhatsApp broadcast + Facebook story',
    urgency: 'High',
  },
  {
    id: 'offer-2',
    season: 'Summer Slow Season',
    icon: '☀️',
    title: 'Summer Buddy Deal',
    description: 'Bring a friend and both get 20% off. Targets July–August when sign-ups drop.',
    offer: 'Refer a friend → both pay EGP 280 instead of EGP 350',
    channel: 'Instagram stories + WhatsApp status',
    urgency: 'High',
  },
  {
    id: 'offer-3',
    season: 'Back to School',
    icon: '📚',
    title: 'Student Fitness Pass',
    description: 'Student ID discount targeting university students returning in September.',
    offer: 'EGP 200/month with valid student ID',
    channel: 'Facebook groups + campus flyers',
    urgency: 'Medium',
  },
  {
    id: 'offer-4',
    season: 'New Year',
    icon: '🎯',
    title: 'New Year Transformation',
    description: 'January resolution campaign with 3-month commitment at discounted rate.',
    offer: '3 months for EGP 900 (save EGP 150)',
    channel: 'All channels + Google Maps post',
    urgency: 'High',
  },
  {
    id: 'offer-5',
    season: 'Mid-Month Slump',
    icon: '📉',
    title: 'Flash Weekend Sale',
    description: 'Quick 48-hour offer when mid-month sign-ups are below target.',
    offer: 'This weekend only: join for EGP 299, no fees',
    channel: 'WhatsApp broadcast urgent blast',
    urgency: 'Urgent',
  },
];

const URGENCY_STYLE: Record<string, string> = {
  High:   'bg-warning-bg text-warning border-warning/20',
  Medium: 'bg-info-bg text-info border-info/20',
  Urgent: 'bg-negative-bg text-negative border-negative/20',
};

export default function MarketingOffersPanel() {
  const [expanded, setExpanded] = useState<string | null>('offer-2');

  const handleCopyIdea = (idea: typeof MARKETING_IDEAS[0]) => {
    const text = `${idea.title}\n\n${idea.description}\n\nOffer: ${idea.offer}\nChannel: ${idea.channel}`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`"${idea.title}" idea copied!`);
    });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4 h-full">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
          <Icon name="LightBulbIcon" size={16} className="text-accent" />
        </div>
        <div>
          <h3 className="text-sm font-600 text-foreground">Marketing Offer Ideas</h3>
          <p className="text-xs text-muted-foreground">Slow season conversion strategies</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto scrollbar-thin" style={{ maxHeight: '480px' }}>
        {MARKETING_IDEAS.map((idea) => {
          const isOpen = expanded === idea.id;
          return (
            <div
              key={idea.id}
              className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                isOpen ? 'border-accent/30 bg-accent/5' : 'border-border bg-muted hover:border-border/80'
              }`}
            >
              <button
                onClick={() => setExpanded(isOpen ? null : idea.id)}
                className="w-full flex items-center gap-3 px-3 py-3 text-left"
              >
                <span className="text-base">{idea.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-600 text-foreground truncate">{idea.title}</p>
                  <p className="text-xs text-muted-foreground">{idea.season}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-500 px-1.5 py-0.5 rounded-full border ${URGENCY_STYLE[idea.urgency]}`}>
                    {idea.urgency}
                  </span>
                  <Icon
                    name={isOpen ? 'ChevronUpIcon' : 'ChevronDownIcon'}
                    size={14}
                    className="text-muted-foreground"
                  />
                </div>
              </button>

              {isOpen && (
                <div className="px-3 pb-3 space-y-2 slide-up">
                  <p className="text-xs text-muted-foreground leading-relaxed">{idea.description}</p>
                  <div className="bg-card rounded-lg p-2.5 border border-border space-y-1.5">
                    <div className="flex items-start gap-2">
                      <Icon name="TagIcon" size={12} className="text-primary mt-0.5 shrink-0" />
                      <p className="text-xs text-foreground">{idea.offer}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Icon name="MegaphoneIcon" size={12} className="text-primary mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground">{idea.channel}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopyIdea(idea)}
                    className="flex items-center gap-1.5 text-xs text-primary font-500 hover:underline"
                  >
                    <Icon name="ClipboardDocumentIcon" size={12} />
                    Copy idea
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}