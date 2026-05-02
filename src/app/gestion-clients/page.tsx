'use client';
import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import RoleGuard from '@/components/RoleGuard';
import { createClient } from '@/lib/supabase/client';
import { Plus, Search, Edit2, Trash2, X, Users, CheckCircle, AlertCircle } from 'lucide-react';

interface Client {
  id: string;
  nom: string;
  contact: string;
  email: string;
  telephone: string;
  adresse: string;
  type_client: string;
  actif: boolean;
}

const TYPES_CLIENT = ['grande_surface', 'bio', 'horeca', 'collectivite', 'distributeur', 'autre'];
const TYPE_LABELS: Record<string, string> = {
  grande_surface: 'Grande surface',
  bio: 'Magasin bio',
  horeca: 'HoReCa',
  collectivite: 'Collectivité',
  distributeur: 'Distributeur',
  autre: 'Autre',
};

const emptyForm = (): Omit<Client, 'id'> => ({
  nom: '',
  contact: '',
  email: '',
  telephone: '',
  adresse: '',
  type_client: 'distributeur',
  actif: true,
});

export default function ClientsPage() {
  return (
    <AppLayout>
      <RoleGuard permission="canManageDirection">
        <ClientsContent />
      </RoleGuard>
    </AppLayout>
  );
}

function ClientsContent() {
  const supabase = createClient();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setClients(data);
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setError('');
    setShowForm(true);
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    setForm({ nom: c.nom, contact: c.contact, email: c.email, telephone: c.telephone, adresse: c.adresse, type_client: c.type_client, actif: c.actif });
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nom.trim()) {
      setError('Le nom du client est obligatoire.');
      return;
    }
    setSaving(true);
    setError('');
    if (editing) {
      const { error } = await supabase.from('clients').update(form).eq('id', editing.id);
      if (error) { setError(error.message); setSaving(false); return; }
      setSuccess('Client modifié avec succès.');
    } else {
      const { error } = await supabase.from('clients').insert([form]);
      if (error) { setError(error.message); setSaving(false); return; }
      setSuccess('Client créé avec succès.');
    }
    setSaving(false);
    setShowForm(false);
    fetchClients();
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce client ?')) return;
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (!error) { setSuccess('Client supprimé.'); fetchClients(); setTimeout(() => setSuccess(''), 3000); }
  };

  const filtered = clients.filter(c =>
    search === '' ||
    c.nom.toLowerCase().includes(search.toLowerCase()) ||
    c.contact.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 py-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Gestion des Clients</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Créer, modifier et supprimer les clients</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Nouveau client
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
          <span className="text-xs text-zinc-400">{filtered.length} client(s)</span>
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
                  <th className="table-th">Type</th>
                  <th className="table-th">Statut</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="table-td text-sm font-semibold text-zinc-800">{c.nom}</td>
                    <td className="table-td text-xs text-zinc-600">{c.contact || '—'}</td>
                    <td className="table-td text-xs text-zinc-500">{c.email || '—'}</td>
                    <td className="table-td text-xs text-zinc-500 whitespace-nowrap">{c.telephone || '—'}</td>
                    <td className="table-td">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-semibold text-blue-700">
                        {TYPE_LABELS[c.type_client] || c.type_client}
                      </span>
                    </td>
                    <td className="table-td">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${c.actif ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-zinc-100 border-zinc-200 text-zinc-500'}`}>
                        {c.actif ? 'Actif' : 'Inactif'}
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
              <div className="py-12 text-center text-zinc-400 text-sm">Aucun client trouvé</div>
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
                  <Users size={16} className="text-blue-600" />
                </div>
                <h2 className="text-base font-semibold text-zinc-800">{editing ? 'Modifier le client' : 'Nouveau client'}</h2>
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
                  <label className="form-label">Nom du client *</label>
                  <input className="form-input" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex: Carrefour Market" />
                </div>
                <div>
                  <label className="form-label">Contact</label>
                  <input className="form-input" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} placeholder="Nom du responsable" />
                </div>
                <div>
                  <label className="form-label">Type de client</label>
                  <select className="form-select" value={form.type_client} onChange={e => setForm(f => ({ ...f, type_client: e.target.value }))}>
                    {TYPES_CLIENT.map(t => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@client.fr" />
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
                  <input type="checkbox" id="actif-client" checked={form.actif} onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))} className="w-4 h-4 rounded border-zinc-300 text-teal-600" />
                  <label htmlFor="actif-client" className="text-sm text-zinc-700">Client actif</label>
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
