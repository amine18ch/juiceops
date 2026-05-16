'use client';
import React, { useEffect, useState } from 'react';
import { TrendingUp, Receipt, Clock, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Icon from '@/components/ui/AppIcon';


interface FactureStats {
  caTotal: number;
  totalFactures: number;
  enAttente: number;
  montantImpaye: number;
  enRetard: number;
}

export default function FacturationStats() {
  const [stats, setStats] = useState<FactureStats>({
    caTotal: 0,
    totalFactures: 0,
    enAttente: 0,
    montantImpaye: 0,
    enRetard: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient();
      const { data } = await supabase.from('factures').select('montant_ttc, statut_paiement');
      if (data) {
        const caTotal = data.reduce((sum: number, f: any) => sum + (parseFloat(f.montant_ttc) || 0), 0);
        const totalFactures = data.length;
        const enAttenteRows = data.filter((f: any) => f.statut_paiement === 'en_attente');
        const enRetard = data.filter((f: any) => f.statut_paiement === 'retard').length;
        const montantImpaye = [...enAttenteRows, ...data.filter((f: any) => f.statut_paiement === 'retard')]
          .reduce((sum: number, f: any) => sum + (parseFloat(f.montant_ttc) || 0), 0);
        setStats({
          caTotal,
          totalFactures,
          enAttente: enAttenteRows.length,
          montantImpaye,
          enRetard,
        });
      }
      setLoading(false);
    };
    fetchStats();
  }, []);

  const items = [
    {
      label: 'CA total',
      value: loading ? '…' : `${stats.caTotal.toLocaleString('fr-TN', { maximumFractionDigits: 0 })} TND`,
      sub: `${stats.totalFactures} factures émises`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
    },
    {
      label: 'Factures émises',
      value: loading ? '…' : String(stats.totalFactures),
      sub: 'Total enregistrées',
      icon: Receipt,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      border: 'border-teal-200',
    },
    {
      label: 'En attente paiement',
      value: loading ? '…' : `${stats.enAttente} factures`,
      sub: loading ? '…' : `${stats.montantImpaye.toLocaleString('fr-TN', { maximumFractionDigits: 0 })} TND impayés`,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
    },
    {
      label: 'Factures en retard',
      value: loading ? '…' : String(stats.enRetard),
      sub: stats.enRetard > 0 ? 'Relance recommandée' : 'Aucun retard',
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {items.map((s) => {
        const Icon = s.icon;
        return (
          <div key={`fac-stat-${s.label}`} className={`card-section p-4 border ${s.border}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-zinc-500 font-medium">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">{s.sub}</p>
              </div>
              <div className={`p-2 rounded-lg ${s.bg}`}>
                <Icon size={18} className={s.color} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
