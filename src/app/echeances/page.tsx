'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import RoleGuard from '@/components/RoleGuard';
import { createClient } from '@/lib/supabase/client';
import { Calendar, Plus, X, Loader2, CheckCircle, AlertCircle, Clock, CreditCard, Link2 } from 'lucide-react';

const fmt   = (n: number) => `${Number(n||0).toFixed(3)} TND`;
const today = () => new Date().toISOString().split('T')[0];

const STATUT_CFG: Record<string,{label:string,cls:string}> = {
  a_venir:             { label:'À venir',              cls:'bg-blue-100 text-blue-700' },
  en_retard:           { label:'En retard',             cls:'bg-red-100 text-red-700' },
  payee:               { label:'Payée ✓',               cls:'bg-green-100 text-green-700' },
  partiellement_payee: { label:'Partiellement payée',   cls:'bg-amber-100 text-amber-700' },
};

export default function EcheancesPage() {
  return <AppLayout><RoleGuard permission="canAccessFacturation"><EcheancesContent /></RoleGuard></AppLayout>;
}

function EcheancesContent() {
  const supabase = useMemo(() => createClient(), []);
  const [echeances, setEcheances] = useState<any[]>([]);
  const [factures, setFactures]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [syncing, setSyncing]     = useState(false);
  const [filterStatut, setFilterStatut] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [savingPay, setSavingPay] = useState<string|null>(null);
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState({ type:'', text:'' });

  const [factureId, setFactureId]   = useState('');
  const [nbEcheances, setNbEcheances] = useState('1');
  const [lines, setLines] = useState<{date:string,montant:string,mode:string,notes:string}[]>([{date:'',montant:'',mode:'virement',notes:''}]);

  // Sync + fetch
  const syncAndFetch = useCallback(async () => {
    setLoading(true);
    setSyncing(true);
    // Trigger sync
    await fetch('/api/commercial/sync', { method:'POST' }).catch(()=>{});
    setSyncing(false);
    const [eRes, fRes] = await Promise.all([
      supabase.from('echeances').select('*').order('date_echeance'),
      supabase.from('factures').select('id,numero_facture,client_nom,montant_ttc,montant_restant,statut_paiement').in('statut_paiement',['en_attente','partiellement_payee','retard']).order('date_facture'),
    ]);
    if (eRes.data) setEcheances(eRes.data);
    if (fRes.data) setFactures(fRes.data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { syncAndFetch(); }, [syncAndFetch]);

  const buildLines = (n: number) => setLines(Array.from({length:n},()=>({date:'',montant:'',mode:'virement',notes:''})));

  // Quick pay échéance → creates real paiement + updates facture via API
  const handleQuickPay = async (e: any) => {
    setSavingPay(e.id);
    try {
      const montantAffecte = parseFloat(e.montant) - (parseFloat(e.montant_paye)||0);
      // Get facture client info
      const { data: fac } = await supabase.from('factures').select('client_id,client_nom').eq('id',e.facture_id).single();
      const res = await fetch('/api/commercial/paiement', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          date_paiement: today(),
          montant: montantAffecte,
          mode_paiement: e.mode_paiement||'virement',
          reference: `ECH-${e.facture_numero}-#${e.numero_echeance}`,
          client_id: fac?.client_id,
          client_nom: fac?.client_nom,
          notes: `Paiement automatique échéance #${e.numero_echeance}`,
          affectations: [{ facture_id: e.facture_id, montant_affecte: montantAffecte }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg({type:'ok',text:`Paiement ${data.numero} créé — Échéance soldée`});
      syncAndFetch();
    } catch(err:any) {
      setMsg({type:'err',text:err.message});
    } finally {
      setSavingPay(null);
      setTimeout(()=>setMsg({type:'',text:''}),4000);
    }
  };

  const handleSave = async () => {
    if (!factureId||lines.some(l=>!l.date||!l.montant)){setMsg({type:'err',text:'Facture et lignes obligatoires.'});return;}
    setSaving(true);
    const fac = factures.find(f=>f.id===factureId);
    for (let i=0;i<lines.length;i++){
      const l=lines[i];
      await supabase.from('echeances').insert([{
        facture_id:factureId, facture_numero:fac?.numero_facture,
        client_nom:fac?.client_nom, numero_echeance:i+1,
        date_echeance:l.date, montant:parseFloat(l.montant),
        mode_paiement:l.mode, notes:l.notes, statut:'a_venir',
      }]);
    }
    setMsg({type:'ok',text:`${lines.length} échéance(s) planifiée(s) pour ${fac?.numero_facture}`});
    setSaving(false); setShowModal(false); syncAndFetch();
    setTimeout(()=>setMsg({type:'',text:''}),4000);
  };

  const filtered = echeances.filter(e=>filterStatut==='all'||e.statut===filterStatut);
  const totals   = {a_venir:0,en_retard:0,payee:0,partiellement_payee:0};
  echeances.forEach(e=>{if(e.statut in totals)totals[e.statut as keyof typeof totals]+=parseFloat(e.montant||'0');});

  const montantRestantParEch = (e: any) => parseFloat(e.montant||'0') - (parseFloat(e.montant_paye)||0);

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            <Calendar size={20} className="text-teal-600"/> Échéances
            {syncing&&<span className="text-xs text-zinc-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin"/> Synchronisation...</span>}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">Liées aux factures — paiement direct depuis cette vue</p>
        </div>
        <div className="flex gap-2">
          <button onClick={syncAndFetch} className="px-3 py-2 text-xs border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50">↻ Sync</button>
          <button onClick={()=>{setFactureId('');setNbEcheances('1');buildLines(1);setShowModal(true);}}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">
            <Plus size={15}/> Planifier
          </button>
        </div>
      </div>

      {msg.text&&<div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm border ${msg.type==='ok'?'bg-emerald-50 border-emerald-200 text-emerald-700':'bg-red-50 border-red-200 text-red-700'}`}>{msg.type==='ok'?<CheckCircle size={15}/>:<AlertCircle size={15}/>} {msg.text}</div>}

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4"><p className="text-xs text-zinc-500">À venir</p><p className="text-lg font-bold text-blue-700 font-tabular mt-1">{fmt(totals.a_venir)}</p></div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4"><p className="text-xs text-zinc-500">Partielles</p><p className="text-lg font-bold text-amber-700 font-tabular mt-1">{fmt(totals.partiellement_payee)}</p></div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4"><p className="text-xs text-zinc-500">En retard</p><p className="text-lg font-bold text-red-700 font-tabular mt-1">{fmt(totals.en_retard)}</p></div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4"><p className="text-xs text-zinc-500">Payées</p><p className="text-lg font-bold text-green-700 font-tabular mt-1">{fmt(totals.payee)}</p></div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['all',...Object.keys(STATUT_CFG)].map(s=>(
          <button key={s} onClick={()=>setFilterStatut(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${filterStatut===s?'bg-teal-600 text-white border-teal-600':'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'}`}>
            {s==='all'?'Toutes':STATUT_CFG[s]?.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {loading?<div className="flex items-center justify-center py-16 gap-2 text-zinc-400"><Loader2 size={18} className="animate-spin"/> Chargement...</div>:(
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-100">
                <tr>{['Facture','Client','#','Date échéance','Montant','Déjà payé','Restant','Mode','Statut','Action'].map(h=>(
                  <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-zinc-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map(e=>{
                  const cfg     = STATUT_CFG[e.statut]||STATUT_CFG.a_venir;
                  const restant = montantRestantParEch(e);
                  const isLate  = e.statut==='en_retard';
                  const isPaid  = e.statut==='payee';
                  return (
                    <tr key={e.id} className={`hover:bg-zinc-50 ${isLate?'bg-red-50/20':''} ${isPaid?'opacity-60':''}`}>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <Link2 size={11} className="text-zinc-400"/>
                          <span className="font-mono text-xs font-semibold text-zinc-700">{e.facture_numero}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm font-medium text-zinc-800">{e.client_nom}</td>
                      <td className="px-3 py-3 text-center text-xs font-semibold text-zinc-500">#{e.numero_echeance}</td>
                      <td className={`px-3 py-3 text-xs font-semibold ${isLate?'text-red-700':'text-zinc-700'}`}>
                        {isLate&&<Clock size={11} className="inline mr-1"/>}{e.date_echeance}
                      </td>
                      <td className="px-3 py-3 font-bold font-tabular text-zinc-800">{fmt(e.montant)}</td>
                      <td className="px-3 py-3 font-tabular text-xs text-green-600">{(parseFloat(e.montant_paye)||0)>0?fmt(e.montant_paye):'—'}</td>
                      <td className="px-3 py-3 font-tabular text-xs font-semibold text-amber-700">{restant>0.001?fmt(restant):'—'}</td>
                      <td className="px-3 py-3 text-xs text-zinc-500 capitalize">{e.mode_paiement}</td>
                      <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.cls}`}>{cfg.label}</span></td>
                      <td className="px-3 py-3">
                        {!isPaid&&restant>0.001&&(
                          <button onClick={()=>handleQuickPay(e)} disabled={savingPay===e.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-60">
                            {savingPay===e.id?<Loader2 size={11} className="animate-spin"/>:<CreditCard size={11}/>}
                            Payer {fmt(restant)}
                          </button>
                        )}
                        {isPaid&&<span className="text-[11px] text-green-600 font-semibold">✓ Soldée</span>}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length===0&&<tr><td colSpan={10} className="py-12 text-center text-zinc-400 text-sm">Aucune échéance</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 sticky top-0 bg-white z-10">
              <h2 className="text-base font-semibold text-zinc-900">Planifier des échéances</h2>
              <button onClick={()=>setShowModal(false)}><X size={18} className="text-zinc-400"/></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {msg.type==='err'&&<div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{msg.text}</div>}
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Facture *</label>
                <select className="form-select" value={factureId} onChange={e=>setFactureId(e.target.value)}>
                  <option value="">Sélectionner une facture impayée</option>
                  {factures.map(f=><option key={f.id} value={f.id}>{f.numero_facture} — {f.client_nom} — Restant : {fmt(f.montant_restant||f.montant_ttc)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-2">Nombre d'échéances</label>
                <div className="flex gap-2 flex-wrap">
                  {[1,2,3,4,6,12].map(n=>(
                    <button key={n} type="button" onClick={()=>{setNbEcheances(String(n));buildLines(n);}}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${nbEcheances===String(n)?'bg-teal-600 text-white border-teal-600':'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'}`}>{n}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {lines.map((l,i)=>(
                  <div key={i} className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 grid grid-cols-4 gap-2">
                    <div className="col-span-4 text-xs font-bold text-teal-700">Échéance #{i+1}</div>
                    <div><label className="block text-[10px] text-zinc-500 mb-1">Date *</label><input type="date" className="form-input text-xs" value={l.date} onChange={e=>{const nl=[...lines];nl[i]={...nl[i],date:e.target.value};setLines(nl);}}/></div>
                    <div><label className="block text-[10px] text-zinc-500 mb-1">Montant (TND) *</label><input type="number" min="0" step="0.001" className="form-input text-xs font-tabular" placeholder="0.000" value={l.montant} onChange={e=>{const nl=[...lines];nl[i]={...nl[i],montant:e.target.value};setLines(nl);}}/></div>
                    <div><label className="block text-[10px] text-zinc-500 mb-1">Mode</label>
                      <select className="form-select text-xs" value={l.mode} onChange={e=>{const nl=[...lines];nl[i]={...nl[i],mode:e.target.value};setLines(nl);}}>
                        {['virement','cheque','especes','traite','carte'].map(m=><option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div><label className="block text-[10px] text-zinc-500 mb-1">Notes</label><input className="form-input text-xs" value={l.notes} onChange={e=>{const nl=[...lines];nl[i]={...nl[i],notes:e.target.value};setLines(nl);}}/></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-100 sticky bottom-0 bg-white">
              <button onClick={()=>setShowModal(false)} className="px-4 py-2 text-sm text-zinc-600 font-medium">Annuler</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-60">
                {saving&&<Loader2 size={14} className="animate-spin"/>} Planifier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
