'use client';
import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import RoleGuard from '@/components/RoleGuard';
import { createClient } from '@/lib/supabase/client';
import { Plus, Search, Edit2, Trash2, X, Truck, CheckCircle, AlertCircle } from 'lucide-react';

interface Fournisseur {
  id: string;
  nom: string;
  contact: string;
  email: string;
  telephone: string;
  adresse: string;
  categorie: string;
  actif: boolean;
}

const CATEGORIES_FOURN = ['fruits', 'emballages', 'produits_chimiques', 'materiel', 'autre'];

const emptyForm = (): Omit<Fournisseur, 'id'> => ({
  nom: '',
  contact: '',
  email: '',
  telephone: '',
  adresse: '',
  categorie: 'fruits',
  actif: true,
});

export default function FournisseursPage() {
  return (
    <AppLayout>
      <RoleGuard permission="canManageDirection">
        <FournisseursContent />
      </RoleGuard>
    </AppLayout>
  );
}

function FournisseursContent() {
  const supabase = createClient();
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Fournisseur | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchFournisseurs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('fournisseurs')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setFournisseurs(data);
    setLoading(false);
  };

  useEffect(() => { fetchFournisseurs(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setError('');
    setShowForm(true);
  };

  const openEdit = (f: Fournisseur) => {
    setEditing(f);
    setForm({ nom: f.nom, contact: f.contact, email: f.email, telephone: f.telephone, adresse: f.adresse, categorie: f.categorie, actif: f.actif });
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nom.trim()) {
      setError('Le nom du fournisseur est obligatoire.');
      return;
    }
    setSaving(true);
    setError('');
    if (editing) {
      const { error } = await supabase.from('fournisseurs').update(form).eq('id', editing.id);
      if (error) { setError(error.message); setSaving(false); return; }
      setSuccess('Fournisseur modifié avec succès.');
    } else {
      const { error } = await supabase.from('fournisseurs').insert([form]);
      if (error) { setError(error.message); setSaving(false); return; }
      setSuccess('Fournisseur créé avec succès.');
    }
    setSaving(false);
    setShowForm(false);
    fetchFournisseurs();
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce fournisseur ?')) return;
    const { error } = await supabase.from('fournisseurs').delete().eq('id', id);
    if (!error) { setSuccess('Fournisseur supprimé.'); fetchFournisseurs(); setTimeout(() => setSuccess(''), 3000); }
  };

  const filtered = fournisseurs.filter(f =>
    search === '' ||
    f.nom.toLowerCase().includes(search.toLowerCase()) ||
    f.contact.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 py-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Gestion des Fournisseurs</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Créer, modifier et supprimer les fournisseurs</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Nouveau fournisseur
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          <CheckCircle size={16} />
          {success}
        </div>
      )}

      <div className="card-section">
        <div className="section-header">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              className="form-input pl-8 py-1.5 text-xs"
              placeholder="Rechercher par nom ou contact..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"><X size={12} /></button>}
          </div>
          <span className="text-xs text-zinc-400">{filtered.length} fournisseur(s)</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Nom</th>
                  <th className="table-th">Contact</th>
                  <th className="table-th">Email</th>
                  <th className="table-th">Téléphone</th>
                  <th className="table-th">Catégorie</th>
                  <th className="table-th">Statut</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map(f => (
                  <tr key={f.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="table-td text-sm font-semibold text-zinc-800">{f.nom}</td>
                    <td className="table-td text-xs text-zinc-600">{f.contact || '—'}</td>
                    <td className="table-td text-xs text-zinc-500">{f.email || '—'}</td>
                    <td className="table-td text-xs text-zinc-500 whitespace-nowrap">{f.telephone || '—'}</td>
                    <td className="table-td">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-[10px] font-semibold text-purple-700 capitalize">{f.categorie.replace('_', ' ')}</span>
                    </td>
                    <td className="table-td">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${f.actif ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-zinc-100 border-zinc-200 text-zinc-500'}`}>
                        {f.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(f)} className="p-1.5 rounded-lg text-zinc-400 hover:text-teal-600 hover:bg-teal-50 transition-colors" title="Modifier">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleDelete(f.id)} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Supprimer">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-12 text-center text-zinc-400 text-sm">Aucun fournisseur trouvé</div>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Truck size={16} className="text-purple-600" />
                </div>
                <h2 className="text-base font-semibold text-zinc-800">{editing ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</h2>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="form-label">Nom du fournisseur *</label>
                  <input className="form-input" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex: Agrumes du Sud" />
                </div>
                <div>
                  <label className="form-label">Contact</label>
                  <input className="form-input" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} placeholder="Nom du responsable" />
                </div>
                <div>
                  <label className="form-label">Catégorie</label>
                  <select className="form-select" value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}>
                    {CATEGORIES_FOURN.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@fournisseur.fr" />
                </div>
                <div>
                  <label className="form-label">Téléphone</label>
                  <input className="form-input" value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} placeholder="01 23 45 67 89" />
                </div>
                <div className="col-span-2">
                  <label className="form-label">Adresse</label>
                  <input className="form-input" value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} placeholder="Adresse complète" />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input type="checkbox" id="actif-fourn" checked={form.actif} onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))} className="w-4 h-4 rounded border-zinc-300 text-teal-600" />
                  <label htmlFor="actif-fourn" className="text-sm text-zinc-700">Fournisseur actif</label>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-100">
              <button onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : null}
                {editing ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
