'use client';
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';

const fournisseurScores = [
  { nom: 'PackSud', score: 72, nb: 8 },
  { nom: 'Embaltech', score: 91, nb: 12 },
  { nom: 'VerdePack', score: 85, nb: 6 },
  { nom: 'BottleFirst', score: 94, nb: 15 },
  { nom: 'EcoContain', score: 88, nb: 9 },
];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.[0]) return null;
  const score = payload[0].value;
  const entry = fournisseurScores.find((f) => f.nom === label);
  return (
    <div className="bg-white border border-zinc-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-zinc-800 mb-1">{label}</p>
      <p className={`font-bold font-tabular text-lg ${score >= 80 ? 'text-emerald-600' : 'text-red-600'}`}>{score}%</p>
      <p className="text-zinc-400">{entry?.nb} contrôles</p>
      <p className={`font-medium mt-1 ${score >= 80 ? 'text-emerald-600' : 'text-red-600'}`}>
        {score >= 80 ? '✓ Conforme' : '⚠ Sous seuil'}
      </p>
    </div>
  );
};

export default function EmballageScoreChart() {
  return (
    <div className="card-section">
      <div className="section-header">
        <div>
          <h2 className="text-sm font-semibold text-zinc-800">Score qualité par fournisseur</h2>
          <p className="text-xs text-zinc-400 mt-0.5">30 derniers jours — Seuil min: 80%</p>
        </div>
      </div>
      <div className="p-5">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={fournisseurScores} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
            <XAxis dataKey="nom" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="5 3" strokeWidth={1.5} label={{ value: 'Seuil 80%', position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }} />
            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
              {fournisseurScores.map((entry) => (
                <Cell
                  key={`cell-emb-${entry.nom}`}
                  fill={entry.score >= 80 ? '#0d9488' : '#ef4444'}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}