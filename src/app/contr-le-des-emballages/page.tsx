import React from 'react';
import AppLayout from '@/components/AppLayout';
import EmballageForm from './components/EmballageForm';
import EmballageHistorique from './components/EmballageHistorique';
import EmballageScoreChart from './components/EmballageScoreChart';

export default function EmballagesPage() {
  return (
    <AppLayout>
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 py-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Contrôle des Emballages</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Contrôle intégrité et conformité emballages — Seuil acceptation: 80%</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700">
              1 fournisseur sous seuil (72%)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 2xl:grid-cols-5 gap-6">
          <div className="xl:col-span-3">
            <EmballageForm />
          </div>
          <div className="xl:col-span-2 space-y-6">
            <EmballageScoreChart />
            <EmballageHistorique />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}