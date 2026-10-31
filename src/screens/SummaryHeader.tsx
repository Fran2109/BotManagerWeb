import React from 'react';
import { Lamp, LampState } from '../components/ui';

// Account counts by state, shared by the "Running now" and Devices screens:
// one strip of indicator lamps instead of big stat tiles.
interface StatusStripProps {
  items: { value: number; label: string; lamp: LampState }[];
}

export const StatusStrip: React.FC<StatusStripProps> = ({ items }) => (
  <dl className="mx-4 mb-4 grid grid-cols-3 divide-x divide-line rounded-xl border border-line bg-panel">
    {items.map(item => (
      <div key={item.label} className="flex flex-col gap-1 px-3 py-2.5">
        <dt className="flex items-center gap-2 text-sm text-steel">
          <Lamp state={item.lamp} />
          {item.label}
        </dt>
        <dd className="font-display text-2xl font-bold leading-none text-ink">{item.value}</dd>
      </div>
    ))}
  </dl>
);
