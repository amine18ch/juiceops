import React from 'react';
import AppLayout from '@/components/AppLayout';
import TemperatureZoneCards from './components/TemperatureZoneCards';
import TemperatureChart from './components/TemperatureChart';
import TemperatureRelevesTable from './components/TemperatureRelevesTable';

export default function TemperaturesPage() {
  return (
    <AppLayout>
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 py-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Températures de Stockage</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Surveillance HACCP temps réel — Dernière mise à jour: 09:28</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-300 text-xs font-bold text-red-700">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              2 zones hors seuil
            </span>
          </div>
        </div>

        <TemperatureZoneCards />

        <div className="grid grid-cols-1 xl:grid-cols-3 2xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <TemperatureChart />
          </div>
          <div className="xl:col-span-1">
            <TemperatureRelevesTable />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}