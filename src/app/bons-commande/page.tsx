'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import RoleGuard from '@/components/RoleGuard';
import { createClient } from '@/lib/supabase/client';
import { Plus, Search, X, ShoppingCart, ArrowRight, Edit2, Trash2, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import LignesEditor, { Ligne, newLigne, calcTotaux } from '@/components/LignesEditor';

const STATUTS = [
  { val: 'en_attente',     label: 'En attente',     cls: 'bg-yellow-100 text-yellow-700' },
  { val: 'confirme',       label: 'Confirmé',       cls: 'bg-blue-100 text-blue-700' },
  { val: 'en_preparation', label: 'En préparation', cls: 'bg-purple-100 text-purple-700' },
  { val: 'expedie',        label: 'Expédié',        cls: 'bg-teal-100 text-teal-700' },
  { val: 'annule',         label: 'Annulé',         cls: 'bg-red-100 text-red-700' },
];

const today   = () => new Date().toISOString().split('T')[0];
const addDays = (d: number) => new Date(Date.now() + d * 86400000).toISOString().split('T')[0];
const numGen  = (p: string) => `${p}-${new Date().getFullYear()}-${Math.floor(Math.random()*900+100)}`;
const fmt     = (n: number, d = 'TND') => `${Number(n).toFixed(3)} ${d}`;

export default function BonsCommandePage() {
  return <AppLayout><RoleGuard permission="canAccessFacturation"><BCContent /></RoleGuard></AppLayout>;
}

function BCContent() {
  const supabase = useMemo(() => createClient(), []);
  const [list, setList]       = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [produits, setProduits] = useState<any[]>([]);
  const [params, setParams]   = useState({ fodec: 1, timbre: 1, devise: 'TND' });
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [filterStatut, setFilterStatut] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving]   = useState(false);
  const [converting, setConverting] = useState<string | null>(null);
  const [msg, setMsg]         = useState({ type: '', text: '' });

  const [clientNom, setClientNom]   = useState('');
  const [clientId, setClientId]     = useState('');
  const [dateCmd, setDateCmd]       = useState(today());
  const [dateLiv, setDateLiv]       = useState(addDays(14));
  const [statut, setStatut]         = useState('en_attente');
  const [notes, setNotes]           = useState('');
  const [lignes, setLignes]         = useState<Ligne[]>([newLigne()]);

  const resetForm = () => { setClientNom('');setClientId('');setDateCmd(today());setDateLiv(addDays(14));setStatut('en_attente');setNotes('');setLignes([newLigne()]); };

  const openCreate = () => { setEditing(null); resetForm(); setShowModal(true); };
  const openEdit   = (d: any) => {
    setEditing(d);
    setClientNom(d.client_nom||''); setClientId(d.client_id||'');
    setDateCmd(d.date_commande||today()); setDateLiv(d.date_livraison_souhaitee||addDays(14));
    setStatut(d.statut||'en_attente'); setNotes(d.notes||'');
    const saved = Array.isArray(d.lignes)&&d.lignes.length>0 ? d.lignes : [newLigne()];
    setLignes(saved.map((l: any)=>({...l, _id:l._id||crypto.randomUUID()})));
    setShowModal(true);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [bRes,cRes,pRes,paramRes] = await Promise.all([
      supabase.from('bons_commande').select('*').order('created_at',{ascending:false}),
      supabase.from('clients').select('id,nom').eq('actif',true).order('nom'),
      supabase.from('produits').select('id,nom,prix_unitaire').eq('actif',true).order('nom'),
      supabase.from('parametres').select('cle,valeur'),
    ]);
    if(bRes.data) setList(bRes.data);
    if(cRes.data) setClients(cRes.data);
    if(pRes.data) setProduits(pRes.data);
    if(paramRes.data){const m:any={};(paramRes.data as any[]).forEach((p:any)=>{m[p.cle]=p.valeur;});setParams({fodec:parseFloat(m.fodec||'1'),timbre:parseFloat(m.timbre_fiscal||'1'),devise:m.devise||'TND'});}
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSave = async () => {
    if(!clientNom||lignes.some(l=>!l.produit)){setMsg({type:'err',text:'Client et produit(s) obligatoires.'});return;}
    setSaving(true);
    const {totHT,totFodec,totTVA,ttc} = calcTotaux(lignes,params);
    const first = lignes[0];
    const data = {
      numero: editing?.numero||numGen('BC'), client_id:clientId, client_nom:clientNom,
      date_commande:dateCmd, date_livraison_souhaitee:dateLiv, statut, notes,
      lignes: lignes.map(({_id,...r})=>r),
      produit: lignes.map(l=>l.produit).join(', '),
      quantite:first.quantite, prix_unitaire_ht:first.prix_unitaire_ht, taux_tva:first.taux_tva,
      remise:first.remise, fodec:totFodec, timbre:params.timbre,
      montant_ht:totHT, montant_tva:totTVA, montant_ttc:ttc,
    };
    editing ? await supabase.from('bons_commande').update(data).eq('id',editing.id)
            : await supabase.from('bons_commande').insert([data]);
    setMsg({type:'ok',text:editing?'BC modifié.':'BC créé.'});
    setSaving(false);setShowModal(false);fetchAll();setTimeout(()=>setMsg({type:'',text:''}),3000);
  };

  const handleConvert = async (bc: any) => {
    setConverting(bc.id);
    const blData = {
      numero:numGen('BL'), bon_commande_id:bc.id, client_id:bc.client_id, client_nom:bc.client_nom,
      date_livraison:addDays(3),
      lignes: bc.lignes,
      produit:bc.produit, quantite_commandee:bc.quantite, quantite_livree:bc.quantite,
      prix_unitaire_ht:bc.prix_unitaire_ht, taux_tva:bc.taux_tva,
      montant_ht:bc.montant_ht, montant_ttc:bc.montant_ttc,
      statut:'prepare', notes:`Issu du BC ${bc.numero}`,
    };
    await Promise.all([
      supabase.from('bons_livraison').insert([blData]),
      supabase.from('bons_commande').update({statut:'expedie'}).eq('id',bc.id),
    ]);
    setConverting(null);
    setMsg({type:'ok',text:`BL ${blData.numero} créé.`});
    fetchAll();setTimeout(()=>setMsg({type:'',text:''}),4000);
  };

  const filtered = list.filter(d=>(filterStatut==='all'||d.statut===filterStatut)&&(search===''||d.client_nom?.toLowerCase().includes(search.toLowerCase())||d.numero?.includes(search)));
  const st = (s:string) => STATUTS.find(x=>x.val===s)||STATUTS[0];

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2"><ShoppingCart size={20} className="text-teal-600"/> Bons de commande</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Étape 2/4 — Devis <ArrowRight size={12} className="inline"/> <span className="font-medium text-zinc-800">BC</span> <ArrowRight size={12} className="inline"/> BL <ArrowRight size={12} className="inline"/> Facture</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700"><Plus size={15}/> Nouveau BC</button>
      </div>

      {msg.text&&<div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm border ${msg.type==='ok'?'bg-emerald-50 border-emerald-200 text-emerald-700':'bg-red-50 border-red-200 text-red-700'}`}>{msg.type==='ok'?<CheckCircle size={15}/>:<AlertCircle size={15}/>} {msg.text}</div>}

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"/><input className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-teal-500" placeholder="Rechercher..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <select className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white" value={filterStatut} onChange={e=>setFilterStatut(e.target.value)}>
          <option value="all">Tous les statuts</option>{STATUTS.map(s=><option key={s.val} value={s.val}>{s.label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {loading?<div className="flex items-center justify-center py-16 gap-2 text-zinc-400"><Loader2 size={18} className="animate-spin"/> Chargement...</div>:(
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-100"><tr>{['Numéro','Devis lié','Client','Produits','Lignes','Total TTC','Livraison','Statut','Actions'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map(d=>(
                  <tr key={d.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-zinc-700">{d.numero}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{d.devis_id?'✓ Lié':'—'}</td>
                    <td className="px-4 py-3 font-medium text-zinc-800">{d.client_nom}</td>
                    <td className="px-4 py-3 text-zinc-600 max-w-[140px] truncate text-xs">{d.produit}</td>
                    <td className="px-4 py-3 text-center"><span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full font-medium">{Array.isArray(d.lignes)?d.lignes.length:1} ligne{(Array.isArray(d.lignes)?d.lignes.length:1)>1?'s':''}</span></td>
                    <td className="px-4 py-3 font-bold font-tabular">{fmt(d.montant_ttc,params.devise)}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">{d.date_livraison_souhaitee}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${st(d.statut).cls}`}>{st(d.statut).label}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={()=>openEdit(d)} className="p-1.5 rounded text-zinc-400 hover:text-teal-600 hover:bg-teal-50"><Edit2 size={13}/></button>
                        <button onClick={async()=>{if(!confirm('Supprimer ?'))return;await supabase.from('bons_commande').delete().eq('id',d.id);fetchAll();}} className="p-1.5 rounded text-zinc-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={13}/></button>
                        {['en_attente','confirme','en_preparation'].includes(d.statut)&&(
                          <button onClick={()=>handleConvert(d)} disabled={converting===d.id} className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold bg-purple-50 border border-purple-200 text-purple-700 rounded hover:bg-purple-100">
                            {converting===d.id?<Loader2 size={11} className="animate-spin"/>:<ArrowRight size={11}/>} → BL
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length===0&&<tr><td colSpan={9} className="py-12 text-center text-zinc-400 text-sm">Aucun bon de commande</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 sticky top-0 bg-white z-10">
              <h2 className="text-base font-semibold text-zinc-900">{editing?'Modifier le BC':'Nouveau bon de commande'}</h2>
              <button onClick={()=>setShowModal(false)} className="text-zinc-400 hover:text-zinc-600"><X size={18}/></button>
            </div>
            <div className="px-6 py-5 space-y-5">
              {msg.type==='err'&&<div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{msg.text}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Client *</label>
                  <select className="form-select" value={clientNom} onChange={e=>{const c=clients.find(x=>x.nom===e.target.value);setClientNom(e.target.value);setClientId(c?.id||'');}}>
                    <option value="">Sélectionner</option>{clients.map(c=><option key={c.id} value={c.nom}>{c.nom}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Statut</label>
                  <select className="form-select" value={statut} onChange={e=>setStatut(e.target.value)}>{STATUTS.map(s=><option key={s.val} value={s.val}>{s.label}</option>)}</select>
                </div>
                <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Date commande</label><input type="date" className="form-input" value={dateCmd} onChange={e=>setDateCmd(e.target.value)}/></div>
                <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Livraison souhaitée</label><input type="date" className="form-input" value={dateLiv} onChange={e=>setDateLiv(e.target.value)}/></div>
              </div>
              <div><label className="block text-xs font-semibold text-zinc-600 mb-2">Lignes *</label>
                <LignesEditor lignes={lignes} onChange={setLignes} produits={produits} params={params} typeFilter="produit_fini"/>
              </div>
              <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Notes</label><textarea rows={2} className="form-input resize-none" value={notes} onChange={e=>setNotes(e.target.value)}/></div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-100 sticky bottom-0 bg-white">
              <button onClick={()=>setShowModal(false)} className="px-4 py-2 text-sm text-zinc-600 font-medium">Annuler</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-60">
                {saving&&<Loader2 size={14} className="animate-spin"/>}{editing?'Enregistrer':'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
