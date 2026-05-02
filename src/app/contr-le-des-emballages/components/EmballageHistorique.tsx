'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import StatusBadge from '@/components/ui/StatusBadge';
import { RefreshCw, Printer } from 'lucide-react';

interface EmballageControle {
  id: string;
  date: string;
  fournisseur: string;
  reference: string;
  lot: string;
  score: number;
  statut: 'accepte' | 'refuse';
  controleur: string;
}

function printEmballage(h: EmballageControle) {
  const statutColor = h.statut === 'accepte' ? '#16a34a' : '#dc2626';
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Fiche Contrôle Emballage — ${h.lot}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 32px; }
    h1 { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
    .subtitle { color: #666; font-size: 11px; margin-bottom: 20px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 4px; font-weight: bold; font-size: 12px; color: #fff; background: ${statutColor}; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    td { padding: 8px 12px; border: 1px solid #e4e4e7; vertical-align: top; }
    .label { font-weight: 600; color: #444; width: 40%; background: #f4f4f5; }
    .score { font-size: 28px; font-weight: bold; color: ${statutColor}; }
    .footer { margin-top: 28px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>Fiche Contrôle Emballage — ${h.lot}</h1>
  <p class="subtitle">Imprimé le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
  <p class="score">${h.score}%</p>
  <span class="badge">${h.statut === 'accepte' ? 'CONFORME' : 'NON CONFORME'}</span>
  <table style="margin-top:16px;">
    <tr><td class="label">Fournisseur</td><td>${h.fournisseur}</td></tr>
    <tr><td class="label">Référence</td><td>${h.reference}</td></tr>
    <tr><td class="label">N° de lot</td><td>${h.lot}</td></tr>
    <tr><td class="label">Contrôleur</td><td>${h.controleur}</td></tr>
    <tr><td class="label">Date</td><td>${h.date}</td></tr>
    <tr><td class="label">Score global</td><td>${h.score}% (seuil: 80%)</td></tr>
  </table>
  <div class="footer">JuiceOps — Contrôle Emballages ISO 22000 | Document généré automatiquement</div>
</body>
</html>`;
  const win = window.open('', '_blank', 'width=800,height=600');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

export default function EmballageHistorique() {
  const [historique, setHistorique] = useState<EmballageControle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistorique = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('emballage_controles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);
    if (data) {
      setHistorique(data.map((h: any) => ({
        id: h.id,
        date: new Date(h.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
        fournisseur: h.fournisseur,
        reference: h.reference,
        lot: h.numero_lot,
        score: h.score_percent,
        statut: h.conforme ? 'accepte' : 'refuse',
        controleur: h.responsable || '—',
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchHistorique(); }, [fetchHistorique]);

  const conformes = historique.filter((h) => h.statut === 'accepte').length;
  const tauxConformite = historique.length > 0 ? Math.round((conformes / historique.length) * 100) : 0;

  return (
    <div className="card-section">
      <div className="section-header">
        <div>
          <h2 className="text-sm font-semibold text-zinc-800">Historique contrôles</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Taux conformité:{' '}
            <span className="font-semibold text-teal-700">
              {historique.length > 0 ? `${tauxConformite}%` : '—'}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">{historique.length} contrôles</span>
          <button
            onClick={fetchHistorique}
            className="p-1 rounded hover:bg-zinc-100 transition-colors"
            title="Actualiser"
          >
            <RefreshCw size={13} className={`text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-6 h-6 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
        </div>
      ) : historique.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-zinc-400">
          <p className="text-sm">Aucun contrôle enregistré</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">Date</th>
                <th className="table-th">Fournisseur</th>
                <th className="table-th">Lot</th>
                <th className="table-th">Score</th>
                <th className="table-th">Statut</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {historique.map((h) => (
                <tr key={h.id} className="table-row">
                  <td className="table-td text-xs font-tabular text-zinc-500">{h.date}</td>
                  <td className="table-td">
                    <p className="text-xs font-medium text-zinc-800 truncate max-w-[110px]">{h.fournisseur}</p>
                    <p className="text-[10px] text-zinc-400 font-mono">{h.reference}</p>
                  </td>
                  <td className="table-td">
                    <span className="font-mono text-xs text-teal-700">{h.lot}</span>
                  </td>
                  <td className="table-td">
                    <span className={`text-sm font-bold font-tabular ${h.score >= 80 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {h.score}%
                    </span>
                  </td>
                  <td className="table-td">
                    <StatusBadge status={h.statut} />
                  </td>
                  <td className="table-td">
                    <button
                      onClick={() => printEmballage(h)}
                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-[10px] font-semibold transition-colors"
                      title="Imprimer la fiche"
                    >
                      <Printer size={11} />
                      Imprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}