'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import RoleGuard from '@/components/RoleGuard';
import { createClient } from '@/lib/supabase/client';
import { Plus, Search, X, Truck, Edit2, Trash2, Loader2, CheckCircle, AlertCircle, Building2 } from 'lucide-react';

export const FOURNISSEUR_TYPES: Record<string, { label: string; color: string; desc: string }> = {
  matiere_premiere: { label: 'Matière première', color: 'bg-amber-100 text-amber-700',  desc: 'Fruits, sucres, ingrédients, conservateurs' },
  emballage:        { label: 'Emballage',         color: 'bg-blue-100 text-blue-700',   desc: 'Bouteilles, cartons, bouchons, étiquettes' },
  consommable:      { label: 'Consommable',        color: 'bg-purple-100 text-purple-700',desc: 'Fournitures labo, gants, réactifs' },
  bureautique:      { label: 'Bureautique',        color: 'bg-zinc-100 text-zinc-600',   desc: 'Papeterie, fournitures de bureau' },
  equipement:       { label: 'Équipement',         color: 'bg-teal-100 text-teal-700',   desc: 'Machines, matériel de production, labo' },
  service:          { label: 'Service',            color: 'bg-green-100 text-green-700', desc: 'Transport, maintenance, sous-traitance' },
  autre:            { label: 'Autre',              color: 'bg-zinc-100 text-zinc-500',   desc: '' },
};

const emptyForm = () => ({
  nom:'', contact:'', email:'', telephone:'', adresse:'',
  type_fournisseur:'matiere_premiere', categorie:'fruits', actif:true,
});

export default function GestionFournisseursPage() {
  return <AppLayout><RoleGuard permission="canManageDirection"><FournisseursContent /></RoleGuard></AppLayout>;
}

function FournisseursContent() {
  const supabase = useMemo(() => createClient(), []);
  const [list, setList]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm]       = useState(emptyForm());
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState({ type:'', text:'' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('fournisseurs').select('*').order('type_fournisseur').order('nom');
    if (data) setList(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setShowModal(true); };
  const openEdit   = (f: any) => {
    setEditing(f);
    setForm({ nom:f.nom||'', contact:f.contact||'', email:f.email||'', telephone:f.telephone||'',
      adresse:f.adresse||'', type_fournisseur:f.type_fournisseur||'autre', categorie:f.categorie||'autre', actif:f.actif!==false });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nom.trim()) { setMsg({type:'err',text:'Nom obligatoire.'}); return; }
    setSaving(true);
    editing ? await supabase.from('fournisseurs').update(form).eq('id', editing.id)
            : await supabase.from('fournisseurs').insert([form]);
    setMsg({type:'ok',text:editing?'Fournisseur modifié.':'Fournisseur créé.'});
    setSaving(false); setShowModal(false); fetchAll();
    setTimeout(()=>setMsg({type:'',text:''}),3000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce fournisseur ?')) return;
    await supabase.from('fournisseurs').delete().eq('id', id);
    fetchAll();
  };

  const filtered = list.filter(f =>
    (filterType==='all'||f.type_fournisseur===filterType) &&
    (search===''||f.nom?.toLowerCase().includes(search.toLowerCase())||f.contact?.toLowerCase().includes(search.toLowerCase()))
  );

  const counts: Record<string,number> = {};
  list.forEach(f=>{ counts[f.type_fournisseur||'autre']=(counts[f.type_fournisseur||'autre']||0)+1; });

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2"><Truck size={20} className="text-teal-600"/> Gestion des Fournisseurs</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Matières premières · Emballages · Équipements · Services</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">
          <Plus size={15}/> Nouveau fournisseur
        </button>
      </div>

      {msg.text&&<div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm border ${msg.type==='ok'?'bg-emerald-50 border-emerald-200 text-emerald-700':'bg-red-50 border-red-200 text-red-700'}`}>{msg.type==='ok'?<CheckCircle size={15}/>:<AlertCircle size={15}/>} {msg.text}</div>}

      {/* Type filter chips */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={()=>setFilterType('all')} className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${filterType==='all'?'bg-zinc-800 text-white border-zinc-800':'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'}`}>
          Tous ({list.length})
        </button>
        {Object.entries(FOURNISSEUR_TYPES).map(([type,cfg])=>(
          counts[type]>0&&(
            <button key={type} onClick={()=>setFilterType(type)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${filterType===type?`${cfg.color} border-current`:'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'}`}>
              {cfg.label} ({counts[type]||0})
            </button>
          )
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"/>
        <input className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-teal-500"
          placeholder="Nom, contact..." value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {loading?<div className="flex items-center justify-center py-16 gap-2 text-zinc-400"><Loader2 size={18} className="animate-spin"/></div>:(
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-100">
                <tr>{['Fournisseur','Type','Contact','Téléphone','Email','Statut','Actions'].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map(f=>{
                  const typeCfg = FOURNISSEUR_TYPES[f.type_fournisseur]||FOURNISSEUR_TYPES.autre;
                  return (
                    <tr key={f.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 font-medium text-zinc-800">{f.nom}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${typeCfg.color}`}>{typeCfg.label}</span>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 text-xs">{f.contact||'—'}</td>
                      <td className="px-4 py-3 text-zinc-600 text-xs">{f.telephone||'—'}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{f.email||'—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${f.actif!==false?'bg-green-100 text-green-700':'bg-zinc-100 text-zinc-500'}`}>
                          {f.actif!==false?'Actif':'Inactif'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={()=>openEdit(f)} className="p-1.5 rounded text-zinc-400 hover:text-teal-600 hover:bg-teal-50"><Edit2 size={13}/></button>
                          <button onClick={()=>handleDelete(f.id)} className="p-1.5 rounded text-zinc-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={13}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length===0&&<tr><td colSpan={7} className="py-12 text-center text-zinc-400 text-sm">Aucun fournisseur</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 sticky top-0 bg-white z-10">
              <h2 className="font-semibold text-zinc-900">{editing?'Modifier':'Nouveau'} fournisseur</h2>
              <button onClick={()=>setShowModal(false)}><X size={18} className="text-zinc-400"/></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {msg.type==='err'&&<div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{msg.text}</div>}

              {/* Type selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-2">Catégorie fournisseur *</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(FOURNISSEUR_TYPES).map(([type,cfg])=>(
                    <button key={type} type="button" onClick={()=>setForm(f=>({...f,type_fournisseur:type}))}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-left transition-all ${form.type_fournisseur===type?`${cfg.color} border-current`:'border-zinc-200 text-zinc-400 hover:border-zinc-300'}`}>
                      <Truck size={13} className="shrink-0"/>
                      <div>
                        <p className="text-xs font-semibold">{cfg.label}</p>
                        {cfg.desc&&<p className="text-[10px] opacity-70 leading-tight">{cfg.desc}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Raison sociale / Nom *</label><input className="form-input" value={form.nom} onChange={e=>setForm(f=>({...f,nom:e.target.value}))}/></div>
                <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Contact</label><input className="form-input" value={form.contact} onChange={e=>setForm(f=>({...f,contact:e.target.value}))}/></div>
                <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Téléphone</label><input className="form-input" value={form.telephone} onChange={e=>setForm(f=>({...f,telephone:e.target.value}))}/></div>
                <div className="col-span-2"><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Email</label><input type="email" className="form-input" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></div>
                <div className="col-span-2"><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Adresse</label><textarea rows={2} className="form-input resize-none" value={form.adresse} onChange={e=>setForm(f=>({...f,adresse:e.target.value}))}/></div>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={()=>setForm(f=>({...f,actif:!f.actif}))} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.actif?'bg-teal-500':'bg-zinc-300'}`}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${form.actif?'translate-x-4':'translate-x-1'}`}/>
                </button>
                <span className="text-sm text-zinc-700">Fournisseur {form.actif?'actif':'inactif'}</span>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t sticky bottom-0 bg-white">
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
