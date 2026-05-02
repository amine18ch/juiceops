'use client';
import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';

const tempHistory = [
  { heure: '00h', cf1: 2.0, cf2: 3.2, fridgePrep: 3.8, prodA: 13.2, stockFinis: 3.1 },
  { heure: '01h', cf1: 2.1, cf2: 3.3, fridgePrep: 3.9, prodA: 13.0, stockFinis: 3.2 },
  { heure: '02h', cf1: 2.0, cf2: 3.1, fridgePrep: 3.7, prodA: 12.8, stockFinis: 3.0 },
  { heure: '03h', cf1: 1.9, cf2: 3.2, fridgePrep: 3.8, prodA: 12.9, stockFinis: 3.1 },
  { heure: '04h', cf1: 2.0, cf2: 3.4, fridgePrep: 3.9, prodA: 13.1, stockFinis: 3.2 },
  { heure: '05h', cf1: 2.2, cf2: 3.5, fridgePrep: 4.0, prodA: 13.4, stockFinis: 3.3 },
  { heure: '06h', cf1: 2.1, cf2: 3.8, fridgePrep: 4.2, prodA: 14.1, stockFinis: 3.5 },
  { heure: '07h', cf1: 2.3, cf2: 4.1, fridgePrep: 4.0, prodA: 14.8, stockFinis: 3.6 },
  { heure: '08h', cf1: 2.0, cf2: 4.5, fridgePrep: 3.9, prodA: 15.3, stockFinis: 3.7 },
  { heure: '08h30', cf1: 2.2, cf2: 5.2, fridgePrep: 4.1, prodA: 16.8, stockFinis: 3.8 },
  { heure: '09h', cf1: 2.1, cf2: 6.1, fridgePrep: 4.3, prodA: 18.2, stockFinis: 3.8 },
];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string }) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-white border border-zinc-200 rounded-lg shadow-lg p-3 text-xs min-w-[160px]">
      <p className="font-semibold text-zinc-800 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={`temp-tip-${p.name}`} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }} className="font-medium">{p.name}</span>
          <span className="font-tabular font-semibold">{p.value}°C</span>
        </div>
      ))}
    </div>
  );
};

const zoneLines = [
  { key: 'cf1', name: 'CF 1', color: '#0d9488', dash: false },
  { key: 'cf2', name: 'CF 2', color: '#ef4444', dash: true },
  { key: 'fridgePrep', name: 'Frigo Prép.', color: '#3b82f6', dash: false },
  { key: 'prodA', name: 'Zone Prod. A', color: '#f97316', dash: true },
  { key: 'stockFinis', name: 'Stock Finis', color: '#8b5cf6', dash: false },
];

export default function TemperatureChart() {
  const [hiddenLines, setHiddenLines] = useState<string[]>([]);

  const toggleLine = (key: string) => {
    setHiddenLines((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };

  return (
    <div className="card-section">
      <div className="section-header">
        <div>
          <h2 className="text-sm font-semibold text-zinc-800">Historique températures — 24 heures</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Toutes zones — Ligne rouge = seuil HACCP dépassé</p>
        </div>
        <div className="flex gap-1 flex-wrap">
          {zoneLines.map((z) => (
            <button
              key={`toggle-line-${z.key}`}
              onClick={() => toggleLine(z.key)}
              className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-all ${
                hiddenLines.includes(z.key)
                  ? 'bg-zinc-100 text-zinc-400 border-zinc-200' :'border-zinc-300 text-zinc-700'
              }`}
              style={{ color: hiddenLines.includes(z.key) ? undefined : z.color, borderColor: hiddenLines.includes(z.key) ? undefined : z.color }}
            >
              {z.name}
            </button>
          ))}
        </div>
      </div>
      <div className="p-5">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={tempHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
            <XAxis dataKey="heure" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} unit="°C" domain={[0, 22]} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            {/* Seuil max chambre froide */}
            <ReferenceLine y={4} stroke="#ef4444" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: 'Seuil CF 4°C', position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }} />
            {/* Seuil max zone production */}
            <ReferenceLine y={15} stroke="#f97316" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: 'Seuil Prod 15°C', position: 'insideTopRight', fontSize: 10, fill: '#f97316' }} />
            {zoneLines.map((z) => (
              <Line
                key={`line-${z.key}`}
                dataKey={z.key}
                name={z.name}
                stroke={z.color}
                strokeWidth={hiddenLines.includes(z.key) ? 0 : 2}
                dot={{ r: 2.5, fill: z.color }}
                type="monotone"
                strokeDasharray={z.dash ? '5 3' : undefined}
                hide={hiddenLines.includes(z.key)}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}