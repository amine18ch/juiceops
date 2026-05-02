import React from 'react';
import { AlertTriangle, Thermometer, Package, ClipboardX, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';


const alerts = [
  {
    id: 'alert-001',
    type: 'temperature',
    severity: 'critique',
    message: 'Chambre froide 2 — 6.1°C (seuil max: 4°C)',
    time: '09:12',
    link: '/temp-ratures-de-stockage',
    icon: Thermometer,
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
  },
  {
    id: 'alert-002',
    type: 'temperature',
    severity: 'alerte',
    message: 'Zone production A — 18.2°C (seuil max: 15°C)',
    time: '09:05',
    link: '/temp-ratures-de-stockage',
    icon: Thermometer,
    color: 'text-orange-600',
    bg: 'bg-orange-50 border-orange-200',
  },
  {
    id: 'alert-003',
    type: 'reception',
    severity: 'majeur',
    message: 'Lot L-2026-041 refusé — Agrumes Bio SARL (DLC < 48h)',
    time: '08:47',
    link: '/r-ception-des-produits',
    icon: Package,
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
  },
  {
    id: 'alert-004',
    type: 'hygiene',
    severity: 'majeur',
    message: 'Checklist hygiène — 3 items NOK non corrigés (Zone production)',
    time: '08:30',
    link: '/hygi-ne-check-list',
    icon: ClipboardX,
    color: 'text-orange-600',
    bg: 'bg-orange-50 border-orange-200',
  },
  {
    id: 'alert-005',
    type: 'anomalie',
    severity: 'mineur',
    message: 'Anomalie ANO-2026-089 sans responsable assigné',
    time: '07:55',
    link: '/gestion-des-anomalies',
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
  },
  {
    id: 'alert-006',
    type: 'emballage',
    severity: 'mineur',
    message: 'Contrôle emballage — Score fournisseur PackSud: 72% (seuil: 80%)',
    time: '07:30',
    link: '/contr-le-des-emballages',
    icon: Package,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
  },
];

export default function DashboardAlertFeed() {
  return (
    <div className="card-section h-full flex flex-col">
      <div className="section-header shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-zinc-800">Alertes critiques</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Temps réel</p>
        </div>
        <span className="status-badge bg-red-100 text-red-700 border border-red-200">
          {alerts?.length} actives
        </span>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
        {alerts?.map((alert) => {
          const Icon = alert?.icon;
          return (
            <Link
              key={alert?.id}
              href={alert?.link}
              className={`flex items-start gap-3 px-4 py-3 border-l-4 ${alert?.bg} hover:brightness-95 transition-all duration-100 group`}
              style={{ borderLeftColor: alert?.severity === 'critique' ? '#ef4444' : alert?.severity === 'majeur' ? '#f97316' : '#eab308' }}
            >
              <Icon size={15} className={`${alert?.color} mt-0.5 shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-700 leading-snug">{alert?.message}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">{alert?.time}</p>
              </div>
              <ArrowRight size={12} className="text-zinc-300 group-hover:text-zinc-500 transition-colors mt-1 shrink-0" />
            </Link>
          );
        })}
      </div>
      <div className="px-4 py-3 border-t border-zinc-100 shrink-0">
        <Link href="/gestion-des-anomalies" className="text-xs font-medium text-teal-700 hover:text-teal-800 flex items-center gap-1">
          Voir toutes les anomalies <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}