'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { FlaskConical, Thermometer, Loader2, CheckCircle, AlertTriangle, Printer, ClipboardList, Mic, MicOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useVoiceTranscription } from '@/hooks/useVoiceTranscription';
import MediaErrorBoundary from '@/components/MediaErrorBoundary';

type EchantillonnageFormData = {
  produit: string;
  reference: string;
  numerolot: string;
  datePrelevement: string;
  heureLivraison: string;
  temperaturePrelevement: string;
  client: string;
  typeEchantillon: string;
  quantitePrelevee: string;
  unitePrelevement: string;
  pointPrelevement: string;
  operateur: string;
  destinataire: string;
  objetAnalyse: string[];
  conditionsTransport: string;
  observations: string;
  statutEchantillon: 'conforme' | 'non_conforme' | 'en_attente';
};

const produits = [
  'Jus d\'orange frais', 'Jus de pomme', 'Smoothie mangue-passion',
  'Jus de carotte-gingembre', 'Jus de betterave', 'Jus multifruits',
  'Smoothie vert épinards', 'Jus de citron concentré',
];

const clients = [
  'Carrefour Market', 'Monoprix', 'Biocoop', 'Leclerc',
  'Intermarché', 'Casino', 'Auchan', 'Picard', 'Restauration collective',
];

const pointsPrelevement = [
  'Ligne production A — sortie presse',
  'Ligne production B — sortie presse',
  'Cuve de mélange 1',
  'Cuve de mélange 2',
  'Poste de remplissage',
  'Chambre froide 1 — stock produit fini',
  'Chambre froide 2 — stock produit fini',
  'Quai expédition',
];

const destinataires = [
  'Laboratoire interne', 'Eurofins Analyses', 'SGS France',
  'Bureau Veritas', 'Intertek', 'Laboratoire COFRAC',
];

const objetAnalyses = [
  'Microbiologie (germes totaux, E.coli, Salmonella)',
  'Physico-chimie (pH, Brix, acidité)',
  'Métaux lourds',
  'Pesticides / résidus',
  'Allergènes',
  'Durée de vie (DLC test)',
  'Organoleptique (couleur, goût, odeur)',
  'Vitamines et nutriments',
];

interface EchantillonnageFormProps {
  onSaved?: () => void;
}

export default function EchantillonnageForm({ onSaved }: EchantillonnageFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tempAlert, setTempAlert] = useState<string | null>(null);
  const [selectedAnalyses, setSelectedAnalyses] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<EchantillonnageFormData>({
    defaultValues: {
      operateur: 'Marie Leconte',
      unitePrelevement: 'ml',
      statutEchantillon: 'en_attente',
      datePrelevement: new Date().toISOString().split('T')[0],
    },
  });

  // Voice transcription for observations field
  const {
    isRecording: isVoiceRecording,
    isSupported: isVoiceSupported,
    errorMessage: voiceErrorMessage,
    toggleRecording: handleVocalClick,
    resetTranscript: resetVoice,
  } = useVoiceTranscription({
    lang: 'fr-FR',
    onTranscript: (text) => setValue('observations', text),
    onError: (_type, msg) => toast.error(msg, { duration: 6000 }),
  });

  const handleTempChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      if (val > 4) {
        setTempAlert(`⚠ Température ${val}°C dépasse le seuil (max 4°C) — Conditions de prélèvement non conformes`);
      } else if (val < 0) {
        setTempAlert(`⚠ Température ${val}°C — Vérifier les conditions de stockage`);
      } else {
        setTempAlert(null);
      }
    }
  };

  const toggleAnalyse = (analyse: string) => {
    setSelectedAnalyses((prev) =>
      prev.includes(analyse) ? prev.filter((a) => a !== analyse) : [...prev, analyse]
    );
  };

  const onSubmit = async (data: EchantillonnageFormData) => {
    if (selectedAnalyses.length === 0) {
      toast.error('Sélectionnez au moins un objectif d\'analyse');
      return;
    }
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const year = new Date().getFullYear();
      const refEch = `ECH-${year}-${Math.floor(Math.random() * 900 + 100)}`;

      const { error } = await supabase.from('echantillonnage').insert({
        reference: refEch,
        produit: data.produit,
        reference_produit: data.reference,
        numero_lot: data.numerolot,
        date_prelevement: data.datePrelevement,
        heure_livraison: data.heureLivraison,
        temperature_prelevement: parseFloat(data.temperaturePrelevement),
        client: data.client || null,
        type_echantillon: data.typeEchantillon,
        quantite_prelevee: parseFloat(data.quantitePrelevee),
        unite_prelevement: data.unitePrelevement,
        point_prelevement: data.pointPrelevement,
        operateur: data.operateur,
        destinataire: data.destinataire,
        objet_analyse: selectedAnalyses,
        conditions_transport: data.conditionsTransport || null,
        observations: data.observations || null,
        statut: data.statutEchantillon,
      });

      if (error) throw error;

      toast.success(`Échantillon ${refEch} enregistré — Envoi vers ${data.destinataire}`, { duration: 5000 });

      if (tempAlert) {
        toast.warning('Conditions de température non conformes — Vérification requise', { duration: 4000 });
      }

      reset();
      setSelectedAnalyses([]);
      setTempAlert(null);
      resetVoice();
      onSaved?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Identification produit */}
      <div className="card-section">
        <div className="section-header">
          <div className="flex items-center gap-2">
            <FlaskConical size={16} className="text-teal-700" />
            <h2 className="text-sm font-semibold text-zinc-800">Identification du prélèvement</h2>
          </div>
          <button type="button" className="btn-secondary text-xs py-1.5 px-2.5">
            <Printer size={13} /> Étiquette
          </button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="form-label">Produit <span className="text-red-500">*</span></label>
            <select
              className="form-select"
              {...register('produit', { required: 'Produit obligatoire' })}
            >
              <option value="">Sélectionner un produit</option>
              {produits.map((p) => (
                <option key={`ech-prod-${p}`} value={p}>{p}</option>
              ))}
            </select>
            {errors.produit && <p className="form-error">{errors.produit.message}</p>}
          </div>

          <div>
            <label className="form-label">Référence produit <span className="text-red-500">*</span></label>
            <input
              className="form-input font-mono"
              placeholder="ex: JUS-OR-25CL"
              {...register('reference', { required: 'Référence obligatoire' })}
            />
            {errors.reference && <p className="form-error">{errors.reference.message}</p>}
          </div>

          <div>
            <label className="form-label">N° de lot <span className="text-red-500">*</span></label>
            <input
              className="form-input font-mono"
              placeholder="ex: L-2026-042"
              {...register('numerolot', { required: 'N° lot obligatoire' })}
            />
            {errors.numerolot && <p className="form-error">{errors.numerolot.message}</p>}
          </div>

          <div>
            <label className="form-label">Type d&apos;échantillon <span className="text-red-500">*</span></label>
            <select
              className="form-select"
              {...register('typeEchantillon', { required: 'Type obligatoire' })}
            >
              <option value="">Sélectionner</option>
              <option value="matiere_premiere">Matière première</option>
              <option value="en_cours">En cours de fabrication</option>
              <option value="produit_fini">Produit fini</option>
              <option value="eau_process">Eau de process</option>
              <option value="surface">Surface / environnement</option>
              <option value="emballage">Emballage contact</option>
            </select>
            {errors.typeEchantillon && <p className="form-error">{errors.typeEchantillon.message}</p>}
          </div>

          <div>
            <label className="form-label">Point de prélèvement <span className="text-red-500">*</span></label>
            <select
              className="form-select"
              {...register('pointPrelevement', { required: 'Point de prélèvement obligatoire' })}
            >
              <option value="">Sélectionner</option>
              {pointsPrelevement.map((p) => (
                <option key={`point-${p}`} value={p}>{p}</option>
              ))}
            </select>
            {errors.pointPrelevement && <p className="form-error">{errors.pointPrelevement.message}</p>}
          </div>
        </div>
      </div>

      {/* Conditions de prélèvement */}
      <div className="card-section">
        <div className="section-header">
          <div className="flex items-center gap-2">
            <Thermometer size={16} className="text-teal-700" />
            <h2 className="text-sm font-semibold text-zinc-800">Conditions de prélèvement</h2>
          </div>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Date de prélèvement <span className="text-red-500">*</span></label>
            <input
              type="date"
              className="form-input"
              {...register('datePrelevement', { required: 'Date obligatoire' })}
            />
            {errors.datePrelevement && <p className="form-error">{errors.datePrelevement.message}</p>}
          </div>

          <div>
            <label className="form-label">Heure de livraison <span className="text-red-500">*</span></label>
            <input
              type="time"
              className="form-input"
              {...register('heureLivraison', { required: 'Heure obligatoire' })}
            />
            {errors.heureLivraison && <p className="form-error">{errors.heureLivraison.message}</p>}
          </div>

          <div>
            <label className="form-label">
              Température au prélèvement (°C) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Thermometer size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="number"
                step="0.1"
                className="form-input pl-8 font-tabular"
                placeholder="0.0"
                {...register('temperaturePrelevement', {
                  required: 'Température obligatoire',
                  min: { value: -30, message: 'Valeur trop basse' },
                  max: { value: 50, message: 'Valeur trop haute' },
                })}
                onChange={handleTempChange}
              />
            </div>
            {errors.temperaturePrelevement && (
              <p className="form-error">{errors.temperaturePrelevement.message}</p>
            )}
            {tempAlert && (
              <div className="mt-1.5 flex items-start gap-1.5 p-2 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-700">
                <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                <span>{tempAlert}</span>
              </div>
            )}
          </div>

          <div>
            <label className="form-label">Conditions de transport</label>
            <select className="form-select" {...register('conditionsTransport')}>
              <option value="refrigere">Réfrigéré (0–4°C)</option>
              <option value="ambiant">Ambiant</option>
              <option value="congelé">Congelé (-18°C)</option>
              <option value="glace">Sous glace</option>
            </select>
          </div>

          <div>
            <label className="form-label">Quantité prélevée <span className="text-red-500">*</span></label>
            <input
              type="number"
              step="0.1"
              className="form-input font-tabular"
              placeholder="0.0"
              {...register('quantitePrelevee', { required: 'Quantité obligatoire', min: { value: 0.1, message: 'Valeur positive' } })}
            />
            {errors.quantitePrelevee && <p className="form-error">{errors.quantitePrelevee.message}</p>}
          </div>

          <div>
            <label className="form-label">Unité</label>
            <select className="form-select" {...register('unitePrelevement')}>
              <option value="ml">ml</option>
              <option value="g">g</option>
              <option value="L">L</option>
              <option value="kg">kg</option>
              <option value="unites">Unités</option>
            </select>
          </div>
        </div>
      </div>

      {/* Destination & analyses */}
      <div className="card-section">
        <div className="section-header">
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className="text-teal-700" />
            <h2 className="text-sm font-semibold text-zinc-800">Destination &amp; objectifs d&apos;analyse</h2>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Client concerné</label>
              <select className="form-select" {...register('client')}>
                <option value="">Aucun (interne)</option>
                {clients.map((c) => (
                  <option key={`ech-client-${c}`} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Destinataire laboratoire <span className="text-red-500">*</span></label>
              <select
                className="form-select"
                {...register('destinataire', { required: 'Destinataire obligatoire' })}
              >
                <option value="">Sélectionner</option>
                {destinataires.map((d) => (
                  <option key={`dest-${d}`} value={d}>{d}</option>
                ))}
              </select>
              {errors.destinataire && <p className="form-error">{errors.destinataire.message}</p>}
            </div>

            <div>
              <label className="form-label">Opérateur</label>
              <input className="form-input" {...register('operateur')} />
            </div>

            <div>
              <label className="form-label">Statut initial</label>
              <select className="form-select" {...register('statutEchantillon')}>
                <option value="en_attente">En attente d&apos;analyse</option>
                <option value="conforme">Conforme</option>
                <option value="non_conforme">Non conforme</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">
              Objectifs d&apos;analyse <span className="text-red-500">*</span>
              <span className="ml-1 text-zinc-400 font-normal">({selectedAnalyses.length} sélectionné(s))</span>
            </label>
            <div className="grid grid-cols-1 gap-2 mt-1">
              {objetAnalyses.map((analyse) => (
                <label
                  key={`analyse-${analyse}`}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-150 ${
                    selectedAnalyses.includes(analyse)
                      ? 'border-teal-400 bg-teal-50' : 'border-zinc-200 bg-zinc-50/50 hover:border-zinc-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-teal-600"
                    checked={selectedAnalyses.includes(analyse)}
                    onChange={() => toggleAnalyse(analyse)}
                  />
                  <span className={`text-xs ${selectedAnalyses.includes(analyse) ? 'text-teal-800 font-medium' : 'text-zinc-600'}`}>
                    {analyse}
                  </span>
                  {selectedAnalyses.includes(analyse) && (
                    <CheckCircle size={13} className="ml-auto text-teal-600 shrink-0" />
                  )}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Observations */}
      <div className="card-section p-5">
        <div className="flex items-center justify-between mb-2">
          <label className="form-label mb-0">Observations / Remarques particulières</label>
          <MediaErrorBoundary type="voice" fallbackMessage="Vocal indisponible">
            {isVoiceSupported ? (
              <button
                type="button"
                onClick={handleVocalClick}
                className={`flex items-center gap-1 text-xs py-1 px-2.5 rounded-md border font-medium transition-colors ${
                  isVoiceRecording
                    ? 'bg-red-50 border-red-300 text-red-600 animate-pulse' :'btn-secondary'
                }`}
              >
                {isVoiceRecording ? <MicOff size={12} /> : <Mic size={12} />}
                {isVoiceRecording ? 'Stop' : 'Vocal'}
              </button>
            ) : (
              <span className="flex items-center gap-1 text-xs text-zinc-400 px-2 py-1 border border-zinc-200 rounded-md bg-zinc-50">
                <MicOff size={12} /> Vocal indisponible
              </span>
            )}
          </MediaErrorBoundary>
        </div>
        {voiceErrorMessage && (
          <div className="mb-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
            <AlertTriangle size={12} className="shrink-0 mt-0.5 text-amber-500" />
            <span>{voiceErrorMessage}</span>
          </div>
        )}
        <textarea
          rows={3}
          className="form-input resize-none"
          placeholder="Conditions particulières, anomalies observées lors du prélèvement, informations complémentaires..."
          {...register('observations')}
        />
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between gap-3 sticky bottom-4 bg-white border border-zinc-200 rounded-xl shadow-lg px-5 py-4">
        <p className="text-xs text-zinc-400">
          {selectedAnalyses.length > 0
            ? <span className="text-teal-600 font-medium">✓ {selectedAnalyses.length} analyse(s) sélectionnée(s)</span>
            : <span className="text-amber-600 font-medium">⚠ Sélectionnez au moins un objectif d&apos;analyse</span>
          }
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { reset(); setSelectedAnalyses([]); setTempAlert(null); resetVoice(); }}
            className="btn-secondary text-xs py-2 px-4"
          >
            Réinitialiser
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary text-xs py-2 px-5"
          >
            {isSubmitting ? (
              <><Loader2 size={13} className="animate-spin" /> Enregistrement...</>
            ) : (
              <><FlaskConical size={13} /> Enregistrer l&apos;échantillon</>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
