'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Loader2, CheckCircle, Thermometer } from 'lucide-react';
import { toast } from 'sonner';

interface Releve {
  id: string;
  heure: string;
  zone: string;
  temp: number;
  statut: string;
  responsable: string;
}

interface ChambreFroide {
  id: string;
  nom: string;
}

export default function TemperatureRelevesTable() {
  const [releves, setReleves] = useState<Releve[]>([]);
  const [chambres, setChambres] = useState<ChambreFroide[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ zone: '', temperature: '', statut: 'ok', responsable: '', chambre_froide_id: '' });

  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    const [relevesResult, chambresResult] = await Promise.all([
      supabase.from('temperature_releves').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('chambres_froides').select('id, nom').eq('actif', true).order('nom'),
    ]);
    const relevesData = relevesResult.data;
    const chambresData = chambresResult.data;
    if (relevesData) {
      setReleves(relevesData.map((r: any) => ({
        id: r.id,
        heure: new Date(r.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        zone: r.zone,
        temp: r.temperature,
        statut: r.statut,
        responsable: r.responsable || '',
      })));
    }
    if (chambresData) setChambres(chambresData);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!form.zone.trim() || !form.temperature) {
      toast.error('Zone et température sont obligatoires');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('temperature_releves').insert([{
      zone: form.zone,
      temperature: parseFloat(form.temperature),
      statut: form.statut,
      responsable: form.responsable,
      chambre_froide_id: form.chambre_froide_id || null,
    }]);
    setSaving(false);
    if (error) {
      toast.error(`Erreur: ${error.message}`);
      return;
    }
    toast.success('Relevé de température enregistré');
    setShowForm(false);
    setForm({ zone: '', temperature: '', statut: 'ok', responsable: '', chambre_froide_id: '' });
    fetchData();
  };

  return (
    <div className="card-section h-full flex flex-col">
      <div className="section-header shrink-0">
        <h2 className="text-sm font-semibold text-zinc-800">Derniers relevés</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">{releves.length} relevés</span>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary text-xs py-1 px-2.5">
            <Plus size={12} /> Nouveau relevé
          </button>
        </div>
      </div>

      {showForm && (
        <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Zone *</label>
              {chambres.length > 0 ? (
                <select className="form-select text-xs py-1.5" value={form.chambre_froide_id} onChange={e => {
                  const chambre = chambres.find(c => c.id === e.target.value);
                  setForm(f => ({ ...f, chambre_froide_id: e.target.value, zone: chambre?.nom || f.zone }));
                }}>
                  <option value="">Saisie manuelle</option>
                  {chambres.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              ) : null}
              {!form.chambre_froide_id && (
                <input className="form-input text-xs py-1.5 mt-1" placeholder="Ex: Chambre froide 1" value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))} />
              )}
            </div>
            <div>
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Température (°C) *</label>
              <input type="number" step="0.1" className="form-input text-xs py-1.5 font-tabular" placeholder="0.0" value={form.temperature} onChange={e => {
                const val = parseFloat(e.target.value);
                const statut = isNaN(val) ? 'ok' : val > 6 ? 'danger' : val > 4 ? 'alerte' : 'ok';
                setForm(f => ({ ...f, temperature: e.target.value, statut }));
              }} />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Statut</label>
              <select className="form-select text-xs py-1.5" value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}>
                <option value="ok">OK</option>
                <option value="alerte">Alerte</option>
                <option value="danger">Danger</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Responsable</label>
              <input className="form-input text-xs py-1.5" placeholder="Nom" value={form.responsable} onChange={e => setForm(f => ({ ...f, responsable: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="btn-secondary text-xs py-1.5 flex-1">Annuler</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-xs py-1.5 flex-1">
              {saving ? <><Loader2 size={12} className="animate-spin" /> Enregistrement...</> : <><CheckCircle size={12} /> Enregistrer</>}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-y-auto flex-1">
          {releves.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
              <Thermometer size={24} className="mb-2" />
              <p className="text-sm">Aucun relevé enregistré</p>
            </div>
          ) : (
            releves.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  r.statut === 'danger' ? 'bg-red-500' :
                  r.statut === 'alerte' ? 'bg-amber-400' : 'bg-emerald-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-800 truncate">{r.zone}</p>
                  <p className="text-[10px] text-zinc-400">{r.responsable || <span className="text-red-400">Non assigné</span>}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold font-tabular ${
                    r.statut === 'danger' ? 'text-red-600' :
                    r.statut === 'alerte' ? 'text-amber-600' : 'text-zinc-700'
                  }`}>
                    {r.temp}°C
                  </p>
                  <p className="text-[10px] text-zinc-400">{r.heure}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}