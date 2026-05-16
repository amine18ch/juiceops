'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import RoleGuard from '@/components/RoleGuard';
import { createClient } from '@/lib/supabase/client';
import { Shield, Phone, Mail, MessageSquare, Car, FileText, Plus, X, Loader2, CheckCircle, AlertCircle, CreditCard, Calendar, TrendingDown } from 'lucide-react';

const fmt = (n: number) => `${Number(n||0).toFixed(3)} TND`;
const today = () => new Date().toISOString().split('T')[0];
const daysDiff = (d: string) => d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : 0;

const RELANCE_TYPES = [
  {val:'telephone',label:'Téléphone',icon:Phone},
  {val:'email',label:'Email',icon:Mail},
  {val:'whatsapp',label:'WhatsApp',icon:MessageSquare},
  {val:'visite',label:'Visite',icon:Car},
  {val:'courrier',label:'Courrier',icon:FileText},
];

const RISQUE: Record<string,{label:string,cls:string,bg:string}> = {
  normal:       {label:'Normal',      cls:'bg-green-100 text-green-700',  bg:'bg-green-50 border-green-200'},
  surveillance: {label:'Surveillance',cls:'bg-yellow-100 text-yellow-700',bg:'bg-yellow-50 border-yellow-200'},
  risque:       {label:'Risque',      cls:'bg-orange-100 text-orange-700',bg:'bg-orange-50 border-orange-200'},
  contentieux:  {label:'Contentieux', cls:'bg-red-100 text-red-700',      bg:'bg-red-50 border-red-200'},
};

export default function RecouvrementPage() {
  return <AppLayout><RoleGuard permission="canAccessFacturation"><RecouvrementContent /></RoleGuard></AppLayout>;
}

function RecouvrementContent() {
  const supabase = useMemo(() => createClient(), []);
  const [factures, setFactures]   = useState<any[]>([]);
  const [echeances, setEcheances] = useState<any[]>([]);
  const [relances, setRelances]   = useState<any[]>([]);
  const [paiements, setPaiements] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [syncing, setSyncing]     = useState(false);
  const [showRelance, setShowRelance] = useState<any>(null);
  const [showFactureDetail, setShowFactureDetail] = useState<any>(null);
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState({type:'',text:''});

  const [typeRelance, setTypeRelance]   = useState('email');
  const [commentaire, setCommentaire]   = useState('');
  const [resultat, setResultat]         = useState('');
  const [prochaineAction, setProchaineAction] = useState('');

  const syncAndFetch = useCallback(async () => {
    setSyncing(true);
    await fetch('/api/commercial/sync', {method:'POST'}).catch(()=>{});
    setSyncing(false);
    setLoading(true);
    const [fRes, eRes, rRes, pRes] = await Promise.all([
      supabase.from('factures').select('*').in('statut_paiement',['en_attente','partiellement_payee','retard']).order('date_facture'),
      supabase.from('echeances').select('*').order('date_echeance'),
      supabase.from('relances').select('*').order('date_relance',{ascending:false}),
      supabase.from('paiements').select('*').eq('annule',false).order('date_paiement',{ascending:false}),
    ]);
    if(fRes.data) setFactures(fRes.data);
    if(eRes.data) setEcheances(eRes.data);
    if(rRes.data) setRelances(rRes.data);
    if(pRes.data) setPaiements(pRes.data);
    setLoading(false);
  }, [supabase]);

  useEffect(()=>{syncAndFetch();},[syncAndFetch]);

  const handleRelance = async () => {
    if(!commentaire.trim()){setMsg({type:'err',text:'Commentaire obligatoire.'});return;}
    setSaving(true);
    await supabase.from('relances').insert([{
      client_id: showRelance.client_id, client_nom: showRelance.client_nom,
      date_relance: today(), type_relance: typeRelance,
      commentaire, resultat, prochaine_action: prochaineAction||null,
      montant_concerne: showRelance.totalDu,
    }]);
    await supabase.from('factures').update({date_derniere_relance:today()}).eq('client_id',showRelance.client_id);
    setMsg({type:'ok',text:'Relance enregistrée.'});
    setSaving(false); setShowRelance(null);
    setCommentaire(''); setResultat(''); setProchaineAction('');
    syncAndFetch(); setTimeout(()=>setMsg({type:'',text:''}),3000);
  };

  const handleRisque = async (clientId: string, risque: string) => {
    await supabase.from('factures').update({niveau_risque:risque}).eq('client_id',clientId).in('statut_paiement',['en_attente','partiellement_payee','retard']);
    syncAndFetch();
  };

  // Group by client
  const byClient = useMemo(()=>{
    const g: Record<string,any>={};
    factures.forEach(f=>{
      const k=f.client_id||f.client_nom;
      if(!g[k]) g[k]={client_nom:f.client_nom,client_id:f.client_id,factures:[],totalDu:0,maxDays:0,risque:f.niveau_risque||'normal',dernierRelance:null};
      g[k].factures.push(f);
      g[k].totalDu += parseFloat(f.montant_restant||f.montant_ttc||'0');
      const d=daysDiff(f.date_facture||f.created_at);
      if(d>g[k].maxDays) g[k].maxDays=d;
      if(f.date_derniere_relance&&(!g[k].dernierRelance||f.date_derniere_relance>g[k].dernierRelance)) g[k].dernierRelance=f.date_derniere_relance;
    });
    return Object.values(g).sort((a:any,b:any)=>b.totalDu-a.totalDu);
  },[factures]);

  const totalImpayes = byClient.reduce((s:number,g:any)=>s+g.totalDu,0);
  const age={
    '0-30':  factures.filter(f=>daysDiff(f.date_facture||f.created_at)<=30),
    '31-60': factures.filter(f=>{const d=daysDiff(f.date_facture||f.created_at);return d>30&&d<=60;}),
    '61-90': factures.filter(f=>{const d=daysDiff(f.date_facture||f.created_at);return d>60&&d<=90;}),
    '+90':   factures.filter(f=>daysDiff(f.date_facture||f.created_at)>90),
  };
  const ageSum=(arr:any[])=>arr.reduce((s,f)=>s+parseFloat(f.montant_restant||f.montant_ttc||'0'),0);

  const getFactureEcheances = (factureId: string) => echeances.filter(e=>e.facture_id===factureId);
  const getClientRelances   = (clientId: string)  => relances.filter(r=>r.client_id===clientId).slice(0,5);
  const getClientPaiements  = (clientId: string)  => paiements.filter(p=>p.client_id===clientId).slice(0,5);

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            <Shield size={20} className="text-teal-600"/> Recouvrement
            {syncing&&<span className="text-xs text-zinc-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin"/> Sync...</span>}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">Vue consolidée : Factures · Échéances · Paiements · Relances</p>
        </div>
        <button onClick={syncAndFetch} className="px-3 py-2 text-xs border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50">↻ Synchroniser</button>
      </div>

      {msg.text&&<div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm border ${msg.type==='ok'?'bg-emerald-50 border-emerald-200 text-emerald-700':'bg-red-50 border-red-200 text-red-700'}`}>{msg.type==='ok'?<CheckCircle size={15}/>:<AlertCircle size={15}/>} {msg.text}</div>}

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5"><div className="text-2xl mb-1">💸</div><p className="text-lg font-bold font-tabular text-red-700">{fmt(totalImpayes)}</p><p className="text-xs font-semibold text-zinc-700 mt-1">Total impayé</p></div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5"><div className="text-2xl mb-1">👥</div><p className="text-lg font-bold text-amber-700">{byClient.length}</p><p className="text-xs font-semibold text-zinc-700 mt-1">Clients concernés</p></div>
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5"><div className="text-2xl mb-1">📋</div><p className="text-lg font-bold text-orange-700">{factures.length}</p><p className="text-xs font-semibold text-zinc-700 mt-1">Factures impayées</p></div>
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5"><div className="text-2xl mb-1">🔔</div><p className="text-lg font-bold text-purple-700">{relances.length}</p><p className="text-xs font-semibold text-zinc-700 mt-1">Relances effectuées</p></div>
      </div>

      {/* Balance âgée */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6">
        <h2 className="text-sm font-bold text-zinc-800 mb-4 flex items-center gap-2"><TrendingDown size={16} className="text-red-500"/> Balance âgée des créances</h2>
        <div className="grid grid-cols-4 gap-3">
          {Object.entries(age).map(([label,arr])=>{
            const sum=ageSum(arr);
            const pct = totalImpayes > 0 ? (sum/totalImpayes)*100 : 0;
            const colors={'0-30':'border-green-300 bg-green-50 text-green-800','31-60':'border-yellow-300 bg-yellow-50 text-yellow-800','61-90':'border-orange-300 bg-orange-50 text-orange-800','+90':'border-red-300 bg-red-50 text-red-800'};
            return (
              <div key={label} className={`rounded-xl border-2 p-4 ${colors[label as keyof typeof colors]}`}>
                <p className="text-xs font-bold uppercase tracking-wide mb-2">{label} jours</p>
                <p className="text-lg font-bold font-tabular">{fmt(sum)}</p>
                <p className="text-[11px] opacity-70 mt-0.5">{arr.length} facture{arr.length>1?'s':''} · {pct.toFixed(0)}%</p>
                <div className="w-full bg-white/50 rounded-full h-1.5 mt-2">
                  <div className="h-1.5 rounded-full bg-current opacity-40" style={{width:`${Math.min(pct,100)}%`}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Clients */}
      {loading?<div className="flex items-center justify-center py-10 gap-2 text-zinc-400"><Loader2 size={18} className="animate-spin"/> Chargement...</div>
      :byClient.length===0?<div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center text-emerald-700 font-medium">✅ Aucune créance impayée</div>
      :byClient.map((g:any)=>{
        const cfg = RISQUE[g.risque]||RISQUE.normal;
        const clientRelances = getClientRelances(g.client_id);
        const clientPaiements = getClientPaiements(g.client_id);
        return (
          <div key={g.client_id} className={`rounded-2xl border-2 overflow-hidden ${cfg.bg}`}>
            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h3 className="font-bold text-zinc-900 text-lg">{g.client_nom}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.cls}`}>{cfg.label}</span>
                  <span className="text-xs text-zinc-500">{g.factures.length} facture{g.factures.length>1?'s':''} · {g.maxDays}j max</span>
                  {g.dernierRelance&&<span className="text-xs text-zinc-400 flex items-center gap-1"><Calendar size={10}/>Relancé le {g.dernierRelance}</span>}
                </div>
                <p className="text-2xl font-bold font-tabular text-red-700">{fmt(g.totalDu)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select className="text-xs border border-zinc-200 rounded-lg px-2 py-1.5 bg-white focus:ring-1 focus:ring-teal-500"
                  value={g.risque} onChange={e=>handleRisque(g.client_id,e.target.value)}>
                  {Object.entries(RISQUE).map(([v,c])=><option key={v} value={v}>{c.label}</option>)}
                </select>
                <button onClick={()=>setShowRelance({...g.factures[0], client_nom:g.client_nom, client_id:g.client_id, totalDu:g.totalDu})}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700">
                  <Plus size={12}/> Relance
                </button>
              </div>
            </div>

            {/* Factures + Échéances */}
            <div className="border-t border-white/50">
              {g.factures.map((f: any)=>{
                const fEch = getFactureEcheances(f.id);
                return (
                  <div key={f.id} className="border-b border-white/30 last:border-0">
                    <div className="px-5 py-3 flex items-center gap-4 bg-white/40 hover:bg-white/60 transition-colors cursor-pointer"
                      onClick={()=>setShowFactureDetail({facture:f,echeances:fEch,paiements:clientPaiements,relances:clientRelances})}>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold text-zinc-700">{f.numero_facture}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${f.statut_paiement==='partiellement_payee'?'bg-blue-100 text-blue-700':'bg-red-100 text-red-700'}`}>
                            {f.statut_paiement==='partiellement_payee'?'Partiel':'Impayée'}
                          </span>
                          <span className="text-[10px] text-zinc-400">{daysDiff(f.date_facture||f.created_at)}j</span>
                        </div>
                        <div className="flex items-center gap-4 mt-0.5 text-xs">
                          <span className="text-zinc-500">Total: <span className="font-tabular">{fmt(f.montant_ttc)}</span></span>
                          <span className="text-green-600">Payé: <span className="font-tabular">{fmt(f.montant_paye||0)}</span></span>
                          <span className="text-red-700 font-semibold">Restant: <span className="font-tabular">{fmt(f.montant_restant||f.montant_ttc)}</span></span>
                        </div>
                      </div>
                      {fEch.length>0&&(
                        <div className="text-right">
                          <p className="text-[10px] font-semibold text-zinc-500">{fEch.length} échéance{fEch.length>1?'s':''}</p>
                          <p className="text-[10px] text-red-600">{fEch.filter((e:any)=>e.statut==='en_retard').length} en retard</p>
                        </div>
                      )}
                      <span className="text-zinc-300 text-xs">→</span>
                    </div>
                    {/* Échéances de cette facture */}
                    {fEch.filter((e:any)=>e.statut!=='payee').map((e:any)=>(
                      <div key={e.id} className={`px-8 py-2 flex items-center gap-3 text-xs border-t border-white/20 ${e.statut==='en_retard'?'bg-red-50/60':'bg-white/20'}`}>
                        <Calendar size={11} className="text-zinc-400 shrink-0"/>
                        <span className="text-zinc-500">#{e.numero_echeance}</span>
                        <span className={`font-semibold ${e.statut==='en_retard'?'text-red-700':'text-zinc-700'}`}>{e.date_echeance}</span>
                        <span className="font-tabular font-bold text-zinc-800">{fmt(parseFloat(e.montant)-(parseFloat(e.montant_paye)||0))}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${e.statut==='en_retard'?'bg-red-100 text-red-600':e.statut==='partiellement_payee'?'bg-amber-100 text-amber-700':'bg-blue-100 text-blue-600'}`}>
                          {e.statut==='en_retard'?'En retard':e.statut==='partiellement_payee'?'Partiel':'À venir'}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Relances history (compact) */}
            {clientRelances.length>0&&(
              <div className="px-5 py-3 border-t border-white/50 bg-white/20">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-2">Historique relances</p>
                <div className="space-y-1">
                  {clientRelances.map((r:any)=>{
                    const RT=RELANCE_TYPES.find(x=>x.val===r.type_relance);
                    return (
                      <div key={r.id} className="flex items-start gap-2 text-xs">
                        {RT&&<RT.icon size={11} className="text-zinc-400 mt-0.5 shrink-0"/>}
                        <span className="text-zinc-400 shrink-0 font-tabular">{r.date_relance}</span>
                        <span className="text-zinc-600 truncate">{r.commentaire}</span>
                        {r.resultat&&<span className="text-zinc-400 italic shrink-0">→ {r.resultat}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Paiements history (compact) */}
            {clientPaiements.length>0&&(
              <div className="px-5 py-3 border-t border-white/50 bg-white/20">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-2">Derniers paiements</p>
                <div className="flex gap-3 flex-wrap">
                  {clientPaiements.map((p:any)=>(
                    <div key={p.id} className="flex items-center gap-1.5 text-xs bg-white/60 rounded-lg px-2 py-1">
                      <CreditCard size={10} className="text-teal-600"/>
                      <span className="font-mono text-zinc-600">{p.numero}</span>
                      <span className="font-bold text-teal-700 font-tabular">{fmt(p.montant)}</span>
                      <span className="text-zinc-400">{p.date_paiement}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Relance Modal */}
      {showRelance&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-zinc-900">Nouvelle relance</h2>
                <p className="text-xs text-zinc-500">{showRelance.client_nom} · Dû: {fmt(showRelance.totalDu)}</p>
              </div>
              <button onClick={()=>setShowRelance(null)}><X size={18} className="text-zinc-400"/></button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-2">Type</label>
              <div className="grid grid-cols-5 gap-2">
                {RELANCE_TYPES.map(t=>(
                  <button key={t.val} type="button" onClick={()=>setTypeRelance(t.val)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 text-xs transition-all ${typeRelance===t.val?'border-teal-500 bg-teal-50 text-teal-700':'border-zinc-200 text-zinc-500 hover:border-zinc-300'}`}>
                    <t.icon size={14}/>{t.label}
                  </button>
                ))}
              </div>
            </div>
            <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Commentaire *</label><textarea rows={3} className="form-input resize-none" value={commentaire} onChange={e=>setCommentaire(e.target.value)} placeholder="Discussion, promesse de paiement..."/></div>
            <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Résultat</label><input className="form-input" value={resultat} onChange={e=>setResultat(e.target.value)} placeholder="Promesse virement le..."/></div>
            <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Prochaine action le</label><input type="date" className="form-input" value={prochaineAction} onChange={e=>setProchaineAction(e.target.value)}/></div>
            <div className="flex gap-3">
              <button onClick={()=>setShowRelance(null)} className="flex-1 px-4 py-2 text-sm border border-zinc-200 rounded-lg text-zinc-600 font-medium">Annuler</button>
              <button onClick={handleRelance} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-60">
                {saving&&<Loader2 size={14} className="animate-spin"/>} Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Facture detail modal */}
      {showFactureDetail&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-semibold text-zinc-900">Détail — {showFactureDetail.facture.numero_facture}</h2>
                <p className="text-xs text-zinc-500">{showFactureDetail.facture.client_nom}</p>
              </div>
              <button onClick={()=>setShowFactureDetail(null)}><X size={18} className="text-zinc-400"/></button>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Résumé facture */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-50 rounded-xl p-3 text-center"><p className="text-xs text-zinc-500">Total TTC</p><p className="font-bold font-tabular text-zinc-800">{fmt(showFactureDetail.facture.montant_ttc)}</p></div>
                <div className="bg-green-50 rounded-xl p-3 text-center"><p className="text-xs text-zinc-500">Payé</p><p className="font-bold font-tabular text-green-700">{fmt(showFactureDetail.facture.montant_paye||0)}</p></div>
                <div className="bg-red-50 rounded-xl p-3 text-center"><p className="text-xs text-zinc-500">Restant</p><p className="font-bold font-tabular text-red-700">{fmt(showFactureDetail.facture.montant_restant||showFactureDetail.facture.montant_ttc)}</p></div>
              </div>
              {/* Échéances */}
              {showFactureDetail.echeances.length>0&&(
                <div>
                  <h3 className="text-xs font-bold text-zinc-700 mb-2 flex items-center gap-1.5"><Calendar size={13}/> Échéances</h3>
                  <div className="space-y-1.5">
                    {showFactureDetail.echeances.map((e:any)=>(
                      <div key={e.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-100 text-xs">
                        <span className="text-zinc-500 shrink-0">#{e.numero_echeance} · {e.date_echeance}</span>
                        <span className="font-bold font-tabular text-zinc-800">{fmt(e.montant)}</span>
                        {(parseFloat(e.montant_paye)||0)>0&&<span className="text-green-600">payé: {fmt(e.montant_paye)}</span>}
                        <span className={`ml-auto px-1.5 py-0.5 rounded-full font-semibold text-[10px] ${e.statut==='payee'?'bg-green-100 text-green-700':e.statut==='en_retard'?'bg-red-100 text-red-700':'bg-blue-100 text-blue-700'}`}>
                          {e.statut==='payee'?'Payée':e.statut==='en_retard'?'Retard':'À venir'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Paiements */}
              {showFactureDetail.paiements.length>0&&(
                <div>
                  <h3 className="text-xs font-bold text-zinc-700 mb-2 flex items-center gap-1.5"><CreditCard size={13}/> Paiements reçus</h3>
                  <div className="space-y-1.5">
                    {showFactureDetail.paiements.map((p:any)=>(
                      <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-teal-50 border border-teal-100 text-xs">
                        <span className="font-mono font-semibold text-teal-700">{p.numero}</span>
                        <span className="text-zinc-500">{p.date_paiement}</span>
                        <span className="font-bold font-tabular text-teal-700 ml-auto">{fmt(p.montant)}</span>
                        <span className="text-zinc-400 capitalize">{p.mode_paiement}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Relances */}
              {showFactureDetail.relances.length>0&&(
                <div>
                  <h3 className="text-xs font-bold text-zinc-700 mb-2 flex items-center gap-1.5"><Phone size={13}/> Relances</h3>
                  <div className="space-y-1.5">
                    {showFactureDetail.relances.map((r:any)=>{
                      const RT=RELANCE_TYPES.find(x=>x.val===r.type_relance);
                      return (
                        <div key={r.id} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-100 text-xs">
                          {RT&&<RT.icon size={11} className="text-zinc-400 mt-0.5 shrink-0"/>}
                          <span className="text-zinc-400 shrink-0">{r.date_relance}</span>
                          <span className="text-zinc-600">{r.commentaire}</span>
                          {r.resultat&&<span className="text-zinc-400 italic ml-auto shrink-0">→ {r.resultat}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
