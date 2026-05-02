'use client';
import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import EchantillonnageForm from './components/EchantillonnageForm';
import EchantillonnageHistorique from './components/EchantillonnageHistorique';

export default function EchantillonnagePage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <AppLayout>
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 py-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Échantillonnage</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Traçabilité qualité — Prélèvements et suivi production — 16/04/2026</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-xs font-semibold text-teal-700">
              ISO 22000 — Traçabilité active
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-3">
            <EchantillonnageForm onSaved={() => setRefreshKey((k) => k + 1)} />
          </div>
          <div className="xl:col-span-2">
            <EchantillonnageHistorique refreshKey={refreshKey} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
