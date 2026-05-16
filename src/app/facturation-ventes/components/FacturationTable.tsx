'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Search, Filter, CheckCircle, Clock, AlertCircle, XCircle,
  X, Printer, RefreshCw, Eye, CreditCard, Calendar, Link2,
  Receipt, TrendingDown, ChevronRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

type StatutPaiement = 'en_attente' | 'paye' | 'retard' | 'annule' | 'partiellement_payee';

interface Facture {
  id: string;
  numero: string;
  client: string;
  client_id: string;
  produit: string;
  lignes: any[];
  dateFacture: string;
  dateEcheance: string;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
  montantPaye: number;
  montantRestant: number;
  statut: StatutPaiement;
  modePaiement: string;
  notes: string;
  taux_tva: number;
  remise: number;
}

const STATUT: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  en_attente:          { label: 'En attente',          icon: Clock,        color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200' },
  partiellement_payee: { label: 'Partiellement payée', icon: TrendingDown, color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200' },
  paye:                { label: 'Soldée ✓',             icon: CheckCircle,  color: 'text-emerald-600',bg: 'bg-emerald-50 border-emerald-200' },
  retard:              { label: 'En retard',             icon: AlertCircle,  color: 'text-red-600',    bg: 'bg-red-50 border-red-200' },
  annule:              { label: 'Annulée',               icon: XCircle,      color: 'text-zinc-500',   bg: 'bg-zinc-100 border-zinc-200' },
};

const fmt = (n: number) => `${Number(n || 0).toFixed(3)} TND`;

function printFacture(f: Facture) {
  const lignesHtml = f.lignes?.length > 0
    ? f.lignes.map((l: any, i: number) => {
        const ht = (l.quantite||0) * (l.prix_unitaire_ht||0) * (1-(l.remise||0)/100);
        return `<tr style="border-bottom:1px solid #e4e4e7;">
          <td style="padding:8px 12px;">${i+1}</td>
          <td style="padding:8px 12px;">${l.produit||'—'}</td>
          <td style="padding:8px 12px;text-align:center;">${l.quantite}</td>
          <td style="padding:8px 12px;text-align:right;">${Number(l.prix_unitaire_ht||0).toFixed(3)}</td>
          <td style="padding:8px 12px;text-align:center;">${l.taux_tva||0}%</td>
          <td style="padding:8px 12px;text-align:center;">${l.remise||0}%</td>
          <td style="padding:8px 12px;text-align:right;font-weight:bold;">${ht.toFixed(3)}</td>
        </tr>`;
      }).join('')
    : `<tr><td colspan="7" style="padding:8px 12px;">${f.produit}</td></tr>`;

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
  <title>Facture ${f.numero}</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;padding:32px;}
    h1{font-size:22px;font-weight:bold;margin-bottom:4px;}
    .sub{color:#666;font-size:11px;margin-bottom:20px;}
    .badge{display:inline-block;padding:3px 10px;border-radius:4px;font-weight:bold;font-size:12px;color:#fff;background:${f.statut==='paye'?'#16a34a':f.statut==='retard'?'#dc2626':'#d97706'};}
    table{width:100%;border-collapse:collapse;margin-top:14px;}
    th{background:#f4f4f5;padding:8px 12px;text-align:left;font-size:11px;color:#555;border:1px solid #e4e4e7;}
    td{border:1px solid #e4e4e7;padding:8px 12px;font-size:12px;}
    .total{font-size:18px;font-weight:bold;color:#0f766e;}
    .footer{margin-top:28px;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:10px;}
    @media print{body{padding:16px;}}
  </style></head><body>
  <h1>Facture ${f.numero}</h1>
  <p class="sub">Imprimée le ${new Date().toLocaleDateString('fr-FR')}</p>
  <span class="badge">${STATUT[f.statut]?.label??f.statut}</span>
  <br/><br/>
  <table><tr><th>Info</th><th>Valeur</th></tr>
    <tr><td>Client</td><td>${f.client}</td></tr>
    <tr><td>Date facture</td><td>${f.dateFacture}</td></tr>
    <tr><td>Date échéance</td><td>${f.dateEcheance}</td></tr>
    <tr><td>Mode paiement</td><td>${f.modePaiement}</td></tr>
  </table>
  <br/>
  <table>
    <thead><tr><th>#</th><th>Produit</th><th>Qté</th><th>PU HT</th><th>TVA</th><th>Remise</th><th>Montant HT</th></tr></thead>
    <tbody>${lignesHtml}</tbody>
  </table>
  <br/>
  <table style="width:300px;margin-left:auto;">
    <tr><td>Montant HT</td><td style="text-align:right;">${fmt(f.montantHT)}</td></tr>
    <tr><td>TVA</td><td style="text-align:right;">${fmt(f.montantTVA)}</td></tr>
    <tr><td style="font-weight:bold;">Total TTC</td><td style="text-align:right;"><span class="total">${fmt(f.montantTTC)}</span></td></tr>
    ${f.montantPaye>0?`<tr><td style="color:#16a34a;">Déjà payé</td><td style="text-align:right;color:#16a34a;">${fmt(f.montantPaye)}</td></tr>`:''}
    ${f.montantRestant>0.001?`<tr><td style="color:#dc2626;font-weight:bold;">Restant à payer</td><td style="text-align:right;color:#dc2626;font-weight:bold;">${fmt(f.montantRestant)}</td></tr>`:''}
  </table>
  ${f.notes?`<p style="margin-top:16px;font-size:11px;color:#555;"><strong>Notes:</strong> ${f.notes}</p>`:''}
  <div class="footer">JuiceOps — Loi fiscale tunisienne | Document généré automatiquement</div>
  </body></html>`;

  const win = window.open('', '_blank', 'width=900,height=750');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function FactureDetailModal({ facture, onClose, onRefresh }: { facture: Facture; onClose: () => void; onRefresh: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [echeances, setEcheances]   = useState<any[]>([]);
  const [paiements, setPaiements]   = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [markingPaid, setMarkingPaid] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoadingDetail(true);
      const [eRes, pRes] = await Promise.all([
        supabase.from('echeances').select('*').eq('facture_id', facture.id).order('date_echeance'),
        supabase.from('paiements').select('*, paiement_factures!inner(facture_id,montant_affecte)')
          .eq('paiement_factures.facture_id', facture.id).eq('annule', false).order('date_paiement', { ascending: false }),
      ]);
      if (eRes.data) setEcheances(eRes.data);
      if (pRes.data) setPaiements(pRes.data);
      setLoadingDetail(false);
    };
    load();
  }, [facture.id, supabase]);

  const pctPaye = facture.montantTTC > 0 ? Math.min((facture.montantPaye / facture.montantTTC) * 100, 100) : 0;
  const cfg     = STATUT[facture.statut] ?? STATUT.en_attente;
  const StatusIcon = cfg.icon;

  const handleMarkPaid = async () => {
    setMarkingPaid(true);
    const { error } = await supabase.from('factures').update({ statut_paiement: 'paye', montant_paye: facture.montantTTC, montant_restant: 0 }).eq('id', facture.id);
    setMarkingPaid(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Facture marquée comme soldée');
    onRefresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
              <Receipt size={18} className="text-teal-600"/>
            </div>
            <div>
              <h2 className="font-bold text-zinc-900 font-mono">{facture.numero}</h2>
              <p className="text-xs text-zinc-500">{facture.client} · {facture.dateFacture}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
              <StatusIcon size={11}/> {cfg.label}
            </span>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400"><X size={16}/></button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Progress paiement */}
          <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-600">Progression du paiement</span>
              <span className="text-xs font-bold text-teal-700">{pctPaye.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-zinc-200 rounded-full h-3 mb-3">
              <div
                className={`h-3 rounded-full transition-all ${pctPaye>=100?'bg-emerald-500':pctPaye>0?'bg-teal-500':'bg-zinc-300'}`}
                style={{width:`${pctPaye}%`}}
              />
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><p className="text-[10px] text-zinc-500">Total TTC</p><p className="text-sm font-bold font-tabular text-zinc-800">{fmt(facture.montantTTC)}</p></div>
              <div><p className="text-[10px] text-zinc-500">Payé</p><p className="text-sm font-bold font-tabular text-emerald-700">{fmt(facture.montantPaye)}</p></div>
              <div><p className="text-[10px] text-zinc-500">Restant</p><p className={`text-sm font-bold font-tabular ${facture.montantRestant>0.001?'text-red-700':'text-emerald-600'}`}>{facture.montantRestant>0.001?fmt(facture.montantRestant):'Soldée ✓'}</p></div>
            </div>
          </div>

          {/* Lignes */}
          {facture.lignes?.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-zinc-700 mb-2 uppercase tracking-wide">Lignes de la facture</h3>
              <div className="rounded-xl border border-zinc-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-zinc-500">Produit</th>
                      <th className="text-right px-3 py-2 font-semibold text-zinc-500">Qté</th>
                      <th className="text-right px-3 py-2 font-semibold text-zinc-500">PU HT</th>
                      <th className="text-right px-3 py-2 font-semibold text-zinc-500">TVA</th>
                      <th className="text-right px-3 py-2 font-semibold text-zinc-500">Remise</th>
                      <th className="text-right px-3 py-2 font-semibold text-zinc-500">Montant HT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {facture.lignes.map((l: any, i: number) => {
                      const ht = (l.quantite||0) * (l.prix_unitaire_ht||0) * (1-(l.remise||0)/100);
                      return (
                        <tr key={i} className="hover:bg-zinc-50">
                          <td className="px-3 py-2 font-medium text-zinc-800">{l.produit||'—'}</td>
                          <td className="px-3 py-2 text-right font-tabular text-zinc-600">{l.quantite}</td>
                          <td className="px-3 py-2 text-right font-tabular text-zinc-600">{Number(l.prix_unitaire_ht||0).toFixed(3)}</td>
                          <td className="px-3 py-2 text-right text-zinc-500">{l.taux_tva||0}%</td>
                          <td className="px-3 py-2 text-right text-zinc-500">{l.remise||0}%</td>
                          <td className="px-3 py-2 text-right font-bold font-tabular text-zinc-800">{ht.toFixed(3)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Fiscal recap */}
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div className="bg-zinc-50 rounded-lg px-3 py-2 text-center"><p className="text-zinc-500">HT Net</p><p className="font-bold font-tabular">{fmt(facture.montantHT)}</p></div>
                <div className="bg-blue-50 rounded-lg px-3 py-2 text-center"><p className="text-blue-500">TVA</p><p className="font-bold font-tabular text-blue-700">{fmt(facture.montantTVA)}</p></div>
                <div className="bg-teal-50 rounded-lg px-3 py-2 text-center"><p className="text-teal-500">Total TTC</p><p className="font-bold font-tabular text-teal-700 text-sm">{fmt(facture.montantTTC)}</p></div>
              </div>
            </div>
          )}

          {/* Échéances */}
          {loadingDetail ? (
            <div className="flex items-center gap-2 text-zinc-400 text-sm"><div className="w-4 h-4 border-2 border-zinc-200 border-t-teal-500 rounded-full animate-spin"/> Chargement...</div>
          ) : (
            <>
              {echeances.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wide flex items-center gap-1.5"><Calendar size={13}/> Échéances</h3>
                    <Link href="/echeances" className="text-xs text-teal-600 hover:underline flex items-center gap-1">Gérer <ChevronRight size={11}/></Link>
                  </div>
                  <div className="space-y-1.5">
                    {echeances.map(e => {
                      const restant = parseFloat(e.montant||'0') - (parseFloat(e.montant_paye)||0);
                      return (
                        <div key={e.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-xs ${e.statut==='payee'?'bg-green-50 border-green-200':e.statut==='en_retard'?'bg-red-50 border-red-200':'bg-blue-50 border-blue-200'}`}>
                          <Calendar size={11} className="text-zinc-400 shrink-0"/>
                          <span className="font-semibold text-zinc-600 shrink-0">#{e.numero_echeance} · {e.date_echeance}</span>
                          <span className="font-bold font-tabular text-zinc-800">{fmt(e.montant)}</span>
                          {(parseFloat(e.montant_paye)||0)>0&&<span className="text-green-600">payé: {fmt(e.montant_paye)}</span>}
                          <span className={`ml-auto px-2 py-0.5 rounded-full font-semibold text-[10px] ${e.statut==='payee'?'bg-green-100 text-green-700':e.statut==='en_retard'?'bg-red-100 text-red-600':'bg-blue-100 text-blue-700'}`}>
                            {e.statut==='payee'?'Payée ✓':e.statut==='en_retard'?'Retard':e.statut==='partiellement_payee'?'Partiel':'À venir'}
                          </span>
                          {e.statut!=='payee'&&restant>0.001&&(
                            <span className="text-amber-700 font-tabular shrink-0">reste: {fmt(restant)}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Historique paiements */}
              {paiements.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wide flex items-center gap-1.5"><CreditCard size={13}/> Paiements reçus</h3>
                    <Link href="/paiements" className="text-xs text-teal-600 hover:underline flex items-center gap-1">Gérer <ChevronRight size={11}/></Link>
                  </div>
                  <div className="space-y-1.5">
                    {paiements.map((p: any) => {
                      const aff = p.paiement_factures?.[0]?.montant_affecte;
                      return (
                        <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-teal-50 border border-teal-200 text-xs">
                          <CreditCard size={11} className="text-teal-500 shrink-0"/>
                          <span className="font-mono font-semibold text-teal-700">{p.numero}</span>
                          <span className="text-zinc-500">{p.date_paiement}</span>
                          <span className="capitalize text-zinc-400">{p.mode_paiement}</span>
                          {p.reference&&<span className="font-mono text-zinc-400">{p.reference}</span>}
                          <span className="ml-auto font-bold font-tabular text-teal-700 shrink-0">
                            {aff ? fmt(aff) : fmt(p.montant)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Boutons si rien n'est lié */}
              {echeances.length===0&&paiements.length===0&&(
                <div className="flex gap-3">
                  <Link href="/echeances" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-xs font-semibold hover:bg-blue-100">
                    <Calendar size={14}/> Planifier des échéances
                  </Link>
                  <Link href="/paiements" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-700 text-xs font-semibold hover:bg-teal-100">
                    <CreditCard size={14}/> Enregistrer un paiement
                  </Link>
                </div>
              )}
            </>
          )}

          {/* Notes */}
          {facture.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
              <span className="font-semibold">Notes : </span>{facture.notes}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-zinc-100 bg-zinc-50 rounded-b-2xl shrink-0">
          <div className="flex gap-2">
            <Link href="/recouvrement" className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-100">
              <Link2 size={13}/> Recouvrement
            </Link>
            <button onClick={() => printFacture(facture)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-100">
              <Printer size={13}/> Imprimer
            </button>
          </div>
          {(facture.statut === 'en_attente' || facture.statut === 'retard' || facture.statut === 'partiellement_payee') && (
            <button onClick={handleMarkPaid} disabled={markingPaid}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60">
              <CheckCircle size={13}/> Marquer soldée
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Table ────────────────────────────────────────────────────────────────
export default function FacturationTable() {
  const supabase = useMemo(() => createClient(), []);
  const [factures, setFactures]     = useState<Facture[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterStatut, setFilterStatut] = useState<string>('tous');
  const [selectedFacture, setSelectedFacture] = useState<Facture | null>(null);

  const fetchFactures = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('factures').select('*').order('created_at', { ascending: false }).limit(200);
    if (!error && data) {
      setFactures(data.map((f: any) => ({
        id: f.id,
        numero: f.numero_facture,
        client: f.client_nom,
        client_id: f.client_id,
        produit: f.produit,
        lignes: Array.isArray(f.lignes) ? f.lignes : [],
        dateFacture:  f.date_facture  ? new Date(f.date_facture).toLocaleDateString('fr-FR') : '—',
        dateEcheance: f.date_echeance ? new Date(f.date_echeance).toLocaleDateString('fr-FR') : '—',
        montantHT:      parseFloat(f.montant_ht)      || 0,
        montantTVA:     parseFloat(f.montant_tva)     || 0,
        montantTTC:     parseFloat(f.montant_ttc)     || 0,
        montantPaye:    parseFloat(f.montant_paye)    || 0,
        montantRestant: parseFloat(f.montant_restant) ?? parseFloat(f.montant_ttc) ?? 0,
        statut: f.statut_paiement as StatutPaiement,
        modePaiement: f.mode_paiement || '—',
        notes: f.notes || '',
        taux_tva: parseFloat(f.taux_tva) || 19,
        remise: parseFloat(f.remise) || 0,
      })));
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchFactures(); }, [fetchFactures]);

  const filtered = factures.filter(f =>
    (filterStatut === 'tous' || f.statut === filterStatut) &&
    (search === '' || f.numero.toLowerCase().includes(search.toLowerCase()) || f.client.toLowerCase().includes(search.toLowerCase()))
  );

  const totalTTC    = filtered.reduce((s, f) => s + f.montantTTC, 0);
  const totalRestant = filtered.filter(f=>f.statut!=='paye'&&f.statut!=='annule').reduce((s,f)=>s+f.montantRestant,0);

  return (
    <div className="card-section">
      {/* Toolbar */}
      <div className="section-header flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"/>
            <input className="form-input pl-8 py-1.5 text-xs" placeholder="N° facture, client..."
              value={search} onChange={e => setSearch(e.target.value)}/>
            {search && <button onClick={()=>setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"><X size={12}/></button>}
          </div>
          <div className="flex items-center gap-1">
            <Filter size={13} className="text-zinc-400"/>
            <select className="form-select py-1.5 text-xs w-auto" value={filterStatut} onChange={e=>setFilterStatut(e.target.value)}>
              <option value="tous">Tous statuts</option>
              <option value="en_attente">En attente</option>
              <option value="partiellement_payee">Partiellement payée</option>
              <option value="paye">Soldée</option>
              <option value="retard">En retard</option>
              <option value="annule">Annulée</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] text-zinc-400">{filtered.length} facture(s)</p>
            <p className="text-xs font-semibold text-teal-700 font-tabular">{totalTTC.toFixed(3)} TND</p>
          </div>
          {totalRestant > 0.001 && (
            <div className="text-right">
              <p className="text-[10px] text-zinc-400">Restant à encaisser</p>
              <p className="text-xs font-bold text-red-600 font-tabular">{totalRestant.toFixed(3)} TND</p>
            </div>
          )}
          <button onClick={fetchFactures} className="p-1.5 rounded hover:bg-zinc-100" title="Actualiser">
            <RefreshCw size={13} className={`text-zinc-400 ${loading?'animate-spin':''}`}/>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"/>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['N° Facture','Client','Produit(s)','Date','Échéance','Total TTC','Payé','Restant','Statut','Actions'].map(h=>(
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map(f => {
                  const cfg        = STATUT[f.statut] ?? STATUT.en_attente;
                  const StatusIcon = cfg.icon;
                  const pct        = f.montantTTC>0 ? Math.min((f.montantPaye/f.montantTTC)*100,100) : 0;
                  return (
                    <tr key={f.id} className="hover:bg-zinc-50/60 transition-colors cursor-pointer" onClick={()=>setSelectedFacture(f)}>
                      <td className="table-td font-mono text-xs font-semibold text-zinc-800">{f.numero}</td>
                      <td className="table-td text-xs text-zinc-700 max-w-[130px] truncate">{f.client}</td>
                      <td className="table-td text-xs text-zinc-400 max-w-[120px] truncate">
                        {f.lignes?.length > 1 ? `${f.lignes.length} lignes` : f.produit}
                      </td>
                      <td className="table-td text-xs text-zinc-500 whitespace-nowrap">{f.dateFacture}</td>
                      <td className="table-td text-xs whitespace-nowrap">
                        <span className={f.statut==='retard'?'text-red-600 font-semibold':'text-zinc-500'}>{f.dateEcheance}</span>
                      </td>
                      <td className="table-td text-right">
                        <span className="text-sm font-bold font-tabular text-zinc-800">{f.montantTTC.toFixed(3)}</span>
                        <span className="text-[10px] text-zinc-400 ml-0.5">TND</span>
                      </td>
                      <td className="table-td text-right">
                        {f.montantPaye>0?(<>
                          <span className="text-xs font-tabular font-semibold text-emerald-600">{f.montantPaye.toFixed(3)}</span>
                          <div className="w-12 bg-zinc-100 rounded-full h-1 mt-1 ml-auto"><div className="bg-emerald-500 h-1 rounded-full" style={{width:`${pct}%`}}/></div>
                        </>):<span className="text-xs text-zinc-300">—</span>}
                      </td>
                      <td className="table-td text-right">
                        {f.montantRestant>0.001
                          ?<span className="text-xs font-tabular font-bold text-red-600">{f.montantRestant.toFixed(3)}</span>
                          :<span className="text-xs text-emerald-500">✓</span>}
                      </td>
                      <td className="table-td">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${cfg.bg} ${cfg.color}`}>
                          <StatusIcon size={10}/> {cfg.label}
                        </span>
                      </td>
                      <td className="table-td" onClick={e=>e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button title="Voir le détail" onClick={()=>setSelectedFacture(f)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-teal-600 hover:bg-teal-50 transition-colors">
                            <Eye size={13}/>
                          </button>
                          <button title="Imprimer" onClick={()=>printFacture(f)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors">
                            <Printer size={13}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length===0&&<div className="py-12 text-center text-zinc-400 text-sm">Aucune facture trouvée</div>}
        </>
      )}

      {/* Detail modal */}
      {selectedFacture && (
        <FactureDetailModal
          facture={selectedFacture}
          onClose={()=>setSelectedFacture(null)}
          onRefresh={fetchFactures}
        />
      )}
    </div>
  );
}
