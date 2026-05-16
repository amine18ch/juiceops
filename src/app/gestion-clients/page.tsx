'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import RoleGuard from '@/components/RoleGuard';
import { createClient } from '@/lib/supabase/client';
import { Plus, Search, X, Users, Edit2, Trash2, Loader2, Building2, User, CheckCircle, AlertCircle } from 'lucide-react';

const SECTEURS = ['Agroalimentaire','Grande distribution','Restauration','Hôtellerie','Santé','Education','Collectivité','Import-Export','Distribution','Autre'];
const TYPES_CLIENT = ['grande_surface','bio','horeca','collectivite','distributeur','autre'];
const TYPES_LABEL: Record<string,string> = { grande_surface:'Grande surface', bio:'Bio', horeca:'HORECA', collectivite:'Collectivité', distributeur:'Distributeur', autre:'Autre' };

export default function GestionClientsPage() {
  return <AppLayout><RoleGuard permission="canManageDirection"><ClientsContent /></RoleGuard></AppLayout>;
}

function ClientsContent() {
  const supabase = useMemo(() => createClient(), []);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState({ type:'', text:'' });

  // Form
  const [typeCompte, setTypeCompte] = useState<'professionnel'|'particulier'>('professionnel');
  const [nom, setNom]               = useState('');
  const [prenom, setPrenom]         = useState('');
  const [nomFamille, setNomFamille] = useState('');
  const [raisonSociale, setRaisonSociale] = useState('');
  const [matricule, setMatricule]   = useState('');
  const [codeTva, setCodeTva]       = useState('');
  const [secteur, setSecteur]       = useState('');
  const [responsable, setResponsable] = useState('');
  const [siteWeb, setSiteWeb]       = useState('');
  const [rib, setRib]               = useState('');
  const [cin, setCin]               = useState('');
  const [email, setEmail]           = useState('');
  const [telephone, setTelephone]   = useState('');
  const [adresse, setAdresse]       = useState('');
  const [typeClient, setTypeClient] = useState('autre');
  const [actif, setActif]           = useState(true);

  const resetForm = () => {
    setTypeCompte('professionnel'); setNom(''); setPrenom(''); setNomFamille('');
    setRaisonSociale(''); setMatricule(''); setCodeTva(''); setSecteur('');
    setResponsable(''); setSiteWeb(''); setRib(''); setCin('');
    setEmail(''); setTelephone(''); setAdresse(''); setTypeClient('autre'); setActif(true);
  };

  const openCreate = () => { setEditing(null); resetForm(); setShowModal(true); };
  const openEdit = (c: any) => {
    setEditing(c);
    setTypeCompte(c.type_compte||'professionnel');
    setNom(c.nom||''); setPrenom(c.prenom||''); setNomFamille(c.nom_famille||'');
    setRaisonSociale(c.raison_sociale||''); setMatricule(c.matricule_fiscal||'');
    setCodeTva(c.code_tva||''); setSecteur(c.secteur_activite||'');
    setResponsable(c.responsable||''); setSiteWeb(c.site_web||'');
    setRib(c.rib||''); setCin(c.cin||'');
    setEmail(c.email||''); setTelephone(c.telephone||'');
    setAdresse(c.adresse||''); setTypeClient(c.type_client||'autre'); setActif(c.actif!==false);
    setShowModal(true);
  };

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('clients').select('*').order('created_at',{ascending:false});
    if (data) setClients(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const getDisplayName = (c: any) => {
    if (c.type_compte === 'particulier') return [c.prenom, c.nom_famille].filter(Boolean).join(' ') || c.nom || '—';
    return c.raison_sociale || c.nom || '—';
  };

  const handleSave = async () => {
    const displayNom = typeCompte === 'particulier'
      ? [prenom, nomFamille].filter(Boolean).join(' ') || nom
      : raisonSociale || nom;
    if (!displayNom.trim()) { setMsg({type:'err',text:'Nom / Raison sociale obligatoire.'}); return; }
    setSaving(true);
    const data = {
      nom: displayNom, type_compte: typeCompte,
      prenom, nom_famille: nomFamille, raison_sociale: raisonSociale,
      matricule_fiscal: matricule, code_tva: codeTva, secteur_activite: secteur,
      responsable, site_web: siteWeb, rib, cin,
      email, telephone, adresse, type_client: typeClient, actif,
    };
    editing ? await supabase.from('clients').update(data).eq('id', editing.id)
            : await supabase.from('clients').insert([data]);
    setMsg({type:'ok',text:editing?'Client modifié.':'Client créé.'});
    setSaving(false); setShowModal(false); fetchClients();
    setTimeout(()=>setMsg({type:'',text:''}),3000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce client ?')) return;
    await supabase.from('clients').delete().eq('id', id);
    fetchClients();
  };

  const filtered = clients.filter(c =>
    (filterType === 'all' || c.type_compte === filterType) &&
    (search === '' || getDisplayName(c).toLowerCase().includes(search.toLowerCase()) ||
     c.email?.toLowerCase().includes(search.toLowerCase()) ||
     c.matricule_fiscal?.toLowerCase().includes(search.toLowerCase()))
  );

  const stats = {
    total: clients.length,
    pro: clients.filter(c => c.type_compte==='professionnel').length,
    part: clients.filter(c => c.type_compte==='particulier').length,
    actifs: clients.filter(c => c.actif!==false).length,
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2"><Users size={20} className="text-teal-600"/> Gestion des Clients</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Clients professionnels et particuliers</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700"><Plus size={15}/> Nouveau client</button>
      </div>

      {msg.text&&<div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm border ${msg.type==='ok'?'bg-emerald-50 border-emerald-200 text-emerald-700':'bg-red-50 border-red-200 text-red-700'}`}>{msg.type==='ok'?<CheckCircle size={15}/>:<AlertCircle size={15}/>} {msg.text}</div>}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {label:'Total',value:stats.total,icon:Users,color:'blue'},
          {label:'Professionnels',value:stats.pro,icon:Building2,color:'teal'},
          {label:'Particuliers',value:stats.part,icon:User,color:'purple'},
          {label:'Actifs',value:stats.actifs,icon:CheckCircle,color:'green'},
        ].map(s=>(
          <div key={s.label} className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg bg-${s.color}-50 flex items-center justify-center`}>
              <s.icon size={18} className={`text-${s.color}-600`}/>
            </div>
            <div><p className="text-2xl font-bold text-zinc-900">{s.value}</p><p className="text-xs text-zinc-500">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"/>
          <input className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-teal-500"
            placeholder="Nom, email, matricule..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white" value={filterType} onChange={e=>setFilterType(e.target.value)}>
          <option value="all">Tous les types</option>
          <option value="professionnel">Professionnels</option>
          <option value="particulier">Particuliers</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {loading?<div className="flex items-center justify-center py-16 gap-2 text-zinc-400"><Loader2 size={18} className="animate-spin"/> Chargement...</div>:(
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-100">
                <tr>{['Type','Nom / Raison sociale','Contact','Téléphone','Matricule fiscal','Secteur','Statut','Actions'].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map(c=>(
                  <tr key={c.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full w-fit ${c.type_compte==='professionnel'?'bg-teal-50 text-teal-700':'bg-purple-50 text-purple-700'}`}>
                        {c.type_compte==='professionnel'?<Building2 size={10}/>:<User size={10}/>}
                        {c.type_compte==='professionnel'?'Pro':'Particulier'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-800">{getDisplayName(c)}</p>
                      {c.type_compte==='professionnel'&&c.responsable&&<p className="text-xs text-zinc-400">Contact : {c.responsable}</p>}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 text-xs">{c.email||'—'}</td>
                    <td className="px-4 py-3 text-zinc-600 text-xs">{c.telephone||'—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-600">{c.matricule_fiscal||c.cin||'—'}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{c.secteur_activite||TYPES_LABEL[c.type_client]||'—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.actif!==false?'bg-green-100 text-green-700':'bg-zinc-100 text-zinc-500'}`}>
                        {c.actif!==false?'Actif':'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={()=>openEdit(c)} className="p-1.5 rounded text-zinc-400 hover:text-teal-600 hover:bg-teal-50"><Edit2 size={13}/></button>
                        <button onClick={()=>handleDelete(c.id)} className="p-1.5 rounded text-zinc-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length===0&&<tr><td colSpan={8} className="py-12 text-center text-zinc-400 text-sm">Aucun client trouvé</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 sticky top-0 bg-white z-10">
              <h2 className="text-base font-semibold text-zinc-900">{editing?'Modifier le client':'Nouveau client'}</h2>
              <button onClick={()=>setShowModal(false)} className="text-zinc-400 hover:text-zinc-600"><X size={18}/></button>
            </div>
            <div className="px-6 py-5 space-y-5">
              {msg.type==='err'&&<div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{msg.text}</div>}

              {/* Type switcher */}
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-2">Type de compte *</label>
                <div className="flex gap-3">
                  {(['professionnel','particulier'] as const).map(t=>(
                    <button key={t} type="button" onClick={()=>setTypeCompte(t)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${typeCompte===t?t==='professionnel'?'border-teal-500 bg-teal-50 text-teal-700':'border-purple-500 bg-purple-50 text-purple-700':'border-zinc-200 text-zinc-500 hover:border-zinc-300'}`}>
                      {t==='professionnel'?<Building2 size={16}/>:<User size={16}/>}
                      {t==='professionnel'?'Professionnel / Entreprise':'Particulier'}
                    </button>
                  ))}
                </div>
              </div>

              {typeCompte==='professionnel'?(
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Raison sociale *</label><input className="form-input" value={raisonSociale} onChange={e=>setRaisonSociale(e.target.value)} placeholder="NaturalJuice SARL"/></div>
                    <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Matricule fiscal</label><input className="form-input font-mono" value={matricule} onChange={e=>setMatricule(e.target.value)} placeholder="1234567/A/M/000"/></div>
                    <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Code TVA</label><input className="form-input font-mono" value={codeTva} onChange={e=>setCodeTva(e.target.value)} placeholder="TVA-123"/></div>
                    <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Secteur d'activité</label>
                      <select className="form-select" value={secteur} onChange={e=>setSecteur(e.target.value)}>
                        <option value="">Sélectionner</option>{SECTEURS.map(s=><option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Responsable / Contact</label><input className="form-input" value={responsable} onChange={e=>setResponsable(e.target.value)} placeholder="Nom du contact"/></div>
                    <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Téléphone</label><input className="form-input" value={telephone} onChange={e=>setTelephone(e.target.value)} placeholder="+216 XX XXX XXX"/></div>
                    <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Email</label><input type="email" className="form-input" value={email} onChange={e=>setEmail(e.target.value)}/></div>
                    <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Site web</label><input className="form-input" value={siteWeb} onChange={e=>setSiteWeb(e.target.value)} placeholder="www.exemple.com"/></div>
                    <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">RIB</label><input className="form-input font-mono" value={rib} onChange={e=>setRib(e.target.value)}/></div>
                    <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Catégorie client</label>
                      <select className="form-select" value={typeClient} onChange={e=>setTypeClient(e.target.value)}>
                        {TYPES_CLIENT.map(t=><option key={t} value={t}>{TYPES_LABEL[t]}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2"><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Adresse</label><textarea rows={2} className="form-input resize-none" value={adresse} onChange={e=>setAdresse(e.target.value)}/></div>
                  </div>
                </div>
              ):(
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Prénom *</label><input className="form-input" value={prenom} onChange={e=>setPrenom(e.target.value)}/></div>
                    <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Nom de famille *</label><input className="form-input" value={nomFamille} onChange={e=>setNomFamille(e.target.value)}/></div>
                    <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">CIN / Pièce d'identité</label><input className="form-input font-mono" value={cin} onChange={e=>setCin(e.target.value)}/></div>
                    <div><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Téléphone</label><input className="form-input" value={telephone} onChange={e=>setTelephone(e.target.value)} placeholder="+216 XX XXX XXX"/></div>
                    <div className="col-span-2"><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Email</label><input type="email" className="form-input" value={email} onChange={e=>setEmail(e.target.value)}/></div>
                    <div className="col-span-2"><label className="block text-xs font-semibold text-zinc-600 mb-1.5">Adresse</label><textarea rows={2} className="form-input resize-none" value={adresse} onChange={e=>setAdresse(e.target.value)}/></div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button type="button" onClick={()=>setActif(!actif)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${actif?'bg-teal-500':'bg-zinc-300'}`}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${actif?'translate-x-4':'translate-x-1'}`}/>
                </button>
                <span className="text-sm text-zinc-700">Compte {actif?'actif':'inactif'}</span>
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
