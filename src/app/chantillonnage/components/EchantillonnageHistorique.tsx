'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { FlaskConical, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Printer, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Echantillon {
  id: string;
  reference: string;
  produit: string;
  reference_produit: string;
  numero_lot: string;
  date_prelevement: string;
  heure_livraison: string;
  temperature_prelevement: number;
  client: string | null;
  type_echantillon: string;
  quantite_prelevee: number;
  unite_prelevement: string;
  point_prelevement: string;
  operateur: string;
  destinataire: string;
  objet_analyse: string[];
  conditions_transport: string | null;
  observations: string | null;
  statut: 'conforme' | 'non_conforme' | 'en_attente';
  created_at: string;
}

const statutConfig = {
  conforme: { label: 'Conforme', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  non_conforme: { label: 'Non conforme', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  en_attente: { label: 'En attente', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
};

const typeLabels: Record<string, string> = {
  matiere_premiere: 'Matière première',
  en_cours: 'En cours',
  produit_fini: 'Produit fini',
  eau_process: 'Eau de process',
  surface: 'Surface',
  emballage: 'Emballage',
};

function printEchantillon(ech: Echantillon) {
  const dateFormatted = new Date(ech.date_prelevement).toLocaleDateString('fr-FR');
  const heureFormatted = ech.heure_livraison?.slice(0, 5) ?? '';
  const typeLabel = typeLabels[ech.type_echantillon] ?? ech.type_echantillon;
  const tempClass = ech.temperature_prelevement > 4 ? 'color:red;font-weight:bold' : 'color:inherit';

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Fiche Échantillon — ${ech.reference}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #111; }
    h1 { font-size: 16px; margin-bottom: 4px; }
    .subtitle { color: #555; font-size: 11px; margin-bottom: 16px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; border: 1px solid; }
    .conforme { background: #ecfdf5; border-color: #6ee7b7; color: #065f46; }
    .non_conforme { background: #fef2f2; border-color: #fca5a5; color: #991b1b; }
    .en_attente { background: #fffbeb; border-color: #fcd34d; color: #92400e; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    th { background: #f4f4f5; text-align: left; padding: 6px 8px; font-size: 11px; color: #555; border: 1px solid #e4e4e7; }
    td { padding: 6px 8px; border: 1px solid #e4e4e7; vertical-align: top; }
    .section-title { font-weight: bold; font-size: 12px; margin: 14px 0 6px; border-bottom: 1px solid #e4e4e7; padding-bottom: 4px; }
    .tag { display: inline-block; background: #f0fdfa; border: 1px solid #99f6e4; color: #0f766e; border-radius: 10px; padding: 1px 8px; font-size: 10px; margin: 2px; }
    .footer { margin-top: 24px; font-size: 10px; color: #888; border-top: 1px solid #e4e4e7; padding-top: 8px; }
    @media print { body { margin: 10px; } }
  </style>
</head>
<body>
  <h1>Fiche d'Échantillonnage — ${ech.reference}</h1>
  <div class="subtitle">ISO 22000 — Traçabilité qualité — Imprimé le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
  <span class="badge ${ech.statut}">${statutConfig[ech.statut]?.label ?? ech.statut}</span>

  <div class="section-title">Identification du prélèvement</div>
  <table>
    <tr><th>Produit</th><td>${ech.produit}</td><th>Référence</th><td>${ech.reference_produit}</td></tr>
    <tr><th>N° de lot</th><td>${ech.numero_lot}</td><th>Type</th><td>${typeLabel}</td></tr>
    <tr><th>Point de prélèvement</th><td colspan="3">${ech.point_prelevement}</td></tr>
  </table>

  <div class="section-title">Conditions de prélèvement</div>
  <table>
    <tr><th>Date</th><td>${dateFormatted}</td><th>Heure</th><td>${heureFormatted}</td></tr>
    <tr><th>Température</th><td style="${tempClass}">${ech.temperature_prelevement}°C${ech.temperature_prelevement > 4 ? ' ⚠ NON CONFORME' : ''}</td><th>Transport</th><td>${ech.conditions_transport ?? '—'}</td></tr>
    <tr><th>Quantité</th><td>${ech.quantite_prelevee} ${ech.unite_prelevement}</td><th>Opérateur</th><td>${ech.operateur}</td></tr>
  </table>

  <div class="section-title">Destination &amp; analyses</div>
  <table>
    <tr><th>Client</th><td>${ech.client ?? 'Interne'}</td><th>Destinataire</th><td>${ech.destinataire}</td></tr>
  </table>
  <div><strong>Objectifs d'analyse :</strong><br/>${ech.objet_analyse.map((a) => `<span class="tag">${a}</span>`).join('')}</div>

  ${ech.observations ? `<div class="section-title">Observations</div><p>${ech.observations}</p>` : ''}

  <div class="footer">
    Référence : ${ech.reference} — Enregistré le ${new Date(ech.created_at).toLocaleDateString('fr-FR')}
  </div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }
}

interface EchantillonnageHistoriqueProps {
  refreshKey?: number;
}

export default function EchantillonnageHistorique({ refreshKey }: EchantillonnageHistoriqueProps) {
  const [echantillons, setEchantillons] = useState<Echantillon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchEchantillons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('echantillonnage')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;
      setEchantillons((data as Echantillon[]) ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEchantillons();
  }, [fetchEchantillons, refreshKey]);

  const stats = {
    total: echantillons.length,
    conformes: echantillons.filter((e) => e.statut === 'conforme').length,
    nonConformes: echantillons.filter((e) => e.statut === 'non_conforme').length,
    enAttente: echantillons.filter((e) => e.statut === 'en_attente').length,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card-section p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{stats.conformes}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Conformes</p>
        </div>
        <div className="card-section p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.nonConformes}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Non conformes</p>
        </div>
        <div className="card-section p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.enAttente}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">En attente</p>
        </div>
      </div>

      {/* Liste */}
      <div className="card-section">
        <div className="section-header">
          <div className="flex items-center gap-2">
            <FlaskConical size={15} className="text-teal-700" />
            <h2 className="text-sm font-semibold text-zinc-800">Historique des prélèvements</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">{stats.total} échantillons</span>
            <button
              type="button"
              onClick={fetchEchantillons}
              className="p-1 rounded hover:bg-zinc-100 transition-colors"
              title="Actualiser"
            >
              <RefreshCw size={13} className="text-zinc-400" />
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-10 text-xs text-zinc-400">
            <RefreshCw size={14} className="animate-spin mr-2" /> Chargement...
          </div>
        )}

        {error && (
          <div className="mx-5 my-3 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && echantillons.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-xs text-zinc-400">
            <FlaskConical size={24} className="mb-2 opacity-30" />
            Aucun échantillon enregistré
          </div>
        )}

        {!loading && !error && echantillons.length > 0 && (
          <div className="divide-y divide-zinc-100">
            {echantillons.map((ech) => {
              const cfg = statutConfig[ech.statut] ?? statutConfig.en_attente;
              const StatusIcon = cfg.icon;
              const isOpen = expanded === ech.id;
              const dateFormatted = new Date(ech.date_prelevement).toLocaleDateString('fr-FR');
              const heureFormatted = ech.heure_livraison?.slice(0, 5) ?? '';

              return (
                <div key={ech.id}>
                  <div className="w-full flex items-start gap-3 px-5 py-3.5 hover:bg-zinc-50 transition-colors">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : ech.id)}
                      className="flex-1 flex items-start gap-3 text-left"
                    >
                      <div className={`mt-0.5 p-1.5 rounded-lg border ${cfg.bg}`}>
                        <StatusIcon size={13} className={cfg.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-zinc-800 font-mono">{ech.reference}</p>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-600 truncate mt-0.5">{ech.produit}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-zinc-400">{dateFormatted} {heureFormatted}</span>
                          <span className="text-[10px] text-zinc-400">T° {ech.temperature_prelevement}°C</span>
                          <span className="text-[10px] text-zinc-400 truncate">{ech.client ?? 'Interne'}</span>
                        </div>
                      </div>
                      {isOpen ? <ChevronUp size={14} className="text-zinc-400 shrink-0 mt-1" /> : <ChevronDown size={14} className="text-zinc-400 shrink-0 mt-1" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => printEchantillon(ech)}
                      className="shrink-0 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors text-zinc-400 hover:text-zinc-700"
                      title="Imprimer"
                    >
                      <Printer size={13} />
                    </button>
                  </div>

                  {isOpen && (
                    <div className="px-5 pb-4 bg-zinc-50/60 border-t border-zinc-100">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-xs">
                        <div>
                          <span className="text-zinc-400">Lot :</span>
                          <span className="ml-1 font-mono text-zinc-700">{ech.numero_lot}</span>
                        </div>
                        <div>
                          <span className="text-zinc-400">Destinataire :</span>
                          <span className="ml-1 text-zinc-700">{ech.destinataire}</span>
                        </div>
                        <div>
                          <span className="text-zinc-400">Opérateur :</span>
                          <span className="ml-1 text-zinc-700">{ech.operateur}</span>
                        </div>
                        <div>
                          <span className="text-zinc-400">Quantité :</span>
                          <span className="ml-1 text-zinc-700">{ech.quantite_prelevee} {ech.unite_prelevement}</span>
                        </div>
                        {ech.observations && (
                          <div className="col-span-2">
                            <span className="text-zinc-400">Observations :</span>
                            <span className="ml-1 text-zinc-700">{ech.observations}</span>
                          </div>
                        )}
                        <div className="col-span-2">
                          <span className="text-zinc-400">Analyses :</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {ech.objet_analyse.map((a) => (
                              <span key={`tag-${a}`} className="px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[10px] text-teal-700 font-medium">
                                {a}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="col-span-2 mt-1">
                          <button
                            type="button"
                            onClick={() => printEchantillon(ech)}
                            className="flex items-center gap-1.5 text-[10px] text-teal-600 hover:text-teal-800 font-medium transition-colors"
                          >
                            <Printer size={11} /> Imprimer cette fiche
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
