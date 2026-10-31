import React from 'react';

// Title + three counters shared by the In Progress and Device Status screens.
interface SummaryHeaderProps {
  title: string;
  subtitle: string;
  items: { value: number; label: string; color: string }[];
}

export const SummaryHeader: React.FC<SummaryHeaderProps> = ({ title, subtitle, items }) => (
  <div className="border-b border-line bg-white px-4 pb-4 pt-5">
    <h2 className="text-center text-2xl font-bold text-ink">{title}</h2>
    <p className="mb-4 text-center text-sm text-muted">{subtitle}</p>
    <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
      {items.map(item => (
        <div key={item.label} className="rounded-xl bg-surface py-3 text-center">
          <p className="text-2xl font-bold" style={{ color: item.color }}>
            {item.value}
          </p>
          <p className="text-xs font-medium text-muted">{item.label}</p>
        </div>
      ))}
    </div>
  </div>
);
