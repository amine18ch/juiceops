import React from 'react';
import {
  CheckCircle, AlertTriangle, Thermometer, Package,
  ClipboardCheck, Users, TrendingUp, Clock,
} from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


// Bento grid plan: 8 cards → grid-cols-4
// Row 1: hero (conformité, spans 2 cols) + anomalies ouvertes + températures NOK
// Row 2: lots en attente + score hygiène + fournisseurs à risque + délai résolution + CA jour

const kpis = [
  {
    id: 'kpi-conformite',
    label: 'Taux de conformité',
    value: '94.2',
    unit: '%',
    sub: '+1.3% vs hier',
    trend: 'up',
    icon: CheckCircle,
    colSpan: 'col-span-2',
    hero: true,
    bg: 'bg-teal-50 border-teal-200',
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-700',
    valueColor: 'text-teal-800',
    subColor: 'text-teal-600',
  },
  {
    id: 'kpi-anomalies',
    label: 'Anomalies ouvertes',
    value: '7',
    unit: '',
    sub: '2 critiques',
    trend: 'bad',
    icon: AlertTriangle,
    colSpan: 'col-span-1',
    hero: false,
    bg: 'bg-red-50 border-red-200',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    valueColor: 'text-red-700',
    subColor: 'text-red-500',
  },
  {
    id: 'kpi-temperatures',
    label: 'Zones hors seuil',
    value: '2',
    unit: '',
    sub: 'CF2 + Prod. A',
    trend: 'bad',
    icon: Thermometer,
    colSpan: 'col-span-1',
    hero: false,
    bg: 'bg-orange-50 border-orange-200',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    valueColor: 'text-orange-700',
    subColor: 'text-orange-500',
  },
  {
    id: 'kpi-lots',
    label: 'Lots en attente',
    value: '3',
    unit: '',
    sub: 'À contrôler',
    trend: 'warn',
    icon: Package,
    colSpan: 'col-span-1',
    hero: false,
    bg: 'bg-amber-50 border-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    valueColor: 'text-amber-700',
    subColor: 'text-amber-500',
  },
  {
    id: 'kpi-hygiene',
    label: 'Score hygiène',
    value: '88',
    unit: '%',
    sub: 'Session 08h00',
    trend: 'ok',
    icon: ClipboardCheck,
    colSpan: 'col-span-1',
    hero: false,
    bg: 'bg-white border-zinc-200',
    iconBg: 'bg-zinc-100',
    iconColor: 'text-zinc-600',
    valueColor: 'text-zinc-800',
    subColor: 'text-zinc-500',
  },
  {
    id: 'kpi-fournisseurs',
    label: 'Fournisseurs à risque',
    value: '2',
    unit: '',
    sub: 'Score < 80%',
    trend: 'warn',
    icon: Users,
    colSpan: 'col-span-1',
    hero: false,
    bg: 'bg-white border-zinc-200',
    iconBg: 'bg-zinc-100',
    iconColor: 'text-zinc-600',
    valueColor: 'text-zinc-800',
    subColor: 'text-zinc-500',
  },
  {
    id: 'kpi-ca',
    label: 'CA journée',
    value: '12 840',
    unit: '€',
    sub: '6 factures émises',
    trend: 'up',
    icon: TrendingUp,
    colSpan: 'col-span-1',
    hero: false,
    bg: 'bg-white border-zinc-200',
    iconBg: 'bg-zinc-100',
    iconColor: 'text-zinc-600',
    valueColor: 'text-zinc-800',
    subColor: 'text-zinc-500',
  },
  {
    id: 'kpi-delai',
    label: 'Délai rés. moyen',
    value: '4.2',
    unit: 'h',
    sub: '-0.8h vs semaine',
    trend: 'up',
    icon: Clock,
    colSpan: 'col-span-1',
    hero: false,
    bg: 'bg-white border-zinc-200',
    iconBg: 'bg-zinc-100',
    iconColor: 'text-zinc-600',
    valueColor: 'text-zinc-800',
    subColor: 'text-zinc-500',
  },
];

export default function DashboardKPIs() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
      {kpis?.map((kpi) => {
        const Icon = kpi?.icon;
        return (
          <div
            key={kpi?.id}
            className={`metric-card border ${kpi?.bg} ${kpi?.colSpan} ${kpi?.hero ? 'py-6' : ''}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${kpi?.iconBg}`}>
                <Icon size={kpi?.hero ? 22 : 18} className={kpi?.iconColor} />
              </div>
              {kpi?.trend === 'bad' && (
                <span className="text-[10px] font-bold text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">⚠ NOK</span>
              )}
              {kpi?.trend === 'warn' && (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">⚡ Attention</span>
              )}
              {kpi?.trend === 'up' && (
                <span className="text-[10px] font-semibold text-emerald-600">↑ OK</span>
              )}
            </div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">{kpi?.label}</p>
            <p className={`font-tabular font-bold ${kpi?.hero ? 'text-4xl' : 'text-2xl'} ${kpi?.valueColor}`}>
              {kpi?.value}<span className={`${kpi?.hero ? 'text-2xl' : 'text-base'} ml-1 font-medium`}>{kpi?.unit}</span>
            </p>
            <p className={`text-xs mt-1 ${kpi?.subColor}`}>{kpi?.sub}</p>
          </div>
        );
      })}
    </div>
  );
}