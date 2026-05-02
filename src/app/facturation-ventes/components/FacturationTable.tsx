'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Search, Filter, CheckCircle, Clock, AlertCircle, XCircle, X, Printer, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type StatutPaiement = 'en_attente' | 'paye' | 'retard' | 'annule';

interface Facture {
  id: string;
  numero: string;
  client: string;
  produit: string;
  dateFacture: string;
  dateEcheance: string;
  montantHT: number;
  montantTTC: number;
  statut: StatutPaiement;
  modePaiement: string;
  notes: string;
}

const statutConfig: Record<StatutPaiement, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  en_attente: { label: 'En attente', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  paye: { label: 'Payé', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  retard: { label: 'En retard', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  annule: { label: 'Annulé', icon: XCircle, color: 'text-zinc-500', bg: 'bg-zinc-100 border-zinc-200' },
};

function printFacture(f: Facture) {
  const statutColor = f.statut === 'paye' ? '#16a34a' : f.statut === 'retard' ? '#dc2626' : f.statut === 'annule' ? '#71717a' : '#d97706';
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Facture ${f.numero}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 32px; }
    h1 { font-size: 22px; font-weight: bold; margin-bottom: 4px; }
    .subtitle { color: #666; font-size: 11px; margin-bottom: 20px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 4px; font-weight: bold; font-size: 12px; color: #fff; background: ${statutColor}; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    td { padding: 8px 12px; border: 1px solid #e4e4e7; vertical-align: top; }
    .label { font-weight: 600; color: #444; width: 40%; background: #f4f4f5; }
    .total { font-size: 20px; font-weight: bold; color: #0f766e; }
    .footer { margin-top: 28px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>Facture ${f.numero}</h1>
  <p class="subtitle">Imprimée le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
  <span class="badge">${statutConfig[f.statut]?.label ?? f.statut}</span>
  <table style="margin-top:16px;">
    <tr><td class="label">Client</td><td>${f.client}</td></tr>
    <tr><td class="label">Produit / Prestation</td><td>${f.produit}</td></tr>
    <tr><td class="label">Date facture</td><td>${f.dateFacture}</td></tr>
    <tr><td class="label">Date échéance</td><td>${f.dateEcheance}</td></tr>
    <tr><td class="label">Mode de paiement</td><td>${f.modePaiement}</td></tr>
    <tr><td class="label">Montant HT</td><td>${f.montantHT.toFixed(2)} €</td></tr>
    <tr><td class="label">Montant TTC</td><td><span class="total">${f.montantTTC.toFixed(2)} €</span></td></tr>
    ${f.notes ? `<tr><td class="label">Notes</td><td>${f.notes}</td></tr>` : ''}
  </table>
  <div class="footer">JuiceOps — Facturation & Ventes | Document généré automatiquement</div>
</body>
</html>`;
  const win = window.open('', '_blank', 'width=800,height=700');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

export default function FacturationTable() {
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState<string>('tous');

  const fetchFactures = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('factures')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (!error && data) {
      setFactures(data.map((f: any) => ({
        id: f.id,
        numero: f.numero_facture,
        client: f.client_nom,
        produit: f.produit,
        dateFacture: f.date_facture ? new Date(f.date_facture).toLocaleDateString('fr-FR') : '—',
        dateEcheance: f.date_echeance ? new Date(f.date_echeance).toLocaleDateString('fr-FR') : '—',
        montantHT: parseFloat(f.montant_ht) || 0,
        montantTTC: parseFloat(f.montant_ttc) || 0,
        statut: f.statut_paiement as StatutPaiement,
        modePaiement: f.mode_paiement || '—',
        notes: f.notes || '',
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchFactures(); }, [fetchFactures]);

  const filtered = factures.filter((f) => {
    const matchSearch = search === '' ||
      f.numero.toLowerCase().includes(search.toLowerCase()) ||
      f.client.toLowerCase().includes(search.toLowerCase()) ||
      f.produit.toLowerCase().includes(search.toLowerCase());
    const matchStatut = filterStatut === 'tous' || f.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  const totalTTC = filtered.reduce((sum, f) => sum + f.montantTTC, 0);

  const markPaid = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('factures')
      .update({ statut_paiement: 'paye' })
      .eq('id', id);
    if (error) {
      toast.error(`Erreur: ${error.message}`);
      return;
    }
    setFactures((prev) => prev.map((f) => f.id === id ? { ...f, statut: 'paye' } : f));
    toast.success('Facture marquée comme payée');
  };

  return (
    <div className="card-section">
      {/* Toolbar */}
      <div className="section-header flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              className="form-input pl-8 py-1.5 text-xs"
              placeholder="N° facture, client, produit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                <X size={12} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Filter size={13} className="text-zinc-400" />
            <select
              className="form-select py-1.5 text-xs w-auto"
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
            >
              <option value="tous">Tous statuts</option>
              <option value="en_attente">En attente</option>
              <option value="paye">Payé</option>
              <option value="retard">En retard</option>
              <option value="annule">Annulé</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400">{filtered.length} facture(s)</span>
          <span className="text-xs font-semibold text-teal-700">Total : {totalTTC.toFixed(2)} €</span>
          <button onClick={fetchFactures} className="p-1 rounded hover:bg-zinc-100 transition-colors" title="Actualiser">
            <RefreshCw size={13} className={`text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">N° Facture</th>
                  <th className="table-th">Client</th>
                  <th className="table-th">Produit</th>
                  <th className="table-th">Date</th>
                  <th className="table-th">Échéance</th>
                  <th className="table-th text-right">Montant TTC</th>
                  <th className="table-th">Statut</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((f) => {
                  const cfg = statutConfig[f.statut] ?? statutConfig.en_attente;
                  const StatusIcon = cfg.icon;
                  return (
                    <tr key={f.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="table-td font-mono text-xs font-semibold text-zinc-800">{f.numero}</td>
                      <td className="table-td text-xs text-zinc-700 max-w-[140px] truncate">{f.client}</td>
                      <td className="table-td text-xs text-zinc-500 max-w-[160px] truncate">{f.produit}</td>
                      <td className="table-td text-xs text-zinc-500 whitespace-nowrap">{f.dateFacture}</td>
                      <td className="table-td text-xs whitespace-nowrap">
                        <span className={f.statut === 'retard' ? 'text-red-600 font-semibold' : 'text-zinc-500'}>
                          {f.dateEcheance}
                        </span>
                      </td>
                      <td className="table-td text-right">
                        <span className="text-sm font-bold font-tabular text-zinc-800">{f.montantTTC.toFixed(2)} €</span>
                      </td>
                      <td className="table-td">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-semibold ${cfg.bg} ${cfg.color}`}>
                          <StatusIcon size={10} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="table-td">
                        <div className="flex items-center gap-1">
                          <button
                            title="Imprimer"
                            onClick={() => printFacture(f)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                          >
                            <Printer size={13} />
                          </button>
                          {(f.statut === 'en_attente' || f.statut === 'retard') && (
                            <button
                              title="Marquer payé"
                              onClick={() => markPaid(f.id)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                              <CheckCircle size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="py-12 text-center text-zinc-400 text-sm">
              Aucune facture trouvée
            </div>
          )}
        </>
      )}
    </div>
  );
}
