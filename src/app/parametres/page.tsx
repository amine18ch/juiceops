'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import RoleGuard from '@/components/RoleGuard';
import { createClient } from '@/lib/supabase/client';
import { Settings, Save, Building2, Receipt, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface Parametre {
  id: string;
  cle: string;
  valeur: string;
  description: string;
}

const SECTIONS = [
  {
    title: 'Informations entreprise',
    icon: Building2,
    keys: [
      { cle: 'entreprise_nom',        label: 'Raison sociale',      type: 'text', placeholder: 'NaturalJuice SARL' },
      { cle: 'entreprise_adresse',    label: 'Adresse',             type: 'textarea', placeholder: '12 Rue des Orangers, Tunis' },
      { cle: 'entreprise_tel',        label: 'Téléphone',           type: 'text', placeholder: '+216 XX XXX XXX' },
      { cle: 'entreprise_email',      label: 'Email',               type: 'email', placeholder: 'contact@naturalljuice.com' },
      { cle: 'entreprise_matricule',  label: 'Matricule fiscal',    type: 'text', placeholder: '1234567/A/M/000' },
      { cle: 'entreprise_rib', label: 'RIB bancaire', type: 'text', placeholder: 'XX XXX XXXXXXXXXXXXXXXX XX' },
    ],
  },
  {
    title: 'Paramètres fiscaux',
    icon: Receipt,
    keys: [
      { cle: 'tva_standard',   label: 'TVA standard (%)',   type: 'number', placeholder: '19' },
      { cle: 'tva_reduit',     label: 'TVA réduite (%)',    type: 'number', placeholder: '7' },
      { cle: 'fodec',          label: 'FODEC (%)',          type: 'number', placeholder: '1' },
      { cle: 'timbre_fiscal',  label: 'Timbre fiscal (TND)', type: 'number', placeholder: '1' },
    ],
  },
];

export default function ParametresPage() {
  return (
    <AppLayout>
      <RoleGuard permission="canManageDirection">
        <ParametresContent />
      </RoleGuard>
    </AppLayout>
  );
}

function ParametresContent() {
  const supabase = useMemo(() => createClient(), []);
  const [params, setParams] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fetchParams = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('parametres').select('*');
    if (!error && data) {
      const map: Record<string, string> = {};
      (data as Parametre[]).forEach(p => { map[p.cle] = p.valeur; });
      setParams(map);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchParams(); }, [fetchParams]);

  const handleChange = (cle: string, val: string) => {
    setParams(prev => ({ ...prev, [cle]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      for (const [cle, valeur] of Object.entries(params)) {
        await supabase.from('parametres').update({ valeur }).eq('cle', cle);
      }
      setSuccess('Paramètres enregistrés avec succès.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-zinc-400">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Chargement des paramètres...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
            <Settings size={20} className="text-zinc-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Paramètres</h1>
            <p className="text-sm text-zinc-500">Configuration fiscale et informations entreprise</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-60 transition-colors"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm">
          <CheckCircle size={16} /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {SECTIONS.map(section => (
        <div key={section.title} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-zinc-100 bg-zinc-50">
            <section.icon size={16} className="text-teal-600" />
            <h2 className="text-sm font-semibold text-zinc-800">{section.title}</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            {section.keys.map(field => (
              <div key={field.cle}>
                <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
                  {field.label}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    rows={2}
                    value={params[field.cle] ?? ''}
                    onChange={e => handleChange(field.cle, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  />
                ) : (
                  <input
                    type={field.type}
                    value={params[field.cle] ?? ''}
                    onChange={e => handleChange(field.cle, e.target.value)}
                    placeholder={field.placeholder}
                    step={field.type === 'number' ? '0.01' : undefined}
                    min={field.type === 'number' ? '0' : undefined}
                    className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Recap fiscal */}
      <div className="bg-teal-50 border border-teal-200 rounded-2xl px-6 py-5">
        <h3 className="text-sm font-semibold text-teal-800 mb-3">Récapitulatif fiscal appliqué aux factures</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-teal-700">TVA standard</span>
            <span className="font-bold text-teal-900">{params['tva_standard'] ?? '19'} %</span>
          </div>
          <div className="flex justify-between">
            <span className="text-teal-700">TVA réduite</span>
            <span className="font-bold text-teal-900">{params['tva_reduit'] ?? '7'} %</span>
          </div>
          <div className="flex justify-between">
            <span className="text-teal-700">FODEC</span>
            <span className="font-bold text-teal-900">{params['fodec'] ?? '1'} %</span>
          </div>
          <div className="flex justify-between">
            <span className="text-teal-700">Timbre fiscal</span>
            <span className="font-bold text-teal-900">{params['timbre_fiscal'] ?? '1'} TND</span>
          </div>
        </div>
      </div>
    </div>
  );
}
