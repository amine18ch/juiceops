'use client';
import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import RoleGuard from '@/components/RoleGuard';
import { createClient } from '@/lib/supabase/client';
import { Plus, Search, Edit2, Trash2, X, Package, CheckCircle, AlertCircle } from 'lucide-react';

interface Produit {
  id: string;
  nom: string;
  reference: string;
  categorie: string;
  description: string;
  prix_unitaire: number;
  unite: string;
  stock_actuel: number;
  stock_minimum: number;
  actif: boolean;
}

const CATEGORIES = ['jus', 'smoothie', 'nectar', 'sirop', 'autre'];
const UNITES = ['bouteille', 'carton', 'litre', 'unité'];

const emptyForm = (): Omit<Produit, 'id'> => ({
  nom: '',
  reference: '',
  categorie: 'jus',
  description: '',
  prix_unitaire: 0,
  unite: 'bouteille',
  stock_actuel: 0,
  stock_minimum: 0,
  actif: true,
});

export default function ProduitsPage() {
  return (
    <AppLayout>
      <RoleGuard permission="canManageDirection">
        <ProduitsContent />
      </RoleGuard>
    </AppLayout>
  );
}

function ProduitsContent() {
  const supabase = createClient();
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Produit | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchProduits = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('produits')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setProduits(data);
    setLoading(false);
  };

  useEffect(() => { fetchProduits(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setError('');
    setShowForm(true);
  };

  const openEdit = (p: Produit) => {
    setEditing(p);
    setForm({ nom: p.nom, reference: p.reference, categorie: p.categorie, description: p.description, prix_unitaire: p.prix_unitaire, unite: p.unite, stock_actuel: p.stock_actuel, stock_minimum: p.stock_minimum, actif: p.actif });
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nom.trim() || !form.reference.trim()) {
      setError('Le nom et la référence sont obligatoires.');
      return;
    }
    setSaving(true);
    setError('');
    if (editing) {
      const { error } = await supabase.from('produits').update(form).eq('id', editing.id);
      if (error) { setError(error.message); setSaving(false); return; }
      setSuccess('Produit modifié avec succès.');
    } else {
      const { error } = await supabase.from('produits').insert([form]);
      if (error) { setError(error.message); setSaving(false); return; }
      setSuccess('Produit créé avec succès.');
    }
    setSaving(false);
    setShowForm(false);
    fetchProduits();
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce produit ?')) return;
    const { error } = await supabase.from('produits').delete().eq('id', id);
    if (!error) { setSuccess('Produit supprimé.'); fetchProduits(); setTimeout(() => setSuccess(''), 3000); }
  };

  const filtered = produits.filter(p =>
    search === '' ||
    p.nom.toLowerCase().includes(search.toLowerCase()) ||
    p.reference.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Gestion des Produits</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Créer, modifier et supprimer les produits du catalogue</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Nouveau produit
        </button>
      </div>

      {/* Feedback */}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          <CheckCircle size={16} />
          {success}
        </div>
      )}

      {/* Search + Table */}
      <div className="card-section">
        <div className="section-header">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              className="form-input pl-8 py-1.5 text-xs"
              placeholder="Rechercher par nom ou référence..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"><X size={12} /></button>}
          </div>
          <span className="text-xs text-zinc-400">{filtered.length} produit(s)</span>
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
                  <th className="table-th">Référence</th>
                  <th className="table-th">Nom</th>
                  <th className="table-th">Catégorie</th>
                  <th className="table-th text-right">Prix unitaire</th>
                  <th className="table-th text-right">Stock</th>
                  <th className="table-th">Statut</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="table-td font-mono text-xs font-semibold text-zinc-700">{p.reference}</td>
                    <td className="table-td text-sm font-medium text-zinc-800">{p.nom}</td>
                    <td className="table-td">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[10px] font-semibold text-teal-700 capitalize">{p.categorie}</span>
                    </td>
                    <td className="table-td text-right text-sm font-bold text-zinc-800">{p.prix_unitaire.toFixed(2)} €</td>
                    <td className="table-td text-right">
                      <span className={`text-sm font-semibold ${p.stock_actuel <= p.stock_minimum ? 'text-red-600' : 'text-zinc-700'}`}>{p.stock_actuel}</span>
                      <span className="text-xs text-zinc-400 ml-1">{p.unite}</span>
                    </td>
                    <td className="table-td">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${p.actif ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-zinc-100 border-zinc-200 text-zinc-500'}`}>
                        {p.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-zinc-400 hover:text-teal-600 hover:bg-teal-50 transition-colors" title="Modifier">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Supprimer">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-12 text-center text-zinc-400 text-sm">Aucun produit trouvé</div>
            )}
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <Package size={16} className="text-teal-600" />
                </div>
                <h2 className="text-base font-semibold text-zinc-800">{editing ? 'Modifier le produit' : 'Nouveau produit'}</h2>
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
                  <label className="form-label">Nom du produit *</label>
                  <input className="form-input" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex: Jus d'orange frais 25cl" />
                </div>
                <div>
                  <label className="form-label">Référence *</label>
                  <input className="form-input" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="Ex: JUS-OR-25" />
                </div>
                <div>
                  <label className="form-label">Catégorie</label>
                  <select className="form-select" value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Prix unitaire (€)</label>
                  <input type="number" step="0.01" min="0" className="form-input" value={form.prix_unitaire} onChange={e => setForm(f => ({ ...f, prix_unitaire: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className="form-label">Unité</label>
                  <select className="form-select" value={form.unite} onChange={e => setForm(f => ({ ...f, unite: e.target.value }))}>
                    {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Stock actuel</label>
                  <input type="number" min="0" className="form-input" value={form.stock_actuel} onChange={e => setForm(f => ({ ...f, stock_actuel: parseInt(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className="form-label">Stock minimum</label>
                  <input type="number" min="0" className="form-input" value={form.stock_minimum} onChange={e => setForm(f => ({ ...f, stock_minimum: parseInt(e.target.value) || 0 }))} />
                </div>
                <div className="col-span-2">
                  <label className="form-label">Description</label>
                  <textarea className="form-input resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description optionnelle..." />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input type="checkbox" id="actif-produit" checked={form.actif} onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))} className="w-4 h-4 rounded border-zinc-300 text-teal-600" />
                  <label htmlFor="actif-produit" className="text-sm text-zinc-700">Produit actif</label>
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
