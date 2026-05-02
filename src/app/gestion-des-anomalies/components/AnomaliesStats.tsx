import React from 'react';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const stats = [
  {
    id: 'stat-total',
    label: 'Total anomalies actives',
    value: '7',
    sub: '3 créées aujourd\'hui',
    icon: AlertTriangle,
    bg: 'bg-white border-zinc-200',
    iconBg: 'bg-zinc-100',
    iconColor: 'text-zinc-600',
    valueColor: 'text-zinc-800',
  },
  {
    id: 'stat-critiques',
    label: 'Anomalies critiques',
    value: '2',
    sub: 'Intervention immédiate',
    icon: AlertTriangle,
    bg: 'bg-red-50 border-red-200',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    valueColor: 'text-red-700',
  },
  {
    id: 'stat-encours',
    label: 'En cours de traitement',
    value: '4',
    sub: '2 sans responsable',
    icon: Clock,
    bg: 'bg-blue-50 border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    valueColor: 'text-blue-700',
  },
  {
    id: 'stat-resolues',
    label: 'Résolues aujourd\'hui',
    value: '5',
    sub: 'Délai moyen: 4.2h',
    icon: CheckCircle,
    bg: 'bg-emerald-50 border-emerald-200',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    valueColor: 'text-emerald-700',
  },
];

export default function AnomaliesStats() {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {stats?.map((s) => {
        const Icon = s?.icon;
        return (
          <div key={s?.id} className={`metric-card border ${s?.bg}`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${s?.iconBg}`}>
                <Icon size={16} className={s?.iconColor} />
              </div>
            </div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">{s?.label}</p>
            <p className={`text-3xl font-bold font-tabular ${s?.valueColor}`}>{s?.value}</p>
            <p className="text-xs text-zinc-400 mt-1">{s?.sub}</p>
          </div>
        );
      })}
    </div>
  );
}