'use client';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertTriangle, Loader2, Box, Mic, MicOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useVoiceTranscription } from '@/hooks/useVoiceTranscription';
import MediaErrorBoundary from '@/components/MediaErrorBoundary';

type EmballageFormData = {
  fournisseur: string;
  reference: string;
  numerolot: string;
  quantite: string;
  typeEmballage: string;
  integrite: string;
  proprete: string;
  odeur: string;
  etiquetage: string;
  dimensions: string;
  responsable: string;
  observations: string;
};

const fournisseursEmballage = [
  'PackSud SARL', 'Embaltech France', 'VerdePack', 'BottleFirst', 'EcoContain',
];

const typesEmballage = [
  'Bouteilles PET 25cl', 'Bouteilles PET 50cl', 'Bouteilles verre 1L',
  'Cartons d\'expédition', 'Bouchons', 'Étiquettes', 'Films rétractables',
];

const ScoreField = ({
  label,
  name,
  weight,
  register,
  watch,
}: {
  label: string;
  name: keyof EmballageFormData;
  weight: number;
  register: ReturnType<typeof useForm<EmballageFormData>>['register'];
  watch: ReturnType<typeof useForm<EmballageFormData>>['watch'];
}) => {
  const val = parseInt(watch(name) || '0');
  const scores = [1, 2, 3, 4, 5];
  return (
    <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/50">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-zinc-700">{label}</label>
        <span className="text-[10px] text-zinc-400">Poids: {weight}%</span>
      </div>
      <div className="flex gap-1.5">
        {scores.map((s) => (
          <label key={`score-emb-${name}-${s}`} className="flex-1 cursor-pointer">
            <input type="radio" value={String(s)} {...register(name, { required: true })} className="sr-only peer" />
            <div className={`h-8 rounded border-2 flex items-center justify-center text-xs font-bold transition-all duration-100 peer-checked:scale-105 ${
              val === s
                ? s <= 2 ? 'bg-red-500 border-red-500 text-white' :
                  s === 3 ? 'bg-amber-400 border-amber-400 text-white': 'bg-emerald-500 border-emerald-500 text-white' :'border-zinc-200 text-zinc-400 hover:border-zinc-400'
            }`}>
              {s}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};

export default function EmballageForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fournisseursList, setFournisseursList] = useState<string[]>(fournisseursEmballage);

  useEffect(() => {
    const fetchFournisseurs = async () => {
      const supabase = createClient();
      const { data } = await supabase.from('fournisseurs').select('nom').eq('actif', true).order('nom');
      if (data && data.length > 0) setFournisseursList(data.map((f: { nom: string }) => f.nom));
    };
    fetchFournisseurs();
  }, []);

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<EmballageFormData>({
    defaultValues: { responsable: 'Marie Leconte' },
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

  const integrite = parseInt(watch('integrite') || '0');
  const proprete = parseInt(watch('proprete') || '0');
  const odeur = parseInt(watch('odeur') || '0');
  const etiquetage = parseInt(watch('etiquetage') || '0');
  const dimensions = parseInt(watch('dimensions') || '0');

  // Pondération: intégrité 35%, propreté 25%, odeur 15%, étiquetage 15%, dimensions 10%
  const scoreGlobal = integrite && proprete && odeur && etiquetage && dimensions
    ? Math.round(
        (integrite * 35 + proprete * 25 + odeur * 15 + etiquetage * 15 + dimensions * 10) / 5
      )
    : 0;

  const scorePercent = Math.round((scoreGlobal / 5) * 100);
  const isConform = scorePercent >= 80;

  // Backend integration point: POST /api/emballages/controles
  const onSubmit = async (data: EmballageFormData) => {
    setIsSubmitting(true);

    const supabase = createClient();
    const { error: insertError } = await supabase.from('emballage_controles').insert([{
      fournisseur: data.fournisseur,
      reference: data.reference,
      numero_lot: data.numerolot,
      quantite: parseFloat(data.quantite),
      type_emballage: data.typeEmballage,
      score_integrite: parseInt(data.integrite) || null,
      score_proprete: parseInt(data.proprete) || null,
      score_odeur: parseInt(data.odeur) || null,
      score_etiquetage: parseInt(data.etiquetage) || null,
      score_dimensions: parseInt(data.dimensions) || null,
      score_global: scoreGlobal,
      score_percent: scorePercent,
      conforme: isConform,
      responsable: data.responsable,
      observations: data.observations || '',
    }]);

    setIsSubmitting(false);

    if (insertError) {
      toast.error(`Erreur d'enregistrement: ${insertError.message}`);
      return;
    }

    if (!isConform) {
      toast.error(`Contrôle emballage refusé — Score ${scorePercent}% < seuil 80% — Anomalie créée`, { duration: 6000 });
    } else {
      toast.success(`Contrôle emballage validé — Score ${scorePercent}% — Lot ${data.numerolot} conforme`);
    }
    reset();
    resetVoice();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Identification */}
      <div className="card-section">
        <div className="section-header">
          <div className="flex items-center gap-2">
            <Box size={16} className="text-teal-700" />
            <h2 className="text-sm font-semibold text-zinc-800">Identification de la livraison</h2>
          </div>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="form-label">Fournisseur emballage <span className="text-red-500">*</span></label>
            <select className="form-select" {...register('fournisseur', { required: 'Fournisseur obligatoire' })}>
              <option value="">Sélectionner</option>
              {fournisseursList.map((f) => (
                <option key={`emb-fourn-${f}`} value={f}>{f}</option>
              ))}
            </select>
            {errors.fournisseur && <p className="form-error">{errors.fournisseur.message}</p>}
          </div>

          <div>
            <label className="form-label">Type d&apos;emballage <span className="text-red-500">*</span></label>
            <select className="form-select" {...register('typeEmballage', { required: 'Type obligatoire' })}>
              <option value="">Sélectionner</option>
              {typesEmballage.map((t) => (
                <option key={`emb-type-${t}`} value={t}>{t}</option>
              ))}
            </select>
            {errors.typeEmballage && <p className="form-error">{errors.typeEmballage.message}</p>}
          </div>

          <div>
            <label className="form-label">Référence produit <span className="text-red-500">*</span></label>
            <input
              className="form-input"
              placeholder="ex: REF-PET-50CL"
              {...register('reference', { required: 'Référence obligatoire' })}
            />
            {errors.reference && <p className="form-error">{errors.reference.message}</p>}
          </div>

          <div>
            <label className="form-label">N° de lot <span className="text-red-500">*</span></label>
            <input
              className="form-input font-mono"
              placeholder="ex: EMB-2026-013"
              {...register('numerolot', { required: 'N° lot obligatoire' })}
            />
            {errors.numerolot && <p className="form-error">{errors.numerolot.message}</p>}
          </div>

          <div>
            <label className="form-label">Quantité reçue <span className="text-red-500">*</span></label>
            <input
              type="number"
              className="form-input font-tabular"
              placeholder="0"
              {...register('quantite', { required: 'Quantité obligatoire' })}
            />
            {errors.quantite && <p className="form-error">{errors.quantite.message}</p>}
          </div>

          <div>
            <label className="form-label">Contrôleur</label>
            <input className="form-input" {...register('responsable')} />
          </div>
        </div>
      </div>

      {/* Critères qualité */}
      <div className="card-section">
        <div className="section-header">
          <h2 className="text-sm font-semibold text-zinc-800">Critères de contrôle qualité</h2>
          <p className="text-xs text-zinc-400">Score 1 (non-conforme) → 5 (excellent)</p>
        </div>
        <div className="p-5 grid grid-cols-1 gap-3">
          <ScoreField label="Intégrité (absence de déformation, fissure, casse)" name="integrite" weight={35} register={register} watch={watch} />
          <ScoreField label="Propreté (absence de souillure, poussière, corps étranger)" name="proprete" weight={25} register={register} watch={watch} />
          <ScoreField label="Odeur (neutre, sans odeur chimique ou parasite)" name="odeur" weight={15} register={register} watch={watch} />
          <ScoreField label="Étiquetage (mentions légales, traçabilité, EAN lisible)" name="etiquetage" weight={15} register={register} watch={watch} />
          <ScoreField label="Dimensions (conformité au cahier des charges)" name="dimensions" weight={10} register={register} watch={watch} />
        </div>
      </div>

      {/* Score & Décision */}
      {scorePercent > 0 && (
        <div className={`card-section p-5 border-2 ${isConform ? 'border-emerald-300 bg-emerald-50/30' : 'border-red-300 bg-red-50/30'} animate-slide-up`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-zinc-800">Score global calculé</h3>
            <div className="flex items-center gap-2">
              {isConform
                ? <><CheckCircle size={18} className="text-emerald-600" /><span className="text-sm font-bold text-emerald-700">CONFORME</span></>
                : <><XCircle size={18} className="text-red-600" /><span className="text-sm font-bold text-red-700">NON CONFORME</span></>
              }
            </div>
          </div>
          <div className="flex items-end gap-4 mb-3">
            <p className={`text-5xl font-bold font-tabular ${isConform ? 'text-emerald-700' : 'text-red-700'}`}>
              {scorePercent}<span className="text-2xl font-medium">%</span>
            </p>
            <div className="flex-1 pb-2">
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>0%</span>
                <span className="text-zinc-600 font-medium">Seuil 80%</span>
                <span>100%</span>
              </div>
              <div className="relative h-3 bg-zinc-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isConform ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{ width: `${scorePercent}%` }}
                />
                <div className="absolute top-0 h-full w-0.5 bg-zinc-500" style={{ left: '80%' }} />
              </div>
            </div>
          </div>
          {!isConform && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-100 border border-red-300 text-xs text-red-700">
              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
              <span>Score insuffisant — Le lot sera refusé et une anomalie sera créée automatiquement lors de la validation</span>
            </div>
          )}
        </div>
      )}

      {/* Observations */}
      <div className="card-section p-5">
        <div className="flex items-center justify-between mb-2">
          <label className="form-label mb-0">Observations complémentaires</label>
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
          placeholder="Remarques sur la livraison, défauts observés, actions demandées au fournisseur..."
          {...register('observations')}
        />
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between gap-3 sticky bottom-4 bg-white border border-zinc-200 rounded-xl shadow-lg px-5 py-4">
        <p className="text-xs text-zinc-400">
          {scorePercent > 0 && (
            isConform
              ? <span className="text-emerald-600 font-medium">✓ Emballages conformes — Acceptation en stock</span>
              : <span className="text-red-600 font-medium">⚠ Non-conforme — Anomalie créée automatiquement</span>
          )}
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={() => { reset(); resetVoice(); }} className="btn-secondary">Réinitialiser</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting
              ? <><Loader2 size={14} className="animate-spin" /> Enregistrement...</>
              : <><CheckCircle size={14} /> Valider le contrôle</>
            }
          </button>
        </div>
      </div>
    </form>
  );
}