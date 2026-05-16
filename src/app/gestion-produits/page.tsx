'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import RoleGuard from '@/components/RoleGuard';
import { createClient } from '@/lib/supabase/client';
import { Plus, Search, X, Package, FlaskConical, Edit2, Trash2, Loader2, CheckCircle, AlertCircle, Truck } from 'lucide-react';

// ── Config types produits ────────────────────────────────────────────────────
const PROD_TYPES = {
  matiere_premiere: {
    label:'Matières premières', sublabel:'Qualité & Contrôle',
    icon:FlaskConical, color:'amber',
    categories:['fruits_frais','legumes','sucres_additifs','conservateurs','aromes_colorants',
      'eau_ingredients','emballages_primaires','emballages_secondaires',
      'produits_nettoyage','consommables_labo','materiel_labo','autre'],
    unites:['kg','litre','tonne','carton','palette','unité','flacon','bidon','sachet'],
    // Which supplier types are relevant
    fournisseurTypes:['matiere_premiere','emballage','consommable'],
  },
  produit_fini: {
    label:'Produits finis', sublabel:'Commercial',
    icon:Package, color:'teal',
    categories:['jus','smoothie','nectar','sirop','boisson_energetique','infusion','concentre','autre'],
    unites:['bouteille','carton','litre','palette','pack_6','pack_12','unité'],
    fournisseurTypes:['emballage','equipement','service'],
  },
  consommable: {
    label:'Consommables', sublabel:'Usage interne',
    icon:Package, color:'zinc',
    categories:['fournitures','entretien','securite','nettoyage','autre'],
    unites:['unité','boîte','rouleau','litre','kg','carton'],
    fournisseurTypes:['consommable','bureautique','service','autre'],
  },
} as const;

type TypeProduit = keyof typeof PROD_TYPES;

const CAT_LABELS: Record<string,string> = {
  fruits_frais:'Fruits frais',legumes:'Légumes',sucres_additifs:'Sucres & additifs',
  conservateurs:'Conservateurs',aromes_colorants:'Arômes & colorants',
  eau_ingredients:'Eau & ingrédients',emballages_primaires:'Emballages primaires',
  emballages_secondaires:'Emballages secondaires',produits_nettoyage:'Produits nettoyage',
  consommables_labo:'Consommables labo',materiel_labo:'Matériel labo',
  jus:'Jus',smoothie:'Smoothie',nectar:'Nectar',sirop:'Sirop',
  boisson_energetique:'Boisson énergétique',infusion:'Infusion',concentre:'Concentré',
  fournitures:'Fournitures',entretien:'Entretien',securite:'Sécurité',nettoyage:'Nettoyage',
  autre:'Autre',
};

const TAB_COLORS: Record<string,{active:string,btn:string,thead:string}> = {
  amber:{active:'border-amber-500 bg-amber-50 text-amber-700',btn:'bg-amber-500 hover:bg-amber-600 text-white',thead:'bg-amber-50'},
  teal: {active:'border-teal-500 bg-teal-50 text-teal-700',  btn:'bg-teal-600 hover:bg-teal-700 text-white',  thead:'bg-teal-50'},
  zinc: {active:'border-zinc-400 bg-zinc-100 text-zinc-700', btn:'bg-zinc-600 hover:bg-zinc-700 text-white',  thead:'bg-zinc-50'},
};

export default function GestionProduitsPage() {
  return <AppLayout><RoleGuard permission="canManageDirection"><ProduitsContent /></RoleGuard></AppLayout>;
}

function ProduitsContent() {
  const supabase = useMemo(() => createClient(), []);
  const [produits, setProduits]       = useState<any[]>([]);
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [activeType, setActiveType]   = useState<TypeProduit>('produit_fini');
  const [search, setSearch]           = useState('');
  const [showForm, setShowForm]       = useState(false);
  const [editing, setEditing]         = useState<any>(null);
  const [saving, setSaving]           = useState(false);
  const [msg, setMsg]                 = useState({ type:'', text:'' });

  // Form state
  const [typeProduit, setTypeProduit]   = useState<TypeProduit>('produit_fini');
  const [nom, setNom]                   = useState('');
  const [reference, setReference]       = useState('');
  const [categorie, setCategorie]       = useState('');
  const [description, setDescription]   = useState('');
  const [prixUnitaire, setPrixUnitaire] = useState('');
  const [unite, setUnite]               = useState('');
  const [stockActuel, setStockActuel]   = useState('0');
  const [stockMinimum, setStockMinimum] = useState('0');
  const [fournisseurId, setFournisseurId] = useState('');
  const [fournisseurNom, setFournisseurNom] = useState('');
  const [actif, setActif]               = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [pRes, fRes] = await Promise.all([
      supabase.from('produits').select('*').order('type_produit').order('nom'),
      supabase.from('fournisseurs').select('id,nom,type_fournisseur').eq('actif', true).order('nom'),
    ]);
    if (pRes.data) setProduits(pRes.data);
    if (fRes.data) setFournisseurs(fRes.data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Filtered fournisseurs based on current product type
  const relevantFournisseurs = useMemo(() => {
    const allowed = PROD_TYPES[typeProduit].fournisseurTypes as readonly string[];
    return fournisseurs.filter(f => allowed.includes(f.type_fournisseur || 'autre') || f.type_fournisseur === 'autre');
  }, [fournisseurs, typeProduit]);

  const resetForm = (type: TypeProduit = activeType) => {
    setTypeProduit(type); setNom(''); setReference(''); setCategorie('');
    setDescription(''); setPrixUnitaire(''); setUnite('');
    setStockActuel('0'); setStockMinimum('0');
    setFournisseurId(''); setFournisseurNom(''); setActif(true);
  };

  const openCreate = () => { setEditing(null); resetForm(); setShowForm(true); };
  const openEdit   = (p: any) => {
    setEditing(p);
    const t = (p.type_produit || 'produit_fini') as TypeProduit;
    setTypeProduit(t); setNom(p.nom||''); setReference(p.reference||'');
    setCategorie(p.categorie||''); setDescription(p.description||'');
    setPrixUnitaire(String(p.prix_unitaire||'')); setUnite(p.unite||'');
    setStockActuel(String(p.stock_actuel||0)); setStockMinimum(String(p.stock_minimum||0));
    setFournisseurId(p.fournisseur_id||''); setFournisseurNom(p.fournisseur_nom||'');
    setActif(p.actif!==false); setShowForm(true);
  };

  const handleSelectFournisseur = (id: string) => {
    setFournisseurId(id);
    const f = fournisseurs.find(x => x.id === id);
    setFournisseurNom(f?.nom || '');
  };

  const handleSave = async () => {
    if (!nom.trim()) { setMsg({type:'err',text:'Nom obligatoire.'}); return; }
    setSaving(true);
    const data = {
      type_produit: typeProduit, nom: nom.trim(), reference,
      categorie: categorie || 'autre', description,
      prix_unitaire: parseFloat(prixUnitaire)||0, unite,
      stock_actuel: parseFloat(stockActuel)||0,
      stock_minimum: parseFloat(stockMinimum)||0,
      fournisseur_id: fournisseurId||null,
      fournisseur_nom: fournisseurNom||null,
      actif,
    };
    if (editing) {
      const { error } = await supabase.from('produits').update(data).eq('id', editing.id);
      if (error) { setMsg({type:'err',text:error.message}); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('produits').insert([data]);
      if (error) { setMsg({type:'err',text:error.message}); setSaving(false); return; }
    }
    setMsg({type:'ok',text:editing?'Produit modifié.':'Produit créé.'});
    setSaving(false); setShowForm(false); fetchAll();
    setTimeout(()=>setMsg({type:'',text:''}),3000);
  };

  const typeCfg   = PROD_TYPES[activeType];
  const colorCfg  = TAB_COLORS[typeCfg.color];
  const TypeIcon  = typeCfg.icon;

  const filtered = produits.filter(p =>
    p.type_produit === activeType &&
    (search===''||p.nom?.toLowerCase().includes(search.toLowerCase())||p.reference?.toLowerCase().includes(search.toLowerCase()))
  );

  const counts = {
    matiere_premiere: produits.filter(p=>p.type_produit==='matiere_premiere').length,
    produit_fini:     produits.filter(p=>p.type_produit==='produit_fini').length,
    consommable:      produits.filter(p=>p.type_produit==='consommable').length,
  };

  const alertes = filtered.filter(p=>p.actif!==false&&parseFloat(p.stock_actuel||'0')<=parseFloat(p.stock_minimum||'0')).length;

  // Fournisseurs in form (filtered by type relevance)
  const formFournisseurs = useMemo(() => {
    const allowed = PROD_TYPES[typeProduit].fournisseurTypes as readonly string[];
    return fournisseurs.filter(f => allowed.includes(f.type_fournisseur||'autre') || !f.type_fournisseur);
  }, [fournisseurs, typeProduit]);

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Catalogue Produits</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Matières premières · Produits finis · Consommables</p>
        </div>
        <button onClick={openCreate} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${colorCfg.btn}`}>
          <Plus size={15}/> Nouveau
        </button>
      </div>

      {msg.text&&<div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm border ${msg.type==='ok'?'bg-emerald-50 border-emerald-200 text-emerald-700':'bg-red-50 border-red-200 text-red-700'}`}>{msg.type==='ok'?<CheckCircle size={15}/>:<AlertCircle size={15}/>} {msg.text}</div>}

      {/* Tabs */}
      <div className="flex gap-3">
        {(Object.entries(PROD_TYPES) as [TypeProduit, typeof PROD_TYPES[TypeProduit]][]).map(([type,cfg])=>{
          const Icon=cfg.icon; const isActive=activeType===type;
          return (
            <button key={type} onClick={()=>{setActiveType(type);setSearch('');}}
              className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${isActive?TAB_COLORS[cfg.color].active:'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300'}`}>
              <Icon size={20} className={isActive?'':'text-zinc-400'}/>
              <div>
                <p className="font-bold text-sm">{cfg.label}</p>
                <p className="text-[11px] opacity-70">{cfg.sublabel}</p>
                <p className="text-xs font-semibold mt-0.5">{counts[type]} article{counts[type]>1?'s':''}</p>
              </div>
            </button>
          );
        })}
      </div>

      {alertes>0&&<div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"><AlertCircle size={15}/><strong>{alertes} article{alertes>1?'s':''}</strong> sous le stock minimum.</div>}

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"/>
        <input className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-teal-500"
          placeholder="Nom, référence..." value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {loading?<div className="flex items-center justify-center py-16 gap-2 text-zinc-400"><Loader2 size={18} className="animate-spin"/></div>:(
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={`border-b ${colorCfg.thead}`}>
                <tr>{['Référence','Nom','Catégorie','Fournisseur principal','Prix unit.','Unité','Stock / Min','Statut','Actions'].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map(p=>{
                  const bas = p.actif!==false && parseFloat(p.stock_actuel||'0')<=parseFloat(p.stock_minimum||'0');
                  return (
                    <tr key={p.id} className={`hover:bg-zinc-50 ${bas?'bg-red-50/30':''}`}>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500">{p.reference||'—'}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-800">{p.nom}</p>
                        {bas&&<span className="text-[10px] text-red-500 font-semibold">⚠ Stock bas</span>}
                      </td>
                      <td className="px-4 py-3"><span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">{CAT_LABELS[p.categorie]||p.categorie||'—'}</span></td>
                      <td className="px-4 py-3">
                        {p.fournisseur_nom
                          ?<span className="flex items-center gap-1.5 text-xs text-zinc-600"><Truck size={11} className="text-zinc-400"/>{p.fournisseur_nom}</span>
                          :<span className="text-xs text-zinc-300">—</span>}
                      </td>
                      <td className="px-4 py-3 font-tabular text-xs text-zinc-700">{parseFloat(p.prix_unitaire||'0')>0?`${Number(p.prix_unitaire).toFixed(3)} TND`:'—'}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{p.unite||'—'}</td>
                      <td className="px-4 py-3 font-tabular text-xs">
                        <span className={`font-bold ${bas?'text-red-600':'text-zinc-800'}`}>{p.stock_actuel}</span>
                        <span className="text-zinc-300"> / </span>
                        <span className="text-zinc-400">{p.stock_minimum}</span>
                      </td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${p.actif!==false?'bg-green-100 text-green-700':'bg-zinc-100 text-zinc-500'}`}>{p.actif!==false?'Actif':'Inactif'}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={()=>openEdit(p)} className="p-1.5 rounded text-zinc-400 hover:text-teal-600 hover:bg-teal-50"><Edit2 size={13}/></button>
                          <button onClick={async()=>{if(!confirm('Supprimer ?'))return;await supabase.from('produits').delete().eq('id',p.id);fetchAll();}} className="p-1.5 rounded text-zinc-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={13}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length===0&&<tr><td colSpan={9} className="py-12 text-center text-zinc-400 text-sm">Aucun article</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-semibold text-zinc-900">{editing?'Modifier':'Nouveau'} article</h2>
                <p className="text-xs text-zinc-400">{PROD_TYPES[typeProduit].label}</p>
              </div>
              <button onClick={()=>setShowForm(false)}><X size={18} className="text-zinc-400"/></button>
            </div>
            <div className="px-6 py-5 space-y-5">
              {msg.type==='err'&&<div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{msg.text}</div>}

              {/* Type tabs */}
              {!editing&&(
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-2">Type *</label>
                  <div className="flex gap-2">
                    {(Object.entries(PROD_TYPES) as [TypeProduit, typeof PROD_TYPES[TypeProduit]][]).map(([t,cfg])=>{
                      const Icon=cfg.icon;
                      return (
                        <button key={t} type="button" onClick={()=>{setTypeProduit(t);setCategorie('');setFournisseurId('');setFournisseurNom('');}}
                          className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${typeProduit===t?TAB_COLORS[cfg.color].active:'border-zinc-200 text-zinc-400 hover:border-zinc-300'}`}>
                          <Icon size={15}/>{cfg.label.split(' ')[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Info de base */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Nom *</label>
                  <input className="form-input" value={nom} onChange={e=>setNom(e.target.value)} placeholder={typeProduit==='matiere_premiere'?'Ex: Orange Valencia fraîche':typeProduit==='produit_fini'?'Ex: Jus d\'orange 25cl':'Ex: Gants jetables'}/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Référence</label>
                  <input className="form-input font-mono" value={reference} onChange={e=>setReference(e.target.value)} placeholder={typeProduit==='matiere_premiere'?'MP-001':typeProduit==='produit_fini'?'PF-001':'CSO-001'}/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Catégorie</label>
                  <select className="form-select" value={categorie} onChange={e=>setCategorie(e.target.value)}>
                    <option value="">Sélectionner</option>
                    {PROD_TYPES[typeProduit].categories.map(c=><option key={c} value={c}>{CAT_LABELS[c]||c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Prix unitaire (TND)</label>
                  <input type="number" min="0" step="0.001" className="form-input font-tabular" value={prixUnitaire} onChange={e=>setPrixUnitaire(e.target.value)} placeholder="0.000"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Unité</label>
                  <select className="form-select" value={unite} onChange={e=>setUnite(e.target.value)}>
                    <option value="">Sélectionner</option>
                    {PROD_TYPES[typeProduit].unites.map(u=><option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Stock actuel</label>
                  <input type="number" min="0" className="form-input font-tabular" value={stockActuel} onChange={e=>setStockActuel(e.target.value)}/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Stock minimum (alerte)</label>
                  <input type="number" min="0" className="form-input font-tabular" value={stockMinimum} onChange={e=>setStockMinimum(e.target.value)}/>
                </div>
              </div>

              {/* Fournisseur principal — filtré dynamiquement */}
              <div className={`rounded-xl border-2 p-4 space-y-3 ${typeProduit==='matiere_premiere'?'border-amber-200 bg-amber-50':typeProduit==='produit_fini'?'border-teal-200 bg-teal-50':'border-zinc-200 bg-zinc-50'}`}>
                <div className="flex items-center gap-2">
                  <Truck size={15} className="text-zinc-500"/>
                  <label className="text-xs font-bold text-zinc-700">
                    Fournisseur principal
                    <span className="ml-1.5 font-normal text-zinc-400">
                      ({PROD_TYPES[typeProduit].fournisseurTypes.join(', ')})
                    </span>
                  </label>
                </div>
                <select className="form-select bg-white" value={fournisseurId} onChange={e=>handleSelectFournisseur(e.target.value)}>
                  <option value="">Aucun fournisseur sélectionné</option>
                  {formFournisseurs.length===0
                    ?<option disabled>Aucun fournisseur de ce type — ajoutez-en d&apos;abord</option>
                    :formFournisseurs.map(f=><option key={f.id} value={f.id}>{f.nom}</option>)
                  }
                </select>
                {fournisseurNom&&(
                  <div className="flex items-center gap-2 text-xs text-zinc-600 bg-white rounded-lg px-3 py-2 border border-zinc-200">
                    <Truck size={12} className="text-teal-500"/>
                    <span className="font-medium">{fournisseurNom}</span>
                    <button type="button" onClick={()=>{setFournisseurId('');setFournisseurNom('');}} className="ml-auto text-zinc-300 hover:text-red-400"><X size={12}/></button>
                  </div>
                )}
                {formFournisseurs.length===0&&(
                  <p className="text-[11px] text-zinc-400">
                    Pour lier un fournisseur, créez-en un dans{' '}
                    <a href="/gestion-fournisseurs" className="text-teal-600 underline">Gestion Fournisseurs</a>
                    {' '}avec la catégorie appropriée.
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Description</label>
                <textarea rows={2} className="form-input resize-none" value={description} onChange={e=>setDescription(e.target.value)}/>
              </div>

              <div className="flex items-center gap-3">
                <button type="button" onClick={()=>setActif(!actif)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${actif?'bg-teal-500':'bg-zinc-300'}`}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${actif?'translate-x-4':'translate-x-1'}`}/>
                </button>
                <span className="text-sm text-zinc-700">Article {actif?'actif':'inactif'}</span>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t sticky bottom-0 bg-white">
              <button onClick={()=>setShowForm(false)} className="px-4 py-2 text-sm text-zinc-600 font-medium">Annuler</button>
              <button onClick={handleSave} disabled={saving} className={`flex items-center gap-2 px-5 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-60 ${colorCfg.btn}`}>
                {saving&&<Loader2 size={14} className="animate-spin"/>}{editing?'Enregistrer':'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
