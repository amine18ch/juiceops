import React from 'react';
import AppLayout from '@/components/AppLayout';
import FacturationStats from './components/FacturationStats';
import FacturationForm from './components/FacturationForm';
import FacturationTable from './components/FacturationTable';

export default function FacturationPage() {
  return (
    <AppLayout>
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 py-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Facturation &amp; Ventes</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Suivi commercial — Factures, paiements et statistiques CA — Avril 2026</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
              CA en cours de calcul
            </span>
          </div>
        </div>

        <FacturationStats />

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-2">
            <FacturationForm />
          </div>
          <div className="xl:col-span-3">
            <FacturationTable />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
