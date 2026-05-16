'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import RoleGuard from '@/components/RoleGuard';
import { createClient } from '@/lib/supabase/client';
import { Plus, Search, X, CreditCard, Loader2, CheckCircle, AlertCircle, XCircle, Trash2, ChevronDown } from 'lucide-react';

const MODES = ['virement','cheque','especes','traite','carte'];
const today = () => new Date().toISOString().split('T')[0];
const fmt   = (n: number) => `${Number(n||0).toFixed(3)} TND`;

export default function PaiementsPage() {
  return <AppLayout><RoleGuard permission="canAccessFacturation"><PaiementsContent /></RoleGuard></AppLayout>;
}

function PaiementsContent() {
  const supabase = useMemo(() => createClient(), []);
  const [paiements, setPaiements] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showCancel, setShowCancel] = useState<any>(null);
  const [motifAnnul, setMotifAnnul] = useState('');
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState({ type:'', text:'' });

  // Form state
  const [clientNom, setClientNom] = useState('');
  const [clientId, setClientId]   = useState('');
  const [clients, setClients]     = useState<any[]>([]);
  const [datePai, setDatePai]     = useState(today());
  const [montant, setMontant]     = useState('');
  const [mode, setMode]           = useState('virement');
  const [reference, setReference] = useState('');
  const [notes, setNotes]         = useState('');
  const [factures, setFactures]   = useState<any[]>([]);  // client's unpaid invoices
  const [affectations, setAffectations] = useState<Record<string,string>>({});
  const [loadingFac, setLoadingFac] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [pRes, cRes] = await Promise.all([
      supabase.from('paiements').select('*').order('date_paiement', { ascending: false }),
      supabase.from('clients').select('id,nom').eq('actif', true).order('nom'),
    ]);
    if (pRes.data) setPaiements(pRes.data);
    if (cRes.data) setClients(cRes.data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Load unpaid/partial invoices for selected client
  const loadClientFactures = async (cId: string) => {
    if (!cId) { setFactures([]); return; }
    setLoadingFac(true);
    const { data } = await supabase.from('factures').select('id,numero_facture,montant_ttc,montant_paye,montant_restant,statut_paiement')
      .eq('client_id', cId).in('statut_paiement', ['en_attente','partiellement_payee']).order('date_facture');
    setFactures(data || []);
    // Init affectations with remaining amounts
    const init: Record<string,string> = {};
    (data || []).forEach((f: any) => { init[f.id] = ''; });
    setAffectations(init);
    setLoadingFac(false);
  };

  // Auto-distribute remaining montant across selected invoices
  const autoDistribute = () => {
    let remaining = parseFloat(montant || '0');
    const newAff: Record<string,string> = {};
    for (const f of factures) {
      if (remaining <= 0) { newAff[f.id] = '0'; continue; }
      const restant = parseFloat(f.montant_restant || f.montant_ttc || '0');
      const affect  = Math.min(remaining, restant);
      newAff[f.id] = affect.toFixed(3);
      remaining -= affect;
    }
    setAffectations(newAff);
  };

  const totalAffecte = Object.values(affectations).reduce((s, v) => s + (parseFloat(v)||0), 0);

  const handleSave = async () => {
    const aff = Object.entries(affectations)
      .filter(([,v]) => parseFloat(v||'0') > 0)
      .map(([facture_id, montant_affecte]) => ({ facture_id, montant_affecte: parseFloat(montant_affecte) }));

    if (!clientNom || !montant || aff.length === 0) {
      setMsg({ type:'err', text:'Client, montant et au moins une facture affectée sont obligatoires.' });
      return;
    }
    setSaving(true);
    const res = await fetch('/api/commercial/paiement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date_paiement: datePai, montant: parseFloat(montant), mode_paiement: mode, reference, client_id: clientId, client_nom: clientNom, notes, affectations: aff }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setMsg({ type:'err', text: data.error }); return; }
    setMsg({ type:'ok', text: `Paiement ${data.numero} enregistré avec succès.` });
    setShowModal(false); fetchAll();
    setTimeout(() => setMsg({ type:'', text:'' }), 4000);
  };

  const handleCancel = async () => {
    if (!motifAnnul.trim()) { setMsg({ type:'err', text:'Motif obligatoire.' }); return; }
    setSaving(true);
    const res = await fetch('/api/commercial/paiement', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paiement_id: showCancel.id, motif_annulation: motifAnnul }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setMsg({ type:'err', text: d.error }); return; }
    setMsg({ type:'ok', text: 'Paiement annulé.' });
    setShowCancel(null); setMotifAnnul(''); fetchAll();
    setTimeout(() => setMsg({ type:'', text:'' }), 3000);
  };

  const filtered = paiements.filter(p =>
    search === '' ||
    p.client_nom?.toLowerCase().includes(search.toLowerCase()) ||
    p.numero?.includes(search) || p.reference?.includes(search)
  );

  const statsActifs = paiements.filter(p => !p.annule);
  const totalEncaisse = statsActifs.reduce((s, p) => s + parseFloat(p.montant||'0'), 0);

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2"><CreditCard size={20} className="text-teal-600"/> Paiements</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Paiements partiels, groupés et suivi des encaissements</p>
        </div>
        <button onClick={() => { setClientNom('');setClientId('');setFactures([]);setAffectations({});setDatePai(today());setMontant('');setMode('virement');setReference('');setNotes('');setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">
          <Plus size={15}/> Nouveau paiement
        </button>
      </div>

      {msg.text && <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm border ${msg.type==='ok'?'bg-emerald-50 border-emerald-200 text-emerald-700':'bg-red-50 border-red-200 text-red-700'}`}>
        {msg.type==='ok'?<CheckCircle size={15}/>:<AlertCircle size={15}/>} {msg.text}
      </div>}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-4"><p className="text-xs text-zinc-500">Total encaissé</p><p className="text-xl font-bold text-teal-700 font-tabular mt-1">{fmt(totalEncaisse)}</p></div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4"><p className="text-xs text-zinc-500">Nb paiements actifs</p><p className="text-xl font-bold text-zinc-800 mt-1">{statsActifs.length}</p></div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4"><p className="text-xs text-zinc-500">Annulés</p><p className="text-xl font-bold text-red-500 mt-1">{paiements.filter(p=>p.annule).length}</p></div>
      </div>

      <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"/><input className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-teal-500" placeholder="Numéro, client, référence..." value={search} onChange={e=>setSearch(e.target.value)}/></div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {loading?<div className="flex items-center justify-center py-16 gap-2 text-zinc-400"><Loader2 size={18} className="animate-spin"/> Chargement...</div>:(
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-100">
                <tr>{['Numéro','Date','Client','Montant','Mode','Référence','Statut','Actions'].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map(p=>(
                  <tr key={p.id} className={`hover:bg-zinc-50 ${p.annule?'opacity-50':''}`}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-zinc-700">{p.numero}</td>
                    <td className="px-4 py-3 text-xs text-zinc-600">{p.date_paiement}</td>
                    <td className="px-4 py-3 font-medium text-zinc-800">{p.client_nom}</td>
                    <td className="px-4 py-3 font-bold font-tabular text-teal-700">{fmt(p.montant)}</td>
                    <td className="px-4 py-3 text-zinc-600 capitalize text-xs">{p.mode_paiement}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">{p.reference||'—'}</td>
                    <td className="px-4 py-3">
                      {p.annule
                        ? <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-600">Annulé</span>
                        : <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700">Actif</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      {!p.annule && (
                        <button onClick={()=>setShowCancel(p)} title="Annuler"
                          className="p-1.5 rounded text-zinc-400 hover:text-red-500 hover:bg-red-50"><XCircle size={14}/></button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length===0&&<tr><td colSpan={8} className="py-12 text-center text-zinc-400 text-sm">Aucun paiement</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 sticky top-0 bg-white z-10">
              <h2 className="text-base font-semibold text-zinc-900">Nouveau paiement</h2>
              <button onClick={()=>setShowModal(false)}><X size={18} className="text-zinc-400"/></button>
            </div>
            <div className="px-6 py-5 space-y-5">
              {msg.type==='err'&&<div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{msg.text}</div>}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Client *</label>
                  <select className="form-select" value={clientNom} onChange={e=>{const c=clients.find(x=>x.nom===e.target.value);setClientNom(e.target.value);const id=c?.id||'';setClientId(id);loadClientFactures(id);}}>
                    <option value="">Sélectionner</option>{clients.map(c=><option key={c.id} value={c.nom}>{c.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Date paiement *</label>
                  <input type="date" className="form-input" value={datePai} onChange={e=>setDatePai(e.target.value)}/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Montant reçu (TND) *</label>
                  <input type="number" min="0" step="0.001" className="form-input font-tabular font-bold text-lg" value={montant} onChange={e=>setMontant(e.target.value)} placeholder="0.000"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Mode de paiement</label>
                  <select className="form-select" value={mode} onChange={e=>setMode(e.target.value)}>
                    {MODES.map(m=><option key={m} value={m} className="capitalize">{m}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Référence (N° chèque, virement...)</label>
                  <input className="form-input font-mono" value={reference} onChange={e=>setReference(e.target.value)} placeholder="REF-12345"/>
                </div>
              </div>

              {/* Invoice distribution */}
              {clientNom && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-zinc-600">Affecter aux factures impayées *</label>
                    <button type="button" onClick={autoDistribute} disabled={!montant}
                      className="text-xs px-3 py-1 bg-teal-50 border border-teal-200 text-teal-700 rounded-lg hover:bg-teal-100 font-medium">
                      ⚡ Répartition automatique
                    </button>
                  </div>
                  {loadingFac ? <div className="py-4 text-center text-zinc-400 text-sm"><Loader2 size={16} className="animate-spin inline mr-2"/>Chargement des factures...</div>
                  : factures.length === 0 ? <div className="py-4 text-center text-zinc-400 text-sm bg-zinc-50 rounded-xl border border-zinc-200">✓ Aucune facture impayée pour ce client</div>
                  : (
                    <div className="rounded-xl border border-zinc-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-zinc-50 border-b border-zinc-100">
                          <tr>
                            <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-500">Facture</th>
                            <th className="text-right px-3 py-2 text-xs font-semibold text-zinc-500">Total TTC</th>
                            <th className="text-right px-3 py-2 text-xs font-semibold text-zinc-500">Déjà payé</th>
                            <th className="text-right px-3 py-2 text-xs font-semibold text-zinc-500">Restant</th>
                            <th className="text-right px-3 py-2 text-xs font-semibold text-zinc-500">Affecter (TND)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {factures.map(f=>(
                            <tr key={f.id} className="hover:bg-zinc-50">
                              <td className="px-3 py-2 font-mono text-xs font-semibold text-zinc-700">{f.numero_facture}</td>
                              <td className="px-3 py-2 text-right text-xs font-tabular text-zinc-600">{fmt(f.montant_ttc)}</td>
                              <td className="px-3 py-2 text-right text-xs font-tabular text-zinc-500">{fmt(f.montant_paye||0)}</td>
                              <td className="px-3 py-2 text-right text-xs font-tabular font-semibold text-amber-700">{fmt(f.montant_restant||f.montant_ttc)}</td>
                              <td className="px-3 py-2 text-right">
                                <input type="number" min="0" max={f.montant_restant||f.montant_ttc} step="0.001"
                                  className="w-28 text-right text-xs border border-zinc-200 rounded px-2 py-1 focus:ring-1 focus:ring-teal-500 font-tabular"
                                  value={affectations[f.id]||''}
                                  onChange={e=>setAffectations(a=>({...a,[f.id]:e.target.value}))}
                                  placeholder="0.000"/>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-zinc-50 border-t border-zinc-200">
                          <tr>
                            <td colSpan={4} className="px-3 py-2 text-xs font-semibold text-zinc-600 text-right">Total affecté :</td>
                            <td className="px-3 py-2 text-right">
                              <span className={`text-sm font-bold font-tabular ${totalAffecte > parseFloat(montant||'0')+0.001?'text-red-600':totalAffecte>0?'text-teal-700':'text-zinc-400'}`}>
                                {fmt(totalAffecte)}
                              </span>
                            </td>
                          </tr>
                          {montant && parseFloat(montant) > totalAffecte + 0.001 && (
                            <tr><td colSpan={5} className="px-3 py-1.5 text-xs text-amber-700 bg-amber-50 text-right">
                              Non affecté : {fmt(parseFloat(montant) - totalAffecte)}
                            </td></tr>
                          )}
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Notes</label>
                <textarea rows={2} className="form-input resize-none" value={notes} onChange={e=>setNotes(e.target.value)}/>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-100 sticky bottom-0 bg-white">
              <button onClick={()=>setShowModal(false)} className="px-4 py-2 text-sm text-zinc-600 font-medium">Annuler</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-60">
                {saving&&<Loader2 size={14} className="animate-spin"/>} Enregistrer le paiement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center"><XCircle size={20} className="text-red-500"/></div>
              <div>
                <h3 className="font-semibold text-zinc-900">Annuler le paiement</h3>
                <p className="text-xs text-zinc-500">{showCancel.numero} — {fmt(showCancel.montant)}</p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
              L'annulation recalculera automatiquement les montants payés et le statut de toutes les factures concernées.
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Motif d'annulation *</label>
              <textarea rows={3} className="form-input resize-none" value={motifAnnul} onChange={e=>setMotifAnnul(e.target.value)} placeholder="Erreur de saisie, chèque sans provision..."/>
            </div>
            <div className="flex gap-3">
              <button onClick={()=>setShowCancel(null)} className="flex-1 px-4 py-2 text-sm border border-zinc-200 rounded-lg text-zinc-600 font-medium hover:bg-zinc-50">Retour</button>
              <button onClick={handleCancel} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-60">
                {saving&&<Loader2 size={14} className="animate-spin"/>} Confirmer l'annulation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
