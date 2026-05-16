'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import RoleGuard from '@/components/RoleGuard';
import { createClient } from '@/lib/supabase/client';
import { Plus, Search, X, FileText, ArrowRight, Edit2, Trash2, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import LignesEditor, { Ligne, newLigne, calcTotaux } from '@/components/LignesEditor';

const STATUTS = [
  { val: 'brouillon', label: 'Brouillon',  cls: 'bg-zinc-100 text-zinc-600' },
  { val: 'envoye',    label: 'Envoyé',     cls: 'bg-blue-100 text-blue-700' },
  { val: 'accepte',   label: 'Accepté',    cls: 'bg-green-100 text-green-700' },
  { val: 'refuse',    label: 'Refusé',     cls: 'bg-red-100 text-red-700' },
  { val: 'expire',    label: 'Expiré',     cls: 'bg-orange-100 text-orange-700' },
];

const today    = () => new Date().toISOString().split('T')[0];
const addDays  = (d: number) => new Date(Date.now() + d * 86400000).toISOString().split('T')[0];
const numGen   = (p: string) => `${p}-${new Date().getFullYear()}-${Math.floor(Math.random()*900+100)}`;
const fmt      = (n: number, d = 'TND') => `${Number(n).toFixed(3)} ${d}`;

export default function DevisPage() {
  return <AppLayout><RoleGuard permission="canAccessFacturation"><DevisContent /></RoleGuard></AppLayout>;
}

function DevisContent() {
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

  // Form state
  const [clientNom, setClientNom] = useState('');
  const [clientId, setClientId]   = useState('');
  const [dateDevis, setDateDevis] = useState(today());
  const [dateVal, setDateVal]     = useState(addDays(30));
  const [statut, setStatut]       = useState('brouillon');
  const [notes, setNotes]         = useState('');
  const [lignes, setLignes]       = useState<Ligne[]>([newLigne()]);

  const resetForm = () => {
    setClientNom(''); setClientId(''); setDateDevis(today());
    setDateVal(addDays(30)); setStatut('brouillon'); setNotes('');
    setLignes([newLigne()]);
  };

  const openCreate = () => { setEditing(null); resetForm(); setShowModal(true); };
  const openEdit   = (d: any) => {
    setEditing(d);
    setClientNom(d.client_nom || ''); setClientId(d.client_id || '');
    setDateDevis(d.date_devis || today()); setDateVal(d.date_validite || addDays(30));
    setStatut(d.statut || 'brouillon'); setNotes(d.notes || '');
    const savedLignes = Array.isArray(d.lignes) && d.lignes.length > 0 ? d.lignes : [newLigne()];
    setLignes(savedLignes.map((l: any) => ({ ...l, _id: l._id || crypto.randomUUID() })));
    setShowModal(true);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [dRes, cRes, pRes, paramRes] = await Promise.all([
      supabase.from('devis').select('*').order('created_at', { ascending: false }),
      supabase.from('clients').select('id,nom').eq('actif', true).order('nom'),
      supabase.from('produits').select('id,nom,prix_unitaire').eq('actif', true).order('nom'),
      supabase.from('parametres').select('cle,valeur'),
    ]);
    if (dRes.data) setList(dRes.data);
    if (cRes.data) setClients(cRes.data);
    if (pRes.data) setProduits(pRes.data);
    if (paramRes.data) {
      const m: any = {};
      (paramRes.data as any[]).forEach((p: any) => { m[p.cle] = p.valeur; });
      setParams({ fodec: parseFloat(m.fodec||'1'), timbre: parseFloat(m.timbre_fiscal||'1'), devise: m.devise||'TND' });
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSave = async () => {
    if (!clientNom || lignes.some(l => !l.produit)) {
      setMsg({ type: 'err', text: 'Client et produit(s) obligatoires.' }); return;
    }
    setSaving(true);
    const { totHT, totFodec, totTVA, ttc } = calcTotaux(lignes, params);
    const first = lignes[0];
    const data = {
      numero: editing?.numero || numGen('DEV'),
      client_id: clientId, client_nom: clientNom,
      date_devis: dateDevis, date_validite: dateVal, statut, notes,
      lignes: lignes.map(({ _id, ...rest }) => rest),
      // Résumé first line pour affichage tableau
      produit: lignes.map(l => l.produit).join(', '),
      quantite: first.quantite, prix_unitaire_ht: first.prix_unitaire_ht, taux_tva: first.taux_tva,
      remise: first.remise, fodec: totFodec, timbre: params.timbre,
      montant_ht: totHT, montant_tva: totTVA, montant_ttc: ttc,
    };
    editing ? await supabase.from('devis').update(data).eq('id', editing.id)
            : await supabase.from('devis').insert([data]);
    setMsg({ type: 'ok', text: editing ? 'Devis modifié.' : 'Devis créé.' });
    setSaving(false); setShowModal(false); fetchAll();
    setTimeout(() => setMsg({ type: '', text: '' }), 3000);
  };

  const handleConvert = async (devis: any) => {
    setConverting(devis.id);
    const bcData = {
      numero: numGen('BC'), devis_id: devis.id,
      client_id: devis.client_id, client_nom: devis.client_nom,
      date_commande: today(), date_livraison_souhaitee: addDays(14),
      lignes: devis.lignes,
      produit: devis.produit, quantite: devis.quantite,
      prix_unitaire_ht: devis.prix_unitaire_ht, taux_tva: devis.taux_tva,
      remise: devis.remise, fodec: devis.fodec, timbre: devis.timbre,
      montant_ht: devis.montant_ht, montant_tva: devis.montant_tva, montant_ttc: devis.montant_ttc,
      statut: 'en_attente', notes: `Issu du devis ${devis.numero}`,
    };
    await Promise.all([
      supabase.from('bons_commande').insert([bcData]),
      supabase.from('devis').update({ statut: 'accepte' }).eq('id', devis.id),
    ]);
    setConverting(null);
    setMsg({ type: 'ok', text: `BC ${bcData.numero} créé depuis ${devis.numero}` });
    fetchAll(); setTimeout(() => setMsg({ type: '', text: '' }), 4000);
  };

  const filtered = list.filter(d =>
    (filterStatut === 'all' || d.statut === filterStatut) &&
    (search === '' || d.client_nom?.toLowerCase().includes(search.toLowerCase()) || d.numero?.includes(search))
  );
  const st = (s: string) => STATUTS.find(x => x.val === s) || STATUTS[0];

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2"><FileText size={20} className="text-teal-600" /> Devis</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Étape 1/4 — <span className="text-zinc-400">Devis</span> <ArrowRight size={12} className="inline" /> BC <ArrowRight size={12} className="inline" /> BL <ArrowRight size={12} className="inline" /> Facture</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">
          <Plus size={15} /> Nouveau devis
        </button>
      </div>

      {msg.text && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm border ${msg.type==='ok'?'bg-emerald-50 border-emerald-200 text-emerald-700':'bg-red-50 border-red-200 text-red-700'}`}>
          {msg.type==='ok'?<CheckCircle size={15}/>:<AlertCircle size={15}/>} {msg.text}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"/>
          <input className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-teal-500"
            placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white" value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
          <option value="all">Tous les statuts</option>
          {STATUTS.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-16 gap-2 text-zinc-400"><Loader2 size={18} className="animate-spin"/> Chargement...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-100">
                <tr>{['Numéro','Client','Produits','Lignes','Total TTC','Validité','Statut','Actions'].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map(d => (
                  <tr key={d.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-zinc-700">{d.numero}</td>
                    <td className="px-4 py-3 font-medium text-zinc-800">{d.client_nom}</td>
                    <td className="px-4 py-3 text-zinc-600 max-w-[160px] truncate text-xs">{d.produit}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full font-medium">
                        {Array.isArray(d.lignes) ? d.lignes.length : 1} ligne{(Array.isArray(d.lignes) ? d.lignes.length : 1)>1?'s':''}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold font-tabular text-zinc-800">{fmt(d.montant_ttc, params.devise)}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">{d.date_validite}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${st(d.statut).cls}`}>{st(d.statut).label}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(d)} className="p-1.5 rounded text-zinc-400 hover:text-teal-600 hover:bg-teal-50"><Edit2 size={13}/></button>
                        <button onClick={async()=>{if(!confirm('Supprimer ?'))return;await supabase.from('devis').delete().eq('id',d.id);fetchAll();}} className="p-1.5 rounded text-zinc-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={13}/></button>
                        {['brouillon','envoye','accepte'].includes(d.statut) && (
                          <button onClick={()=>handleConvert(d)} disabled={converting===d.id}
                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold bg-blue-50 border border-blue-200 text-blue-700 rounded hover:bg-blue-100">
                            {converting===d.id?<Loader2 size={11} className="animate-spin"/>:<ArrowRight size={11}/>} → BC
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length===0 && <tr><td colSpan={8} className="py-12 text-center text-zinc-400 text-sm">Aucun devis</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 sticky top-0 bg-white z-10">
              <h2 className="text-base font-semibold text-zinc-900">{editing?'Modifier le devis':'Nouveau devis'}</h2>
              <button onClick={()=>setShowModal(false)} className="text-zinc-400 hover:text-zinc-600"><X size={18}/></button>
            </div>
            <div className="px-6 py-5 space-y-5">
              {msg.type==='err' && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{msg.text}</div>}

              {/* Header info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Client *</label>
                  <select className="form-select" value={clientNom} onChange={e=>{const c=clients.find(x=>x.nom===e.target.value);setClientNom(e.target.value);setClientId(c?.id||'');}}>
                    <option value="">Sélectionner un client</option>
                    {clients.map(c=><option key={c.id} value={c.nom}>{c.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Statut</label>
                  <select className="form-select" value={statut} onChange={e=>setStatut(e.target.value)}>
                    {STATUTS.map(s=><option key={s.val} value={s.val}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Date devis</label>
                  <input type="date" className="form-input" value={dateDevis} onChange={e=>setDateDevis(e.target.value)}/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Date validité</label>
                  <input type="date" className="form-input" value={dateVal} onChange={e=>setDateVal(e.target.value)}/>
                </div>
              </div>

              {/* Lignes */}
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-2">Lignes du devis *</label>
                <LignesEditor lignes={lignes} onChange={setLignes} produits={produits} params={params} typeFilter="produit_fini"/>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Notes</label>
                <textarea rows={2} className="form-input resize-none" value={notes} onChange={e=>setNotes(e.target.value)}/>
              </div>
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
