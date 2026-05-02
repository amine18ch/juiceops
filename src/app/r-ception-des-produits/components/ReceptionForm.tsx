'use client';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  AlertTriangle, CheckCircle, XCircle, Package,
  Thermometer, Calendar, Hash, Scale, Loader2,
  Camera, Mic, MicOff, ShieldAlert, Info, X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { usePhotoCapture } from '@/hooks/usePhotoCapture';
import { useVoiceTranscription } from '@/hooks/useVoiceTranscription';
import MediaErrorBoundary from '@/components/MediaErrorBoundary';

export type ReceptionEntry = {
  id: string;
  heure: string;
  lot: string;
  produit: string;
  fournisseur: string;
  quantite: string;
  statut: 'accepte' | 'refuse' | 'en_attente';
  operateur: string;
  alerte: string | null;
  temperature: number;
  dlc: string;
  anomalieId?: string;
};

export type AnomalieEntry = {
  id: string;
  date: string;
  type: string;
  description: string;
  lot: string;
  fournisseur: string;
  produit: string;
  statut: 'ouverte' | 'en_cours' | 'resolue';
  createdAt: string;
};

type ReceptionFormData = {
  fournisseur: string;
  produit: string;
  categorie: string;
  quantite: string;
  unite: string;
  numerolot: string;
  dlc: string;
  temperatureReception: string;
  poidsVerifie: boolean;
  couleur: string;
  odeur: string;
  texture: string;
  gout: string;
  decision: 'accepte' | 'refuse' | '';
  motifRefus: string;
  observations: string;
  operateur: string;
};

// Temperature thresholds per category (°C)
const TEMP_THRESHOLDS: Record<string, { max: number; label: string }> = {
  'fruits-frais': { max: 4, label: 'Fruits frais' },
  'legumes': { max: 6, label: 'Légumes' },
  'epices': { max: 20, label: 'Épices (ambiante)' },
  'surges': { max: -15, label: 'Surgelés' },
  'emballages': { max: 30, label: 'Emballages (ambiante)' },
};

// DLC alert thresholds (days)
const DLC_CRITICAL_DAYS = 0;   // expired
const DLC_WARNING_DAYS = 3;    // very close
const DLC_ALERT_DAYS = 7;      // approaching

const fournisseurs = [
  'Agrumes Bio SARL', 'SunFruit Maroc', 'Vergers du Nord',
  'Épices & Co', 'Tropic Import', 'Ferme Lévêque', 'BioFresh Sud',
];

const produits = [
  'Oranges Valencia', 'Citrons Bio', 'Pommes Gala', 'Mangues Alphonso',
  'Gingembre frais', 'Carottes BIO', 'Ananas Victoria', 'Betteraves rouge',
  'Framboises', 'Myrtilles', 'Pastèque', 'Maracuja',
];

const ScoreSelector = ({
  label,
  name,
  register,
  error,
  watch,
}: {
  label: string;
  name: keyof ReceptionFormData;
  register: ReturnType<typeof useForm<ReceptionFormData>>['register'];
  error?: string;
  watch: (name: keyof ReceptionFormData) => string;
}) => {
  const scores = [
    { val: '1', label: 'Mauvais', color: 'bg-red-500' },
    { val: '2', label: 'Passable', color: 'bg-orange-400' },
    { val: '3', label: 'Moyen', color: 'bg-yellow-400' },
    { val: '4', label: 'Bon', color: 'bg-lime-500' },
    { val: '5', label: 'Excellent', color: 'bg-emerald-500' },
  ];
  const currentVal = watch(name);
  return (
    <div>
      <label className="form-label">{label}</label>
      <div className="flex gap-2">
        {scores.map((s) => (
          <label
            key={`score-${name}-${s.val}`}
            className="flex-1 flex flex-col items-center gap-1 cursor-pointer group"
          >
            <input type="radio" value={s.val} {...register(name, { required: 'Requis' })} className="sr-only peer" />
            <span className={`w-full h-8 rounded-md ${s.color} ${currentVal === s.val ? 'opacity-100' : 'opacity-25'} transition-opacity duration-150 flex items-center justify-center text-white text-xs font-bold`}>
              {s.val}
            </span>
            <span className={`text-[9px] text-center leading-tight ${currentVal === s.val ? 'text-zinc-700 font-semibold' : 'text-zinc-400'}`}>{s.label}</span>
          </label>
        ))}
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
};

function generateLotId(): string {
  const num = Math.floor(Math.random() * 900 + 100);
  return `L-2026-0${num}`;
}

function generateAnomalieId(): string {
  const num = Math.floor(Math.random() * 900 + 100);
  return `ANO-2026-${num}`;
}

function getCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

interface ReceptionFormProps {
  onNewReception?: (entry: ReceptionEntry) => void;
  onNewAnomalie?: (anomalie: AnomalieEntry) => void;
}

export default function ReceptionForm({ onNewReception, onNewAnomalie }: ReceptionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tempAlert, setTempAlert] = useState<{ message: string; severity: 'warning' | 'critical' } | null>(null);
  const [dlcAlert, setDlcAlert] = useState<{ message: string; severity: 'info' | 'warning' | 'critical' } | null>(null);
  const [organoAlert, setOrganoAlert] = useState<string | null>(null);
  const [forcedRefusal, setForcedRefusal] = useState<string | null>(null);
  const [fournisseursList, setFournisseursList] = useState<string[]>(fournisseurs);
  const [produitsList, setProduitsList] = useState<string[]>(produits);

  // Photo capture hook — with Supabase storage persistence
  const {
    photo: capturedPhoto,
    isUploading: isPhotoUploading,
    uploadError: photoUploadError,
    inputRef: photoInputRef,
    openCamera: handlePhotoClick,
    handleFileChange: handlePhotoChange,
    removePhoto: handleRemovePhoto,
    uploadToStorage,
  } = usePhotoCapture({
    bucket: 'reception-photos',
    folder: 'lots',
    onUploaded: () => toast.success('Photo capturée avec succès'),
    onError: (msg) => toast.error(msg),
  });

  // Voice transcription hook — with fallback error handling
  const {
    isRecording,
    isSupported: isVoiceSupported,
    errorMessage: voiceErrorMessage,
    toggleRecording: handleVocalClick,
    resetTranscript: resetVoice,
  } = useVoiceTranscription({
    lang: 'fr-FR',
    onTranscript: (text) => {
      setValue('observations', text);
    },
    onError: (_type, msg) => {
      toast.error(msg, { duration: 6000 });
    },
  });

  useEffect(() => {
    const fetchOptions = async () => {
      const supabase = createClient();
      const [fournResult, prodsResult] = await Promise.all([
        supabase.from('fournisseurs').select('nom').eq('actif', true).order('nom'),
        supabase.from('produits').select('nom').eq('actif', true).order('nom'),
      ]);
      const fourn = fournResult.data;
      const prods = prodsResult.data;
      if (fourn && fourn.length > 0) setFournisseursList(fourn.map((f: { nom: string }) => f.nom));
      if (prods && prods.length > 0) setProduitsList(prods.map((p: { nom: string }) => p.nom));
    };
    fetchOptions();
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ReceptionFormData>({
    defaultValues: {
      unite: 'kg',
      categorie: 'fruits-frais',
      decision: '',
      operateur: 'Marie Leconte',
      poidsVerifie: false,
    },
  });

  const decision = watch('decision');
  const categorie = watch('categorie');

  // Evaluate temperature against category threshold
  const evaluateTemperature = (tempVal: number, cat: string) => {
    const threshold = TEMP_THRESHOLDS[cat] || TEMP_THRESHOLDS['fruits-frais'];
    const isSurge = cat === 'surges';

    if (isSurge) {
      if (tempVal > threshold.max) {
        return {
          message: `🚨 Température ${tempVal}°C dépasse le seuil HACCP pour surgelés (max ${threshold.max}°C) — Rupture chaîne du froid`,
          severity: 'critical' as const,
        };
      }
    } else {
      if (tempVal > threshold.max + 2) {
        return {
          message: `🚨 Température ${tempVal}°C très au-dessus du seuil (max ${threshold.max}°C pour ${threshold.label}) — Refus recommandé`,
          severity: 'critical' as const,
        };
      } else if (tempVal > threshold.max) {
        return {
          message: `⚠ Température ${tempVal}°C dépasse le seuil HACCP (max ${threshold.max}°C pour ${threshold.label}) — Contrôle renforcé requis`,
          severity: 'warning' as const,
        };
      }
    }
    return null;
  };

  const handleTempChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const cat = getValues('categorie');
    if (!isNaN(val)) {
      const alert = evaluateTemperature(val, cat);
      setTempAlert(alert);
      // Auto-force refusal on critical temperature
      if (alert?.severity === 'critical') {
        setValue('decision', 'refuse');
        setForcedRefusal('Température hors seuil critique — refus automatique activé');
        setValue('motifRefus', `Température à réception: ${val}°C (seuil max: ${TEMP_THRESHOLDS[cat]?.max ?? 4}°C) — Non-conformité HACCP`);
      }
    } else {
      setTempAlert(null);
    }
  };

  const handleCategorieChange = () => {
    // Re-evaluate temperature when category changes
    const tempVal = parseFloat(getValues('temperatureReception'));
    const cat = getValues('categorie');
    if (!isNaN(tempVal)) {
      const alert = evaluateTemperature(tempVal, cat);
      setTempAlert(alert);
    }
  };

  const handleDlcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dlc = new Date(e.target.value);
    const today = new Date('2026-04-16');
    today.setHours(0, 0, 0, 0);
    dlc.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((dlc.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < DLC_CRITICAL_DAYS) {
      setDlcAlert({
        message: `🚨 DLC dépassée depuis ${Math.abs(diffDays)} jour(s) — Lot à refuser OBLIGATOIREMENT`,
        severity: 'critical',
      });
      // Force refusal for expired DLC
      setValue('decision', 'refuse');
      setForcedRefusal('DLC dépassée — refus automatique obligatoire');
      setValue('motifRefus', `DLC dépassée depuis ${Math.abs(diffDays)} jour(s) — Lot non conforme`);
    } else if (diffDays <= DLC_WARNING_DAYS) {
      setDlcAlert({
        message: `⚠ DLC dans ${diffDays} jour(s) — Contrôle prioritaire requis, utilisation immédiate`,
        severity: 'warning',
      });
      setForcedRefusal(null);
    } else if (diffDays <= DLC_ALERT_DAYS) {
      setDlcAlert({
        message: `ℹ DLC dans ${diffDays} jours — Surveiller l'utilisation`,
        severity: 'info',
      });
      setForcedRefusal(null);
    } else {
      setDlcAlert(null);
      setForcedRefusal(null);
    }
  };

  // Check organoleptique scores for alerts
  const checkOrganoScores = () => {
    const scores = [
      { name: 'couleur', label: 'Couleur', val: parseInt(getValues('couleur') || '5') },
      { name: 'odeur', label: 'Odeur', val: parseInt(getValues('odeur') || '5') },
      { name: 'texture', label: 'Texture', val: parseInt(getValues('texture') || '5') },
      { name: 'gout', label: 'Goût', val: parseInt(getValues('gout') || '5') },
    ];
    const lowScores = scores.filter((s) => s.val <= 2);
    const criticalScores = scores.filter((s) => s.val === 1);

    if (criticalScores.length > 0) {
      const labels = criticalScores.map((s) => s.label).join(', ');
      setOrganoAlert(`🚨 Score critique (1/5) pour: ${labels} — Refus fortement recommandé`);
      if (criticalScores.length >= 2) {
        setValue('decision', 'refuse');
        setForcedRefusal(`Scores organoleptiques critiques (${labels}) — refus automatique`);
        setValue('motifRefus', `Qualité organoleptique insuffisante: ${labels} noté(s) 1/5`);
      }
    } else if (lowScores.length >= 2) {
      const labels = lowScores.map((s) => s.label).join(', ');
      setOrganoAlert(`⚠ Scores faibles (≤2/5) pour: ${labels} — Vérification approfondie requise`);
    } else {
      setOrganoAlert(null);
    }
  };

  const buildAlerteLabel = (): string | null => {
    const alerts: string[] = [];
    if (tempAlert) {
      const tempVal = parseFloat(getValues('temperatureReception'));
      alerts.push(`T° ${tempVal}°C`);
    }
    if (dlcAlert && (dlcAlert.severity === 'warning' || dlcAlert.severity === 'critical')) {
      const dlcVal = getValues('dlc');
      const dlc = new Date(dlcVal);
      const today = new Date('2026-04-16');
      const diffDays = Math.ceil((dlc.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      alerts.push(diffDays < 0 ? 'DLC dépassée' : `DLC < ${diffDays + 1}j`);
    }
    if (organoAlert) alerts.push('Qualité NOK');
    return alerts.length > 0 ? alerts.join(' | ') : null;
  };

  const onSubmit = async (data: ReceptionFormData) => {
    // Final validation: block submission if DLC is expired and decision is not refuse
    const dlcDate = new Date(data.dlc);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dlcDate.setHours(0, 0, 0, 0);
    const dlcDiff = Math.ceil((dlcDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (dlcDiff < 0 && data.decision !== 'refuse') {
      toast.error('DLC dépassée — le lot doit être refusé obligatoirement', { duration: 5000 });
      setValue('decision', 'refuse');
      return;
    }

    // Validate temperature
    const tempVal = parseFloat(data.temperatureReception);
    const threshold = TEMP_THRESHOLDS[data.categorie] || TEMP_THRESHOLDS['fruits-frais'];
    const isTempCritical = data.categorie === 'surges'
      ? tempVal > threshold.max
      : tempVal > threshold.max + 2;

    if (isTempCritical && data.decision !== 'refuse') {
      toast.error('Température critique — le lot doit être refusé', { duration: 5000 });
      setValue('decision', 'refuse');
      return;
    }

    setIsSubmitting(true);

    const lotId = data.numerolot || generateLotId();
    const heure = getCurrentTime();
    const alerteLabel = buildAlerteLabel();

    // Determine final status
    let statut: ReceptionEntry['statut'] = 'accepte';
    if (data.decision === 'refuse') {
      statut = 'refuse';
    } else if (tempAlert?.severity === 'warning' || (dlcAlert && dlcAlert.severity !== 'info')) {
      statut = 'en_attente';
    }

    // Upload photo to Supabase Storage (non-blocking — fallback gracefully)
    let photoUrl: string | null = null;
    if (capturedPhoto?.file) {
      photoUrl = await uploadToStorage(lotId);
      if (photoUrl) {
        toast.success('Photo persistée dans le stockage', { duration: 2000 });
      }
      // If upload fails, photoUrl stays null — form submission continues
    }

    // Save to Supabase
    const supabase = createClient();
    const { error: insertError } = await supabase.from('receptions').insert([{
      lot: lotId,
      produit: data.produit,
      fournisseur: data.fournisseur,
      quantite: data.quantite,
      unite: data.unite,
      categorie: data.categorie,
      temperature_reception: tempVal,
      dlc: data.dlc,
      statut,
      decision: data.decision,
      motif_refus: data.motifRefus || '',
      observations: data.observations || '',
      operateur: data.operateur,
      alerte: alerteLabel,
      score_couleur: parseInt(data.couleur) || null,
      score_odeur: parseInt(data.odeur) || null,
      score_texture: parseInt(data.texture) || null,
      score_gout: parseInt(data.gout) || null,
      poids_verifie: data.poidsVerifie,
      photo_url: photoUrl,
    }]);

    if (insertError) {
      toast.error(`Erreur d'enregistrement: ${insertError.message}`);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);

    // Create reception entry for UI
    const newEntry: ReceptionEntry = {
      id: `rec-${Date.now()}`,
      heure,
      lot: lotId,
      produit: data.produit,
      fournisseur: data.fournisseur,
      quantite: `${data.quantite} ${data.unite}`,
      statut,
      operateur: data.operateur,
      alerte: alerteLabel,
      temperature: tempVal,
      dlc: data.dlc,
    };

    // Auto-create anomalie if refused or temperature critical
    const shouldCreateAnomalie =
      data.decision === 'refuse' ||
      tempAlert?.severity === 'critical' ||
      (dlcAlert?.severity === 'critical');

    if (shouldCreateAnomalie) {
      const anomalieId = generateAnomalieId();
      newEntry.anomalieId = anomalieId;

      const reasons: string[] = [];
      if (data.decision === 'refuse' && data.motifRefus) reasons.push(data.motifRefus);
      if (tempAlert?.severity === 'critical') reasons.push(`Température hors seuil: ${tempVal}°C (max ${threshold.max}°C)`);
      if (dlcAlert?.severity === 'critical') reasons.push(`DLC dépassée de ${Math.abs(dlcDiff)} jour(s)`);

      // Save anomalie to Supabase
      await supabase.from('anomalies').insert([{
        numero: anomalieId,
        type: data.decision === 'refuse' ? 'reception' : 'temperature',
        lot: lotId,
        zone: 'Quai réception',
        severite: 'majeur',
        responsable: data.operateur,
        statut: 'ouvert',
        description: reasons.join(' | '),
        source: 'auto',
      }]);

      const anomalie: AnomalieEntry = {
        id: anomalieId,
        date: new Date().toISOString().split('T')[0],
        type: data.decision === 'refuse' ? 'Réception refusée' : 'Non-conformité température',
        description: reasons.join(' | '),
        lot: lotId,
        fournisseur: data.fournisseur,
        produit: data.produit,
        statut: 'ouverte',
        createdAt: heure,
      };

      onNewAnomalie?.(anomalie);

      toast.error(
        `Lot ${lotId} refusé — Anomalie ${anomalieId} créée automatiquement`,
        { duration: 7000, icon: <ShieldAlert size={16} /> }
      );
    } else if (statut === 'en_attente') {
      toast.warning(
        `Lot ${lotId} mis en attente — ${alerteLabel} — Contrôle renforcé requis`,
        { duration: 6000 }
      );
    } else {
      toast.success(
        `Lot ${lotId} accepté et enregistré avec succès`,
        { duration: 4000 }
      );
    }

    // Temperature warning anomalie (non-critical)
    if (tempAlert?.severity === 'warning' && data.decision !== 'refuse') {
      const anomalieId = generateAnomalieId();
      await supabase.from('anomalies').insert([{
        numero: anomalieId,
        type: 'temperature',
        lot: lotId,
        zone: 'Quai réception',
        severite: 'mineur',
        responsable: data.operateur,
        statut: 'ouvert',
        description: `Température à réception: ${tempVal}°C (seuil: ${threshold.max}°C) — Lot ${lotId} mis en surveillance`,
        source: 'auto',
      }]);
      const anomalie: AnomalieEntry = {
        id: anomalieId,
        date: new Date().toISOString().split('T')[0],
        type: 'Alerte température',
        description: `Température à réception: ${tempVal}°C (seuil: ${threshold.max}°C) — Lot ${lotId} mis en surveillance`,
        lot: lotId,
        fournisseur: data.fournisseur,
        produit: data.produit,
        statut: 'ouverte',
        createdAt: heure,
      };
      onNewAnomalie?.(anomalie);
      toast.warning(`Anomalie température ${anomalieId} créée — Lot en surveillance`, { duration: 5000 });
    }

    onNewReception?.(newEntry);

    reset();
    setTempAlert(null);
    setDlcAlert(null);
    setOrganoAlert(null);
    setForcedRefusal(null);
    handleRemovePhoto();
    resetVoice();
  };

  const dlcAlertColors = {
    info: 'bg-blue-50 border-blue-300 text-blue-700',
    warning: 'bg-amber-50 border-amber-300 text-amber-700',
    critical: 'bg-red-50 border-red-300 text-red-700',
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Forced refusal banner */}
      {forcedRefusal && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border-2 border-red-400 text-sm font-semibold text-red-800">
          <ShieldAlert size={18} className="shrink-0 mt-0.5 text-red-600" />
          <div>
            <p className="font-bold">Refus automatique activé</p>
            <p className="text-xs font-normal mt-0.5 text-red-700">{forcedRefusal}</p>
          </div>
        </div>
      )}

      {/* Identification */}
      <div className="card-section">
        <div className="section-header">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-teal-700" />
            <h2 className="text-sm font-semibold text-zinc-800">Identification du lot</h2>
          </div>
          <div className="flex gap-2">
            <MediaErrorBoundary type="camera" fallbackMessage="Capture photo indisponible">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoChange}
              />
              <button
                type="button"
                className="btn-secondary text-xs py-1.5 px-2.5"
                onClick={handlePhotoClick}
                disabled={isPhotoUploading}
              >
                {isPhotoUploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
                Photo
              </button>
            </MediaErrorBoundary>
            <MediaErrorBoundary type="voice" fallbackMessage="Reconnaissance vocale indisponible">
              {isVoiceSupported ? (
                <button
                  type="button"
                  className={`text-xs py-1.5 px-2.5 flex items-center gap-1 rounded-md border font-medium transition-colors ${
                    isRecording
                      ? 'bg-red-50 border-red-300 text-red-600 animate-pulse' : 'btn-secondary'
                  }`}
                  onClick={handleVocalClick}
                >
                  {isRecording ? <MicOff size={13} /> : <Mic size={13} />}
                  {isRecording ? 'Stop' : 'Vocal'}
                </button>
              ) : (
                <span className="flex items-center gap-1 text-xs text-zinc-400 px-2 py-1.5 border border-zinc-200 rounded-md bg-zinc-50" title="Reconnaissance vocale non supportée — saisissez le texte manuellement">
                  <MicOff size={13} /> Vocal indisponible
                </span>
              )}
            </MediaErrorBoundary>
          </div>
        </div>
        {/* Voice error fallback message */}
        {voiceErrorMessage && (
          <div className="mx-5 mt-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
            <AlertTriangle size={12} className="shrink-0 mt-0.5 text-amber-500" />
            <span>{voiceErrorMessage}</span>
          </div>
        )}
        <div className="p-5 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="form-label">Fournisseur <span className="text-red-500">*</span></label>
            <select
              className="form-select"
              {...register('fournisseur', { required: 'Fournisseur obligatoire' })}
            >
              <option value="">Sélectionner un fournisseur</option>
              {fournisseursList.map((f) => (
                <option key={`fournisseur-${f}`} value={f}>{f}</option>
              ))}
            </select>
            {errors.fournisseur && <p className="form-error">{errors.fournisseur.message}</p>}
          </div>

          <div className="col-span-2">
            <label className="form-label">Produit <span className="text-red-500">*</span></label>
            <select
              className="form-select"
              {...register('produit', { required: 'Produit obligatoire' })}
            >
              <option value="">Sélectionner un produit</option>
              {produitsList.map((p) => (
                <option key={`produit-${p}`} value={p}>{p}</option>
              ))}
            </select>
            {errors.produit && <p className="form-error">{errors.produit.message}</p>}
          </div>

          <div>
            <label className="form-label">Catégorie <span className="text-red-500">*</span></label>
            <select
              className="form-select"
              {...register('categorie', {
                onChange: handleCategorieChange,
              })}
            >
              <option value="fruits-frais">Fruits frais (max 4°C)</option>
              <option value="legumes">Légumes (max 6°C)</option>
              <option value="epices">Épices (max 20°C)</option>
              <option value="surges">Surgelés (max -15°C)</option>
              <option value="emballages">Emballages (ambiante)</option>
            </select>
          </div>

          <div>
            <label className="form-label">Opérateur</label>
            <input className="form-input" {...register('operateur')} />
          </div>

          <div>
            <label className="form-label">Quantité <span className="text-red-500">*</span></label>
            <input
              type="number"
              step="0.1"
              className="form-input font-tabular"
              placeholder="0.0"
              {...register('quantite', {
                required: 'Quantité obligatoire',
                min: { value: 0.1, message: 'Valeur positive requise' },
              })}
            />
            {errors.quantite && <p className="form-error">{errors.quantite.message}</p>}
          </div>

          <div>
            <label className="form-label">Unité</label>
            <select className="form-select" {...register('unite')}>
              <option value="kg">kg</option>
              <option value="L">Litres</option>
              <option value="cartons">Cartons</option>
              <option value="palettes">Palettes</option>
              <option value="unites">Unités</option>
            </select>
          </div>
        </div>
        {/* Photo preview */}
        {capturedPhoto?.preview && (
          <div className="px-5 pb-3">
            <div className="relative inline-block">
              <img
                src={capturedPhoto.preview}
                alt="Photo du lot"
                className="h-28 w-auto rounded-lg border border-zinc-200 object-cover shadow-sm"
              />
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
                title="Supprimer la photo"
              >
                <X size={12} />
              </button>
            </div>
            {isPhotoUploading && (
              <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                <Loader2 size={10} className="animate-spin" /> Upload en cours…
              </p>
            )}
            {photoUploadError && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertTriangle size={10} /> {photoUploadError}
              </p>
            )}
            {!isPhotoUploading && !photoUploadError && (
              <p className="text-xs text-zinc-500 mt-1">Photo attachée au lot</p>
            )}
          </div>
        )}
      </div>

      {/* Contrôle physique */}
      <div className="card-section">
        <div className="section-header">
          <div className="flex items-center gap-2">
            <Thermometer size={16} className="text-teal-700" />
            <h2 className="text-sm font-semibold text-zinc-800">Contrôle physique</h2>
          </div>
          {categorie && TEMP_THRESHOLDS[categorie] && (
            <span className="flex items-center gap-1 text-xs text-zinc-500 bg-zinc-100 px-2 py-1 rounded-md">
              <Info size={11} />
              Seuil: {TEMP_THRESHOLDS[categorie].max}°C
            </span>
          )}
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">
              <span className="flex items-center gap-1">
                <Hash size={12} /> N° de lot <span className="text-red-500">*</span>
              </span>
            </label>
            <input
              className="form-input font-mono"
              placeholder="ex: L-2026-042"
              {...register('numerolot', { required: 'N° de lot obligatoire' })}
            />
            {errors.numerolot && <p className="form-error">{errors.numerolot.message}</p>}
          </div>

          <div>
            <label className="form-label">
              <span className="flex items-center gap-1">
                <Calendar size={12} /> DLC <span className="text-red-500">*</span>
              </span>
            </label>
            <input
              type="date"
              className="form-input font-tabular"
              {...register('dlc', {
                required: 'DLC obligatoire',
                onChange: handleDlcChange,
              })}
            />
            {errors.dlc && <p className="form-error">{errors.dlc.message}</p>}
          </div>

          {dlcAlert && (
            <div className={`col-span-2 flex items-start gap-2 p-3 rounded-lg border text-xs font-medium ${dlcAlertColors[dlcAlert.severity]}`}>
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{dlcAlert.message}</span>
            </div>
          )}

          <div>
            <label className="form-label">
              <span className="flex items-center gap-1">
                <Thermometer size={12} /> T° à réception (°C) <span className="text-red-500">*</span>
              </span>
            </label>
            <p className="form-helper">
              Seuil HACCP: {categorie && TEMP_THRESHOLDS[categorie] ? `max ${TEMP_THRESHOLDS[categorie].max}°C pour ${TEMP_THRESHOLDS[categorie].label}` : 'max 4°C'}
            </p>
            <input
              type="number"
              step="0.1"
              className={`form-input font-tabular ${tempAlert?.severity === 'critical' ? 'border-red-400 bg-red-50' : tempAlert?.severity === 'warning' ? 'border-amber-400' : ''}`}
              placeholder="0.0"
              {...register('temperatureReception', {
                required: 'Température obligatoire',
                onChange: handleTempChange,
              })}
            />
            {errors.temperatureReception && <p className="form-error">{errors.temperatureReception.message}</p>}
          </div>

          <div>
            <label className="form-label">
              <span className="flex items-center gap-1">
                <Scale size={12} /> Poids vérifié
              </span>
            </label>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="poids-verifie"
                className="w-4 h-4 rounded text-teal-700"
                {...register('poidsVerifie')}
              />
              <label htmlFor="poids-verifie" className="text-sm text-zinc-600">Poids conforme au BL</label>
            </div>
          </div>

          {tempAlert && (
            <div className={`col-span-2 flex items-start gap-2 p-3 rounded-lg border text-xs font-medium ${
              tempAlert.severity === 'critical' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-amber-50 border-amber-300 text-amber-700'
            }`}>
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{tempAlert.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Qualité organoleptique */}
      <div className="card-section">
        <div className="section-header">
          <h2 className="text-sm font-semibold text-zinc-800">Qualité organoleptique</h2>
          <p className="text-xs text-zinc-400">Score 1 (mauvais) → 5 (excellent)</p>
        </div>
        <div className="p-5 grid grid-cols-2 gap-5">
          <ScoreSelector label="Couleur" name="couleur" register={register} error={errors.couleur?.message} watch={watch} />
          <ScoreSelector label="Odeur" name="odeur" register={register} error={errors.odeur?.message} watch={watch} />
          <ScoreSelector label="Texture" name="texture" register={register} error={errors.texture?.message} watch={watch} />
          <ScoreSelector label="Goût" name="gout" register={register} error={errors.gout?.message} watch={watch} />
        </div>
        {organoAlert && (
          <div className={`mx-5 mb-4 flex items-start gap-2 p-3 rounded-lg border text-xs font-medium ${
            organoAlert.startsWith('🚨') ? 'bg-red-50 border-red-300 text-red-700' : 'bg-amber-50 border-amber-300 text-amber-700'
          }`}>
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{organoAlert}</span>
          </div>
        )}
        <div className="px-5 pb-4">
          <button
            type="button"
            onClick={checkOrganoScores}
            className="btn-secondary text-xs w-full"
          >
            Analyser les scores organoleptiques
          </button>
        </div>
      </div>

      {/* Décision */}
      <div className="card-section">
        <div className="section-header">
          <h2 className="text-sm font-semibold text-zinc-800">Décision d&apos;acceptation</h2>
          {forcedRefusal && (
            <span className="text-xs bg-red-100 text-red-700 border border-red-300 px-2 py-0.5 rounded-full font-semibold">
              Refus forcé
            </span>
          )}
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
              forcedRefusal ? 'opacity-40 cursor-not-allowed' : ''
            } ${decision === 'accepte' ? 'border-emerald-400 bg-emerald-50' : 'border-zinc-200 bg-white hover:border-zinc-300'}`}>
              <input
                type="radio"
                value="accepte"
                disabled={!!forcedRefusal}
                {...register('decision', { required: 'Décision obligatoire' })}
                className="sr-only"
              />
              <CheckCircle size={22} className={decision === 'accepte' ? 'text-emerald-600' : 'text-zinc-300'} />
              <div>
                <p className={`text-sm font-semibold ${decision === 'accepte' ? 'text-emerald-700' : 'text-zinc-500'}`}>Accepté</p>
                <p className="text-xs text-zinc-400">Lot conforme</p>
              </div>
            </label>

            <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
              decision === 'refuse' ? 'border-red-400 bg-red-50' : 'border-zinc-200 bg-white hover:border-zinc-300'
            }`}>
              <input
                type="radio"
                value="refuse"
                {...register('decision', { required: 'Décision obligatoire' })}
                className="sr-only"
              />
              <XCircle size={22} className={decision === 'refuse' ? 'text-red-600' : 'text-zinc-300'} />
              <div>
                <p className={`text-sm font-semibold ${decision === 'refuse' ? 'text-red-700' : 'text-zinc-500'}`}>Refusé</p>
                <p className="text-xs text-zinc-400">Non-conforme → Anomalie auto</p>
              </div>
            </label>
          </div>
          {errors.decision && <p className="form-error">{errors.decision.message}</p>}

          {decision === 'refuse' && (
            <div className="animate-slide-up space-y-3">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                <span>Une anomalie sera créée automatiquement avec le motif ci-dessous et assignée au responsable qualité.</span>
              </div>
              <div>
                <label className="form-label">
                  Motif de refus <span className="text-red-500">*</span>
                </label>
                <p className="form-helper">Obligatoire — sera inclus dans l&apos;anomalie créée automatiquement</p>
                <textarea
                  rows={3}
                  className="form-input resize-none"
                  placeholder="Décrire précisément le motif de refus (odeur anormale, moisissures, DLC dépassée, température NOK...)"
                  {...register('motifRefus', {
                    required: decision === 'refuse' ? 'Motif de refus obligatoire' : false,
                  })}
                />
                {errors.motifRefus && <p className="form-error">{errors.motifRefus.message}</p>}
              </div>
            </div>
          )}

          <div>
            <label className="form-label">Observations complémentaires</label>
            <textarea
              rows={2}
              className="form-input resize-none"
              placeholder="Informations complémentaires, remarques..."
              {...register('observations')}
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between gap-3 sticky bottom-4 bg-white border border-zinc-200 rounded-xl shadow-lg px-5 py-4">
        <p className="text-xs text-zinc-500">
          {decision === 'refuse' && (
            <span className="text-red-600 font-semibold flex items-center gap-1">
              <ShieldAlert size={13} /> Anomalie créée automatiquement à la validation
            </span>
          )}
          {decision === 'accepte' && !forcedRefusal && (
            <span className="text-emerald-600 font-medium">✓ Le lot sera mis en stock après validation</span>
          )}
          {!decision && (
            <span className="text-zinc-400">Remplir tous les champs requis avant validation</span>
          )}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              reset();
              setTempAlert(null);
              setDlcAlert(null);
              setOrganoAlert(null);
              setForcedRefusal(null);
              handleRemovePhoto();
              resetVoice();
              if (photoInputRef.current) photoInputRef.current.value = '';
            }}
            className="btn-secondary"
          >
            Réinitialiser
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <CheckCircle size={15} />
                Valider la réception
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}