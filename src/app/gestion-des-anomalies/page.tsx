import React from 'react';
import AppLayout from '@/components/AppLayout';
import AnomaliesStats from './components/AnomaliesStats';
import AnomaliesTable from './components/AnomaliesTable';

export default function AnomaliesPage() {
  return (
    <AppLayout>
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 py-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Gestion des Anomalies</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Traçabilité ISO 22000 — Toutes les anomalies actives et historique</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-xs font-semibold text-teal-700">
              ISO 22000 — Audit trail actif
            </span>
          </div>
        </div>

        <AnomaliesStats />
        <AnomaliesTable />
      </div>
    </AppLayout>
  );
}