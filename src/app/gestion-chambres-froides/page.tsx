'use client';
import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import RoleGuard from '@/components/RoleGuard';
import { createClient } from '@/lib/supabase/client';
import { Plus, Search, Edit2, Trash2, X, Thermometer, CheckCircle, AlertCircle } from 'lucide-react';

interface ChambreFroide {
  id: string;
  nom: string;
  depot_id: string | null;
  temperature_min: number;
  temperature_max: number;
  temperature_actuelle: number;
  capacite_m3: number;
  statut: string;
  responsable: string;
  actif: boolean;
}

interface Depot {
  id: string;
  nom: string;
}

const emptyForm = (): Omit<ChambreFroide, 'id'> => ({
  nom: '',
  depot_id: null,
  temperature_min: 0,
  temperature_max: 4,
  temperature_actuelle: 2,
  capacite_m3: 0,
  statut: 'ok',
  responsable: '',
  actif: true,
});

export default function ChambresFroidesPage() {
  return (
    <AppLayout>
      <RoleGuard permission="canManageDepots">
        <ChambresFroidesContent />
      </RoleGuard>
    </AppLayout>
  );
}

function ChambresFroidesContent() {
  const supabase = createClient();
  const [chambres, setChambres] = useState<ChambreFroide[]>([]);
  const [depots, setDepots] = useState<Depot[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ChambreFroide | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const [{ data: chambresData, error: chambresError }, { data: depotsData, error: depotsError }] = await Promise.all([
      supabase.from('chambres_froides').select('*').order('created_at', { ascending: false }),
      supabase.from('depots').select('id, nom').eq('actif', true).order('nom'),
    ]);
    if (chambresData) setChambres(chambresData);
    if (depotsData) setDepots(depotsData);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setError('');
    setShowForm(true);
  };

  const openEdit = (c: ChambreFroide) => {
    setEditing(c);
    setForm({ nom: c.nom, depot_id: c.depot_id, temperature_min: c.temperature_min, temperature_max: c.temperature_max, temperature_actuelle: c.temperature_actuelle, capacite_m3: c.capacite_m3, statut: c.statut, responsable: c.responsable, actif: c.actif });
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nom.trim()) {
      setError('Le nom de la chambre froide est obligatoire.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = { ...form, depot_id: form.depot_id || null };
    if (editing) {
      const { error } = await supabase.from('chambres_froides').update(payload).eq('id', editing.id);
      if (error) { setError(error.message); setSaving(false); return; }
      setSuccess('Chambre froide modifiée avec succès.');
    } else {
      const { error } = await supabase.from('chambres_froides').insert([payload]);
      if (error) { setError(error.message); setSaving(false); return; }
      setSuccess('Chambre froide créée avec succès.');
    }
    setSaving(false);
    setShowForm(false);
    fetchData();
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette chambre froide ?')) return;
    const { error } = await supabase.from('chambres_froides').delete().eq('id', id);
    if (!error) { setSuccess('Chambre froide supprimée.'); fetchData(); setTimeout(() => setSuccess(''), 3000); }
  };

  const filtered = chambres.filter(c =>
    search === '' || c.nom.toLowerCase().includes(search.toLowerCase()) || c.responsable.toLowerCase().includes(search.toLowerCase())
  );

  const statutColor: Record<string, string> = {
    ok: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    alerte: 'bg-amber-50 border-amber-200 text-amber-700',
    danger: 'bg-red-50 border-red-200 text-red-700',
  };

  const getDepotNom = (depotId: string | null) => {
    if (!depotId) return '—';
    return depots.find(d => d.id === depotId)?.nom || '—';
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 py-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Chambres Froides</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Gérer les chambres froides et leurs paramètres de température</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Nouvelle chambre froide
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
          <span className="text-xs text-zinc-400">{filtered.length} chambre(s)</span>
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
                  <th className="table-th">Dépôt</th>
                  <th className="table-th text-right">T° actuelle</th>
                  <th className="table-th text-right">Plage (°C)</th>
                  <th className="table-th text-right">Capacité</th>
                  <th className="table-th">Responsable</th>
                  <th className="table-th">Statut</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                          <Thermometer size={13} className="text-blue-600" />
                        </div>
                        <span className="text-sm font-medium text-zinc-800">{c.nom}</span>
                      </div>
                    </td>
                    <td className="table-td text-xs text-zinc-500">{getDepotNom(c.depot_id)}</td>
                    <td className="table-td text-right">
                      <span className={`text-sm font-bold font-tabular ${c.statut === 'danger' ? 'text-red-600' : c.statut === 'alerte' ? 'text-amber-600' : 'text-zinc-700'}`}>
                        {c.temperature_actuelle}°C
                      </span>
                    </td>
                    <td className="table-td text-right text-xs text-zinc-500">{c.temperature_min}°C → {c.temperature_max}°C</td>
                    <td className="table-td text-right text-sm text-zinc-700">{c.capacite_m3} m³</td>
                    <td className="table-td text-sm text-zinc-600">{c.responsable || '—'}</td>
                    <td className="table-td">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase ${statutColor[c.statut] || 'bg-zinc-100 border-zinc-200 text-zinc-600'}`}>
                        {c.statut}
                      </span>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-zinc-400 hover:text-teal-600 hover:bg-teal-50 transition-colors" title="Modifier">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Supprimer">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-12 text-center text-zinc-400 text-sm">Aucune chambre froide trouvée</div>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Thermometer size={16} className="text-blue-600" />
                </div>
                <h2 className="text-base font-semibold text-zinc-800">{editing ? 'Modifier la chambre froide' : 'Nouvelle chambre froide'}</h2>
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
                <label className="form-label">Nom de la chambre froide *</label>
                <input className="form-input" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex: Chambre Froide 1" />
              </div>
              <div>
                <label className="form-label">Dépôt associé</label>
                <select className="form-select" value={form.depot_id || ''} onChange={e => setForm(f => ({ ...f, depot_id: e.target.value || null }))}>
                  <option value="">Aucun dépôt</option>
                  {depots.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="form-label">T° min (°C)</label>
                  <input type="number" step="0.1" className="form-input font-tabular" value={form.temperature_min} onChange={e => setForm(f => ({ ...f, temperature_min: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className="form-label">T° max (°C)</label>
                  <input type="number" step="0.1" className="form-input font-tabular" value={form.temperature_max} onChange={e => setForm(f => ({ ...f, temperature_max: parseFloat(e.target.value) || 4 }))} />
                </div>
                <div>
                  <label className="form-label">T° actuelle (°C)</label>
                  <input type="number" step="0.1" className="form-input font-tabular" value={form.temperature_actuelle} onChange={e => setForm(f => ({ ...f, temperature_actuelle: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Capacité (m³)</label>
                  <input type="number" className="form-input" value={form.capacite_m3} onChange={e => setForm(f => ({ ...f, capacite_m3: parseFloat(e.target.value) || 0 }))} placeholder="0" />
                </div>
                <div>
                  <label className="form-label">Statut</label>
                  <select className="form-select" value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}>
                    <option value="ok">OK</option>
                    <option value="alerte">Alerte</option>
                    <option value="danger">Danger</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">Responsable</label>
                <input className="form-input" value={form.responsable} onChange={e => setForm(f => ({ ...f, responsable: e.target.value }))} placeholder="Ex: T. Martin" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="chambre-actif" className="w-4 h-4 rounded text-teal-700" checked={form.actif} onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))} />
                <label htmlFor="chambre-actif" className="text-sm text-zinc-600">Chambre froide active</label>
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
