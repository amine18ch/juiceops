'use client';
import React, { useState } from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import { ShieldAlert, Thermometer, Calendar, Eye, Printer, X } from 'lucide-react';
import type { ReceptionEntry } from './ReceptionForm';

interface ReceptionHistoriqueProps {
  entries?: ReceptionEntry[];
  loading?: boolean;
}

const statutLabel: Record<string, string> = {
  accepte: 'Accepté',
  refuse: 'Refusé',
  en_attente: 'En attente',
};

function printReception(item: ReceptionEntry) {
  const statutColor = item.statut === 'accepte' ? '#16a34a' : item.statut === 'refuse' ? '#dc2626' : '#d97706';
  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <title>Fiche Réception — ${item.lot}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 32px; }
        h1 { font-size: 20px; font-weight: bold; margin-bottom: 4px; }
        .subtitle { color: #666; font-size: 12px; margin-bottom: 24px; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 4px; font-weight: bold; font-size: 12px; color: #fff; background: ${statutColor}; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { background: #f4f4f5; text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; color: #555; border: 1px solid #e4e4e7; }
        td { padding: 8px 12px; border: 1px solid #e4e4e7; vertical-align: top; }
        .label { font-weight: 600; color: #444; width: 40%; }
        .section-title { font-size: 13px; font-weight: bold; margin: 20px 0 8px; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
        .alert-box { margin-top: 16px; padding: 10px 14px; border-radius: 6px; background: #fef2f2; border: 1px solid #fca5a5; color: #991b1b; font-size: 12px; }
        .footer { margin-top: 32px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
        @media print { body { padding: 16px; } }
      </style>
    </head>
    <body>
      <h1>Fiche de Réception — ${item.lot}</h1>
      <p class="subtitle">Imprimé le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
      <div class="section-title">Décision</div>
      <span class="badge">${statutLabel[item.statut] ?? item.statut}</span>
      <div class="section-title">Identification du lot</div>
      <table>
        <tr><td class="label">Numéro de lot</td><td>${item.lot}</td></tr>
        <tr><td class="label">Produit</td><td>${item.produit}</td></tr>
        <tr><td class="label">Fournisseur</td><td>${item.fournisseur}</td></tr>
        <tr><td class="label">Quantité</td><td>${item.quantite}</td></tr>
        <tr><td class="label">Heure de réception</td><td>${item.heure}</td></tr>
        <tr><td class="label">Opérateur</td><td>${item.operateur}</td></tr>
      </table>
      <div class="section-title">Contrôle qualité</div>
      <table>
        <tr><td class="label">Température à réception</td><td>${item.temperature}°C</td></tr>
        <tr><td class="label">Date Limite de Consommation</td><td>${item.dlc}</td></tr>
      </table>
      ${item.alerte ? `<div class="alert-box">⚠ Alerte : ${item.alerte}</div>` : ''}
      ${item.anomalieId ? `<div class="alert-box" style="margin-top:8px;">🚨 Anomalie créée : ${item.anomalieId}</div>` : ''}
      <div class="footer">JuiceOps — Système de gestion qualité &nbsp;|&nbsp; Document généré automatiquement</div>
    </body>
    </html>
  `;
  const win = window.open('', '_blank', 'width=800,height=700');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}

function ReceptionDetailModal({ item, onClose }: { item: ReceptionEntry; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between p-5 border-b border-zinc-100">
          <div>
            <p className="font-mono text-sm font-bold text-teal-700">{item.lot}</p>
            <h2 className="text-lg font-bold text-zinc-900 mt-0.5">{item.produit}</h2>
            <p className="text-xs text-zinc-400">{item.fournisseur}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => printReception(item)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-xs font-medium text-zinc-700 transition-colors"
            >
              <Printer size={13} />
              Imprimer
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="px-5 pt-4">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold ${
            item.statut === 'accepte' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
            item.statut === 'refuse'? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            {item.statut === 'accepte' ? '✓' : item.statut === 'refuse' ? '✗' : '⏳'} {statutLabel[item.statut]}
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Identification</p>
            <div className="bg-zinc-50 rounded-xl divide-y divide-zinc-100">
              {[
                { label: 'Numéro de lot', value: item.lot },
                { label: 'Produit', value: item.produit },
                { label: 'Fournisseur', value: item.fournisseur },
                { label: 'Quantité', value: item.quantite },
                { label: 'Heure de réception', value: item.heure },
                { label: 'Opérateur', value: item.operateur },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-xs text-zinc-500">{label}</span>
                  <span className="text-xs font-semibold text-zinc-800">{value}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Contrôle qualité</p>
            <div className="bg-zinc-50 rounded-xl divide-y divide-zinc-100">
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="flex items-center gap-1.5 text-xs text-zinc-500"><Thermometer size={12} /> Température</span>
                <span className={`text-xs font-bold ${item.temperature > 6 ? 'text-red-600' : item.temperature > 4 ? 'text-amber-600' : 'text-emerald-700'}`}>
                  {item.temperature}°C
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="flex items-center gap-1.5 text-xs text-zinc-500"><Calendar size={12} /> DLC</span>
                <span className="text-xs font-semibold text-zinc-800">{item.dlc}</span>
              </div>
            </div>
          </div>
          {(item.alerte || item.anomalieId) && (
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Alertes & Anomalies</p>
              <div className="space-y-2">
                {item.alerte && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 font-medium">
                    <ShieldAlert size={13} className="shrink-0" />
                    {item.alerte}
                  </div>
                )}
                {item.anomalieId && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                    <ShieldAlert size={13} className="shrink-0" />
                    Anomalie créée : <span className="font-mono font-bold">{item.anomalieId}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReceptionHistorique({ entries, loading }: ReceptionHistoriqueProps) {
  const historique = entries ?? [];
  const [selectedEntry, setSelectedEntry] = useState<ReceptionEntry | null>(null);

  const stats = {
    total: historique.length,
    acceptes: historique.filter((h) => h.statut === 'accepte').length,
    refuses: historique.filter((h) => h.statut === 'refuse').length,
    enAttente: historique.filter((h) => h.statut === 'en_attente').length,
  };

  const conformite = stats.total > 0 ? Math.round((stats.acceptes / stats.total) * 100) : 0;

  return (
    <>
      {selectedEntry && (
        <ReceptionDetailModal item={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}

      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="metric-card border-zinc-200 text-center">
            <p className={`text-2xl font-bold font-tabular ${conformite >= 80 ? 'text-teal-700' : conformite >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
              {stats.total > 0 ? `${conformite}%` : '—'}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">Conformité</p>
          </div>
          <div className="metric-card border-zinc-200 text-center">
            <p className="text-2xl font-bold font-tabular text-zinc-800">{stats.total}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Lots reçus</p>
          </div>
          <div className="metric-card border-emerald-200 bg-emerald-50 text-center">
            <p className="text-xl font-bold font-tabular text-emerald-700">{stats.acceptes}</p>
            <p className="text-xs text-emerald-600 mt-0.5">Acceptés</p>
          </div>
          <div className="metric-card border-red-200 bg-red-50 text-center">
            <p className="text-xl font-bold font-tabular text-red-700">{stats.refuses + stats.enAttente}</p>
            <p className="text-xs text-red-500 mt-0.5">Refusés / Attente</p>
          </div>
        </div>

        {stats.refuses > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            <ShieldAlert size={14} className="shrink-0" />
            <span>{stats.refuses} anomalie(s) créée(s) automatiquement</span>
          </div>
        )}

        {/* Table */}
        <div className="card-section">
          <div className="section-header">
            <h2 className="text-sm font-semibold text-zinc-800">Historique des réceptions</h2>
            <span className="text-xs text-zinc-400">{historique.length} entrées</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
            </div>
          ) : historique.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-zinc-400">
              <p className="text-sm">Aucune réception enregistrée</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[520px]">
              {historique.map((item) => (
                <div key={item.id} className={`px-4 py-3 border-b border-zinc-100 hover:bg-zinc-50 transition-colors ${item.statut === 'refuse' ? 'bg-red-50/40' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-teal-700">{item.lot}</span>
                        <StatusBadge status={item.statut} />
                        {item.alerte && (
                          <span className="text-[10px] bg-red-100 text-red-600 border border-red-200 px-1.5 py-0.5 rounded font-medium">
                            {item.alerte}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-zinc-800 truncate">{item.produit}</p>
                      <p className="text-xs text-zinc-400">{item.fournisseur} — {item.quantite}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                          <Thermometer size={10} />
                          {item.temperature}°C
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                          <Calendar size={10} />
                          DLC: {item.dlc}
                        </span>
                      </div>
                      {item.anomalieId && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded font-medium">
                          <ShieldAlert size={9} />
                          {item.anomalieId}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="text-right">
                        <p className="text-xs font-tabular text-zinc-500">{item.heure}</p>
                        <p className="text-[10px] text-zinc-400">{item.operateur}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedEntry(item)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-700 text-[10px] font-semibold transition-colors border border-teal-200"
                        >
                          <Eye size={11} />
                          Voir
                        </button>
                        <button
                          onClick={() => printReception(item)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-[10px] font-semibold transition-colors border border-zinc-200"
                        >
                          <Printer size={11} />
                          Imprimer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}