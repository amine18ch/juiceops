'use client';
import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import ReceptionForm, { type ReceptionEntry, type AnomalieEntry } from './components/ReceptionForm';
import ReceptionHistorique from './components/ReceptionHistorique';
import { ShieldAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ReceptionPage() {
  const [receptions, setReceptions] = useState<ReceptionEntry[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalieEntry[]>([]);
  const [loadingReceptions, setLoadingReceptions] = useState(true);

  useEffect(() => {
    const fetchReceptions = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('receptions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) {
        setReceptions(data.map((r: any) => ({
          id: r.id,
          heure: new Date(r.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          lot: r.lot,
          produit: r.produit,
          fournisseur: r.fournisseur,
          quantite: `${r.quantite} ${r.unite || 'kg'}`,
          statut: r.statut as ReceptionEntry['statut'],
          operateur: r.operateur,
          alerte: r.alerte || null,
          temperature: r.temperature_reception,
          dlc: r.dlc,
          anomalieId: r.anomalie_id || undefined,
        })));
      }
      setLoadingReceptions(false);
    };
    fetchReceptions();
  }, []);

  const handleNewReception = (entry: ReceptionEntry) => {
    setReceptions((prev) => [entry, ...prev]);
  };

  const handleNewAnomalie = (anomalie: AnomalieEntry) => {
    setAnomalies((prev) => [anomalie, ...prev]);
  };

  const pendingCount = receptions.filter((r) => r.statut === 'en_attente').length;
  const openAnomalies = anomalies.filter((a) => a.statut === 'ouverte').length;

  return (
    <AppLayout>
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 py-6 space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Réception des Produits</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Saisie réception matières premières</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700">
                {pendingCount} lot{pendingCount > 1 ? 's' : ''} en attente de contrôle
              </span>
            )}
            {openAnomalies > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                <ShieldAlert size={13} />
                {openAnomalies} anomalie{openAnomalies > 1 ? 's' : ''} ouverte{openAnomalies > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Anomalies panel (shown when anomalies exist) */}
        {anomalies.length > 0 && (
          <div className="card-section border-red-200 bg-red-50/50">
            <div className="section-header border-red-100">
              <div className="flex items-center gap-2">
                <ShieldAlert size={15} className="text-red-600" />
                <h2 className="text-sm font-semibold text-red-800">Anomalies créées automatiquement cette session</h2>
              </div>
              <span className="text-xs text-red-500 font-medium">{anomalies.length} anomalie(s)</span>
            </div>
            <div className="divide-y divide-red-100">
              {anomalies.map((a) => (
                <div key={a.id} className="px-4 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs font-bold text-red-700">{a.id}</span>
                      <span className="text-[10px] bg-red-100 text-red-600 border border-red-200 px-1.5 py-0.5 rounded font-medium">{a.type}</span>
                    </div>
                    <p className="text-xs text-zinc-700 truncate">{a.description}</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">{a.fournisseur} — {a.produit} — Lot: {a.lot}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold">OUVERTE</span>
                    <p className="text-[10px] text-zinc-400 mt-0.5">{a.createdAt}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-5 2xl:grid-cols-5 gap-6">
          <div className="xl:col-span-3 2xl:col-span-3">
            <ReceptionForm
              onNewReception={handleNewReception}
              onNewAnomalie={handleNewAnomalie}
            />
          </div>
          <div className="xl:col-span-2 2xl:col-span-2">
            <ReceptionHistorique entries={receptions} loading={loadingReceptions} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}