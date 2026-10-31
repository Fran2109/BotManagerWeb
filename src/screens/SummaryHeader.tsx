import React from 'react';
import { Lamp, LampState } from '../components/ui';

// Account counts by state, shared by the In progress and Devices screens:
// one strip of indicator lamps instead of big stat tiles.
interface StatusStripProps {
  items: { value: number; label: string; lamp: LampState }[];
}

export const StatusStrip: React.FC<StatusStripProps> = ({ items }) => (
  <dl className="mx-4 mb-4 grid grid-cols-3 divide-x divide-line rounded-lg border border-line bg-surface">
    {items.map(item => (
      <div key={item.label} className="flex min-w-0 flex-col gap-1.5 px-2.5 py-2.5">
        <dt className="flex min-w-0 items-center gap-1.5 text-[13px] leading-tight text-muted">
          <Lamp state={item.lamp} />
          {item.label}
        </dt>
        <dd className="text-xl font-semibold leading-none text-ink">{item.value}</dd>
      </div>
    ))}
  </dl>
);
