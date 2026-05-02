import React from 'react';
import AppLayout from '@/components/AppLayout';
import DashboardKPIs from './components/DashboardKPIs';
import DashboardCharts from './components/DashboardCharts';
import DashboardAlertFeed from './components/DashboardAlertFeed';
import DashboardRecentLots from './components/DashboardRecentLots';

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Tableau de bord</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Jeudi 16 avril 2026 — Poste du matin</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-xs font-semibold text-teal-700">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              ISO 22000 — Actif
            </span>
            <span className="text-xs text-zinc-400">Mis à jour à 09:28</span>
          </div>
        </div>

        {/* KPI Bento Grid */}
        <DashboardKPIs />

        {/* Charts + Alert Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <DashboardCharts />
          </div>
          <div className="lg:col-span-1">
            <DashboardAlertFeed />
          </div>
        </div>

        {/* Recent Lots */}
        <DashboardRecentLots />
      </div>
    </AppLayout>
  );
}