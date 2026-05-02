'use client';
import React, { useState } from 'react';
import { Thermometer, AlertTriangle, CheckCircle, Plus, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import Modal from '@/components/ui/Modal';

type ZoneStatus = 'ok' | 'alerte' | 'danger';

interface Zone {
  id: string;
  nom: string;
  temperature: number;
  seuilMin: number;
  seuilMax: number;
  status: ZoneStatus;
  dernierReleve: string;
  responsable: string;
  description: string;
}

const zones: Zone[] = [
  { id: 'zone-cf1', nom: 'Chambre froide 1', temperature: 2.1, seuilMin: 0, seuilMax: 4, status: 'ok', dernierReleve: '09:25', responsable: 'T. Martin', description: 'Fruits frais — oranges, citrons' },
  { id: 'zone-cf2', nom: 'Chambre froide 2', temperature: 6.1, seuilMin: 0, seuilMax: 4, status: 'danger', dernierReleve: '09:12', responsable: 'M. Leconte', description: 'Légumes frais — carottes, betteraves' },
  { id: 'zone-frigo-prep', nom: 'Frigo Préparation A', temperature: 4.3, seuilMin: 0, seuilMax: 6, status: 'ok', dernierReleve: '09:20', responsable: 'S. Benali', description: 'Produits en cours de préparation' },
  { id: 'zone-prod-a', nom: 'Zone Production A', temperature: 18.2, seuilMin: 10, seuilMax: 15, status: 'danger', dernierReleve: '09:05', responsable: '', description: 'Ligne extraction — presses et filtres' },
  { id: 'zone-stockage', nom: 'Stock produits finis', temperature: 3.8, seuilMin: 0, seuilMax: 4, status: 'alerte', dernierReleve: '09:28', responsable: 'L. Dupont', description: 'Jus conditionnés avant expédition' },
];

type ReleveForm = { zone: string; temperature: string; responsable: string; observations: string };

export default function TemperatureZoneCards() {
  const [modalReleve, setModalReleve] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ReleveForm>();

  // Backend integration point: POST /api/temperatures/releves
  const onSubmit = async (data: ReleveForm) => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    const temp = parseFloat(data.temperature);
    const zone = zones.find((z) => z.id === data.zone);
    if (zone && (temp < zone.seuilMin || temp > zone.seuilMax)) {
      toast.error(`Température hors seuil — Anomalie créée automatiquement pour ${zone.nom}`, { duration: 6000 });
    } else {
      toast.success('Relevé enregistré avec succès');
    }
    setIsSaving(false);
    setModalReleve(false);
    reset();
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-zinc-600">{zones.length} zones surveillées</p>
        <button onClick={() => setModalReleve(true)} className="btn-primary text-xs py-1.5">
          <Plus size={13} /> Saisir un relevé
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-5 gap-4">
        {zones.map((zone) => {
          const isOk = zone.status === 'ok';
          const isAlerte = zone.status === 'alerte';
          const isDanger = zone.status === 'danger';

          return (
            <div
              key={zone.id}
              className={`rounded-xl border-2 p-4 shadow-sm ${
                isDanger ? 'bg-red-50 border-red-400 animate-pulse-slow' : isAlerte ?'bg-amber-50 border-amber-300': 'bg-white border-emerald-200'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-1.5 rounded-lg ${isDanger ? 'bg-red-100' : isAlerte ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                  <Thermometer size={15} className={isDanger ? 'text-red-600' : isAlerte ? 'text-amber-600' : 'text-emerald-600'} />
                </div>
                {isDanger && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 border border-red-300 px-1.5 py-0.5 rounded">
                    <AlertTriangle size={9} /> DANGER
                  </span>
                )}
                {isAlerte && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">
                    <AlertTriangle size={9} /> ALERTE
                  </span>
                )}
                {isOk && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded">
                    <CheckCircle size={9} /> OK
                  </span>
                )}
              </div>

              <p className="text-xs font-semibold text-zinc-700 mb-1 leading-tight">{zone.nom}</p>
              <p className="text-[10px] text-zinc-400 mb-3 leading-tight">{zone.description}</p>

              <div className="mb-3">
                <p className={`text-3xl font-bold font-tabular ${isDanger ? 'text-red-700' : isAlerte ? 'text-amber-700' : 'text-zinc-800'}`}>
                  {zone.temperature}
                  <span className="text-lg font-medium ml-0.5">°C</span>
                </p>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  Seuil: {zone.seuilMin}°C — {zone.seuilMax}°C
                </p>
              </div>

              {/* Temperature bar */}
              <div className="relative h-2 bg-zinc-100 rounded-full overflow-hidden mb-3">
                <div
                  className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
                    isDanger ? 'bg-red-500' : isAlerte ? 'bg-amber-400' : 'bg-emerald-500'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(5, ((zone.temperature - zone.seuilMin) / (zone.seuilMax * 1.5 - zone.seuilMin)) * 100))}%`,
                  }}
                />
                {/* Seuil max marker */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-zinc-400 opacity-60"
                  style={{
                    left: `${((zone.seuilMax - zone.seuilMin) / (zone.seuilMax * 1.5 - zone.seuilMin)) * 100}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[10px] text-zinc-400">Relevé {zone.dernierReleve}</p>
                {zone.responsable ? (
                  <p className="text-[10px] text-zinc-500 font-medium">{zone.responsable}</p>
                ) : (
                  <p className="text-[10px] text-red-500 font-medium">Non assigné</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Saisie relevé modal */}
      <Modal open={modalReleve} onClose={() => { setModalReleve(false); reset(); }} title="Saisir un relevé de température" size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="form-label">Zone <span className="text-red-500">*</span></label>
            <select className="form-select" {...register('zone', { required: 'Zone obligatoire' })}>
              <option value="">Sélectionner une zone</option>
              {zones.map((z) => (
                <option key={`releve-zone-${z.id}`} value={z.id}>{z.nom}</option>
              ))}
            </select>
            {errors.zone && <p className="form-error">{errors.zone.message}</p>}
          </div>

          <div>
            <label className="form-label">Température relevée (°C) <span className="text-red-500">*</span></label>
            <p className="form-helper">Une anomalie sera créée automatiquement si la valeur dépasse le seuil HACCP</p>
            <input
              type="number"
              step="0.1"
              className="form-input font-tabular text-lg"
              placeholder="0.0"
              {...register('temperature', {
                required: 'Température obligatoire',
                pattern: { value: /^-?\d+(\.\d{1,2})?$/, message: 'Valeur numérique requise' },
              })}
            />
            {errors.temperature && <p className="form-error">{errors.temperature.message}</p>}
          </div>

          <div>
            <label className="form-label">Responsable</label>
            <select className="form-select" {...register('responsable')}>
              <option value="">Sélectionner</option>
              <option value="T. Martin">T. Martin</option>
              <option value="M. Leconte">M. Leconte</option>
              <option value="S. Benali">S. Benali</option>
              <option value="L. Dupont">L. Dupont</option>
            </select>
          </div>

          <div>
            <label className="form-label">Observations</label>
            <textarea
              rows={2}
              className="form-input resize-none"
              placeholder="Remarques éventuelles..."
              {...register('observations')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-zinc-100">
            <button type="button" onClick={() => { setModalReleve(false); reset(); }} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={isSaving} className="btn-primary">
              {isSaving ? <><Loader2 size={14} className="animate-spin" /> Enregistrement...</> : <><CheckCircle size={14} /> Enregistrer le relevé</>}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}