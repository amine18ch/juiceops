'use client';
import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import RoleGuard from '@/components/RoleGuard';
import { createClient } from '@/lib/supabase/client';
import { Plus, Search, Edit2, Trash2, X, Warehouse, CheckCircle, AlertCircle } from 'lucide-react';

interface Depot {
  id: string;
  nom: string;
  adresse: string;
  capacite_m3: number;
  type_stockage: string;
  responsable: string;
  actif: boolean;
}

const TYPES_STOCKAGE = ['ambiant', 'refrigere', 'surgele', 'sec'];

const emptyForm = (): Omit<Depot, 'id'> => ({
  nom: '',
  adresse: '',
  capacite_m3: 0,
  type_stockage: 'ambiant',
  responsable: '',
  actif: true,
});

export default function DepotsPage() {
  return (
    <AppLayout>
      <RoleGuard permission="canManageDepots">
        <DepotsContent />
      </RoleGuard>
    </AppLayout>
  );
}

function DepotsContent() {
  const supabase = createClient();
  const [depots, setDepots] = useState<Depot[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Depot | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchDepots = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('depots')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setDepots(data);
    setLoading(false);
  };

  useEffect(() => { fetchDepots(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setError('');
    setShowForm(true);
  };

  const openEdit = (d: Depot) => {
    setEditing(d);
    setForm({ nom: d.nom, adresse: d.adresse, capacite_m3: d.capacite_m3, type_stockage: d.type_stockage, responsable: d.responsable, actif: d.actif });
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nom.trim()) {
      setError('Le nom du dépôt est obligatoire.');
      return;
    }
    setSaving(true);
    setError('');
    if (editing) {
      const { error } = await supabase.from('depots').update(form).eq('id', editing.id);
      if (error) { setError(error.message); setSaving(false); return; }
      setSuccess('Dépôt modifié avec succès.');
    } else {
      const { error } = await supabase.from('depots').insert([form]);
      if (error) { setError(error.message); setSaving(false); return; }
      setSuccess('Dépôt créé avec succès.');
    }
    setSaving(false);
    setShowForm(false);
    fetchDepots();
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce dépôt ? Les chambres froides associées seront dissociées.')) return;
    const { error } = await supabase.from('depots').delete().eq('id', id);
    if (!error) { setSuccess('Dépôt supprimé.'); fetchDepots(); setTimeout(() => setSuccess(''), 3000); }
  };

  const filtered = depots.filter(d =>
    search === '' || d.nom.toLowerCase().includes(search.toLowerCase()) || d.responsable.toLowerCase().includes(search.toLowerCase())
  );

  const typeColor: Record<string, string> = {
    ambiant: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    refrigere: 'bg-blue-50 text-blue-700 border-blue-200',
    surgele: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    sec: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 py-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Gestion des Dépôts</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Créer, modifier et supprimer les dépôts de stockage</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Nouveau dépôt
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
              placeholder="Rechercher par nom ou responsable..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"><X size={12} /></button>}
          </div>
          <span className="text-xs text-zinc-400">{filtered.length} dépôt(s)</span>
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
                  <th className="table-th">Adresse</th>
                  <th className="table-th">Type</th>
                  <th className="table-th text-right">Capacité (m³)</th>
                  <th className="table-th">Responsable</th>
                  <th className="table-th">Statut</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map(d => (
                  <tr key={d.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                          <Warehouse size={13} className="text-teal-600" />
                        </div>
                        <span className="text-sm font-medium text-zinc-800">{d.nom}</span>
                      </div>
                    </td>
                    <td className="table-td text-xs text-zinc-500">{d.adresse || '—'}</td>
                    <td className="table-td">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold capitalize ${typeColor[d.type_stockage] || 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
                        {d.type_stockage}
                      </span>
                    </td>
                    <td className="table-td text-right text-sm font-bold text-zinc-800">{d.capacite_m3} m³</td>
                    <td className="table-td text-sm text-zinc-600">{d.responsable || '—'}</td>
                    <td className="table-td">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${d.actif ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-zinc-100 border-zinc-200 text-zinc-500'}`}>
                        {d.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg text-zinc-400 hover:text-teal-600 hover:bg-teal-50 transition-colors" title="Modifier">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Supprimer">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-12 text-center text-zinc-400 text-sm">Aucun dépôt trouvé</div>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <Warehouse size={16} className="text-teal-600" />
                </div>
                <h2 className="text-base font-semibold text-zinc-800">{editing ? 'Modifier le dépôt' : 'Nouveau dépôt'}</h2>
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
              <div>
                <label className="form-label">Nom du dépôt *</label>
                <input className="form-input" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex: Dépôt Principal" />
              </div>
              <div>
                <label className="form-label">Adresse</label>
                <input className="form-input" value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} placeholder="Ex: Zone industrielle Nord, Bâtiment A" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Type de stockage</label>
                  <select className="form-select" value={form.type_stockage} onChange={e => setForm(f => ({ ...f, type_stockage: e.target.value }))}>
                    {TYPES_STOCKAGE.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Capacité (m³)</label>
                  <input type="number" className="form-input" value={form.capacite_m3} onChange={e => setForm(f => ({ ...f, capacite_m3: parseFloat(e.target.value) || 0 }))} placeholder="0" />
                </div>
              </div>
              <div>
                <label className="form-label">Responsable</label>
                <input className="form-input" value={form.responsable} onChange={e => setForm(f => ({ ...f, responsable: e.target.value }))} placeholder="Ex: M. Leconte" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="depot-actif" className="w-4 h-4 rounded text-teal-700" checked={form.actif} onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))} />
                <label htmlFor="depot-actif" className="text-sm text-zinc-600">Dépôt actif</label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-100">
              <button onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Enregistrement...</> : <><CheckCircle size={15} /> {editing ? 'Modifier' : 'Créer'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
