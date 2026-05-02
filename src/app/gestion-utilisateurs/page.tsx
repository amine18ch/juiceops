'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import RoleGuard from '@/components/RoleGuard';
import { createClient } from '@/lib/supabase/client';
import { useAuth, ROLE_LABELS, ROLE_COLORS, UserRole } from '@/contexts/AuthContext';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  X,
  Loader2,
  ShieldCheck,
  Mail,
  User,
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

interface UserFormData {
  email: string;
  full_name: string;
  role: UserRole;
  password: string;
  is_active: boolean;
}

const ROLES: UserRole[] = ['operateur', 'responsable_qualite', 'manager_production', 'direction'];

const emptyForm: UserFormData = {
  email: '',
  full_name: '',
  role: 'operateur',
  password: '',
  is_active: true,
};

export default function GestionUtilisateursPage() {
  const supabase = createClient();
  const { profile: currentUser } = useAuth();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<UserFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setUsers(data as UserProfile[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filtered = users.filter((u) => {
    const matchSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    const matchStatus =
      filterStatus === 'all' ||
      (filterStatus === 'actif' && u.is_active) ||
      (filterStatus === 'inactif' && !u.is_active);
    return matchSearch && matchRole && matchStatus;
  });

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = (user: UserProfile) => {
    setEditingUser(user);
    setForm({
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      password: '',
      is_active: user.is_active,
    });
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setForm(emptyForm);
    setError('');
  };

  const handleSave = async () => {
    if (!form.email.trim() || !form.full_name.trim()) {
      setError('Email et nom complet sont obligatoires.');
      return;
    }
    if (!editingUser && !form.password.trim()) {
      setError('Le mot de passe est obligatoire pour un nouvel utilisateur.');
      return;
    }
    if (!editingUser && form.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (editingUser) {
        // Update profile fields
        const { error: updateErr } = await supabase
          .from('user_profiles')
          .update({
            full_name: form.full_name.trim(),
            role: form.role,
            is_active: form.is_active,
          })
          .eq('id', editingUser.id);

        if (updateErr) throw new Error(updateErr.message);
        setSuccessMsg('Utilisateur mis à jour avec succès.');
      } else {
        // Create new user via server-side API route (uses service role — does NOT affect current session)
        const res = await fetch('/api/admin/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.email.trim(),
            password: form.password,
            full_name: form.full_name.trim(),
            role: form.role,
            is_active: form.is_active,
          }),
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Erreur lors de la création.');

        setSuccessMsg('Utilisateur créé avec succès.');
      }

      await fetchUsers();
      closeModal();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: UserProfile) => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_active: !user.is_active })
      .eq('id', user.id);
    if (!error) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: !u.is_active } : u))
      );
      setSuccessMsg(`Utilisateur ${!user.is_active ? 'activé' : 'désactivé'} avec succès.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', deleteTarget.id);
    if (!error) {
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setSuccessMsg('Utilisateur supprimé.');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
    setDeleteTarget(null);
    setDeleting(false);
  };

  const stats = {
    total: users.length,
    actifs: users.filter((u) => u.is_active).length,
    inactifs: users.filter((u) => !u.is_active).length,
  };

  return (
    <AppLayout>
      <RoleGuard permission="canManageDirection">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Users size={20} className="text-purple-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-zinc-900">Gestion des Utilisateurs</h1>
                <p className="text-sm text-zinc-500">Créer, modifier et gérer les accès utilisateurs</p>
              </div>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
            >
              <Plus size={16} />
              Nouvel utilisateur
            </button>
          </div>

          {/* Success message */}
          {successMsg && (
            <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              <ShieldCheck size={16} />
              {successMsg}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900">{stats.total}</p>
                <p className="text-xs text-zinc-500">Total utilisateurs</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                <UserCheck size={18} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900">{stats.actifs}</p>
                <p className="text-xs text-zinc-500">Actifs</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                <UserX size={18} className="text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900">{stats.inactifs}</p>
                <p className="text-xs text-zinc-500">Inactifs</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-zinc-200 p-4 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Rechercher par nom ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            >
              <option value="all">Tous les rôles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            >
              <option value="all">Tous les statuts</option>
              <option value="actif">Actifs</option>
              <option value="inactif">Inactifs</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-3 text-zinc-400">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm">Chargement des utilisateurs...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-zinc-400">
                <Users size={32} className="opacity-30" />
                <p className="text-sm">Aucun utilisateur trouvé</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Utilisateur</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Email</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Rôle</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Statut</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Créé le</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filtered.map((user) => (
                      <tr key={user.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                              <User size={14} className="text-teal-700" />
                            </div>
                            <span className="font-medium text-zinc-800">{user.full_name || '—'}</span>
                            {user.id === currentUser?.id && (
                              <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full font-semibold">Vous</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-600">{user.email}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${ROLE_COLORS[user.role]}`}>
                            {ROLE_LABELS[user.role]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            user.is_active
                              ? 'bg-green-100 text-green-700' :'bg-zinc-100 text-zinc-500'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-zinc-400'}`} />
                            {user.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-500 text-xs">
                          {new Date(user.created_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(user)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                              title="Modifier"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleToggleActive(user)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                user.is_active
                                  ? 'text-zinc-400 hover:text-orange-500 hover:bg-orange-50' :'text-zinc-400 hover:text-green-600 hover:bg-green-50'
                              }`}
                              title={user.is_active ? 'Désactiver' : 'Activer'}
                              disabled={user.id === currentUser?.id}
                            >
                              {user.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                            </button>
                            <button
                              onClick={() => setDeleteTarget(user)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Supprimer"
                              disabled={user.id === currentUser?.id}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Create / Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
                <h2 className="text-base font-semibold text-zinc-900">
                  {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
                </h2>
                <button onClick={closeModal} className="text-zinc-400 hover:text-zinc-600">
                  <X size={18} />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {error && (
                  <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Nom complet *</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      placeholder="Ex: Ahmed Benali"
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Email *</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="utilisateur@juiceops.fr"
                      disabled={!!editingUser}
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-zinc-50 disabled:text-zinc-400"
                    />
                  </div>
                  {editingUser && (
                    <p className="text-[11px] text-zinc-400 mt-1">L&apos;email ne peut pas être modifié.</p>
                  )}
                </div>

                {!editingUser && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Mot de passe *</label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Minimum 6 caractères"
                      className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Rôle *</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, is_active: !form.is_active })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      form.is_active ? 'bg-teal-500' : 'bg-zinc-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                        form.is_active ? 'translate-x-4' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-zinc-700">
                    Compte {form.is_active ? 'actif' : 'inactif'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-100">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-800 font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-60 transition-colors"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {editingUser ? 'Enregistrer' : 'Créer l\'utilisateur'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <div className="text-center">
                <h3 className="text-base font-semibold text-zinc-900">Supprimer l&apos;utilisateur</h3>
                <p className="text-sm text-zinc-500 mt-1">
                  Êtes-vous sûr de vouloir supprimer <strong>{deleteTarget.full_name}</strong> ? Cette action est irréversible.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 px-4 py-2 text-sm border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-60"
                >
                  {deleting && <Loader2 size={14} className="animate-spin" />}
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}
      </RoleGuard>
    </AppLayout>
  );
}
