'use client';
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';

const anomaliesData = [
  { jour: 'Lun 10', critiques: 2, majeures: 3, mineures: 4 },
  { jour: 'Mar 11', critiques: 1, majeures: 5, mineures: 2 },
  { jour: 'Mer 12', critiques: 3, majeures: 2, mineures: 6 },
  { jour: 'Jeu 13', critiques: 0, majeures: 4, mineures: 3 },
  { jour: 'Ven 14', critiques: 2, majeures: 1, mineures: 5 },
  { jour: 'Sam 15', critiques: 1, majeures: 3, mineures: 1 },
  { jour: 'Auj 16', critiques: 2, majeures: 2, mineures: 3 },
];

const tempData = [
  { heure: '06h', cf1: 2.1, cf2: 3.8, fridgePrepA: 4.2, production: 14.1 },
  { heure: '07h', cf1: 2.3, cf2: 4.1, fridgePrepA: 4.0, production: 14.8 },
  { heure: '08h', cf1: 2.0, cf2: 4.5, fridgePrepA: 3.9, production: 15.3 },
  { heure: '08h30', cf1: 2.2, cf2: 5.2, fridgePrepA: 4.1, production: 16.8 },
  { heure: '09h', cf1: 2.1, cf2: 6.1, fridgePrepA: 4.3, production: 18.2 },
];

const CustomTooltipAnomalies = ({ active, payload, label }: { active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string }) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-white border border-zinc-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-zinc-800 mb-2">{label}</p>
      {payload.map((p) => (
        <p key={`tip-anom-${p.name}`} style={{ color: p.color }} className="flex gap-2">
          <span className="font-medium">{p.name}:</span>
          <span className="font-tabular">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

const CustomTooltipTemp = ({ active, payload, label }: { active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string }) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-white border border-zinc-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-zinc-800 mb-2">{label}</p>
      {payload.map((p) => (
        <p key={`tip-temp-${p.name}`} style={{ color: p.color }} className="flex gap-2">
          <span className="font-medium">{p.name}:</span>
          <span className="font-tabular">{p.value}°C</span>
        </p>
      ))}
    </div>
  );
};

export default function DashboardCharts() {
  return (
    <>
      {/* Anomalies 7 jours */}
      <div className="card-section">
        <div className="section-header">
          <div>
            <h2 className="text-sm font-semibold text-zinc-800">Anomalies — 7 derniers jours</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Répartition par niveau de sévérité</p>
          </div>
          <span className="text-xs text-zinc-400">Total: 41 anomalies</span>
        </div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={anomaliesData} barSize={12} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
              <XAxis dataKey="jour" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltipAnomalies />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Bar dataKey="critiques" name="Critiques" fill="#ef4444" radius={[3, 3, 0, 0]} />
              <Bar dataKey="majeures" name="Majeures" fill="#f97316" radius={[3, 3, 0, 0]} />
              <Bar dataKey="mineures" name="Mineures" fill="#eab308" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Températures 24h */}
      <div className="card-section">
        <div className="section-header">
          <div>
            <h2 className="text-sm font-semibold text-zinc-800">Températures — Dernières heures</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              <span className="text-red-500 font-medium">⚠ CF2 hors seuil depuis 08h30</span>
            </p>
          </div>
          <span className="text-xs font-medium text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
            2 zones NOK
          </span>
        </div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={tempData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
              <XAxis dataKey="heure" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} unit="°C" />
              <Tooltip content={<CustomTooltipTemp />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Line dataKey="cf1" name="Chambre F. 1" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} type="monotone" />
              <Line dataKey="cf2" name="Chambre F. 2" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} type="monotone" strokeDasharray="4 2" />
              <Line dataKey="fridgePrepA" name="Frigo Prép. A" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} type="monotone" />
              <Line dataKey="production" name="Zone Prod." stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} type="monotone" strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}