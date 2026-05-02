'use client';
import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  CheckCircle, XCircle, AlertTriangle, ClipboardCheck,
  Loader2, PenLine, PlusCircle,
} from 'lucide-react';
import { HygieneSession, CheckItemSnapshot } from '../page';
import { createClient } from '@/lib/supabase/client';

type ItemStatus = 'ok' | 'nok' | 'pending';

interface CheckItem {
  id: string;
  label: string;
  description: string;
  status: ItemStatus;
  actionCorrective: string;
  frequence: 'quotidien' | 'hebdo';
}

interface CheckGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  items: CheckItem[];
}

const buildInitialGroups = (): CheckGroup[] => [
  {
    id: 'group-locaux',
    label: 'Locaux & Surfaces',
    icon: ClipboardCheck,
    color: 'teal',
    items: [
      { id: 'item-loc-01', label: 'Sol zone réception nettoyé et désinfecté', description: 'Vérifier absence de résidus et humidité excessive', status: 'pending', actionCorrective: '', frequence: 'quotidien' },
      { id: 'item-loc-02', label: 'Sol zone production propre', description: 'Aucune trace de produit ou de condensat', status: 'pending', actionCorrective: '', frequence: 'quotidien' },
      { id: 'item-loc-03', label: 'Murs et plafonds sans moisissures', description: 'Inspection visuelle des angles et recoins', status: 'pending', actionCorrective: '', frequence: 'hebdo' },
      { id: 'item-loc-04', label: 'Portes et fenêtres étanches aux nuisibles', description: 'Joints en bon état, grilles présentes', status: 'pending', actionCorrective: '', frequence: 'quotidien' },
      { id: 'item-loc-05', label: 'Éclairage fonctionnel et protégé', description: 'Ampoules avec protège-ampoules intacts', status: 'pending', actionCorrective: '', frequence: 'hebdo' },
      { id: 'item-loc-06', label: 'Zones de stockage organisées et propres', description: 'FIFO respecté, pas de croisement matières', status: 'pending', actionCorrective: '', frequence: 'quotidien' },
    ],
  },
  {
    id: 'group-equipements',
    label: 'Équipements',
    icon: ClipboardCheck,
    color: 'blue',
    items: [
      { id: 'item-eq-01', label: 'Presses à jus nettoyées et désinfectées', description: 'Démontage et nettoyage complet après chaque production', status: 'pending', actionCorrective: '', frequence: 'quotidien' },
      { id: 'item-eq-02', label: 'Filtres et tamis inspectés', description: 'Absence de colmatage ou de dépôt anormal', status: 'pending', actionCorrective: '', frequence: 'quotidien' },
      { id: 'item-eq-03', label: 'Convoyeurs et tapis propres', description: 'Nettoyage sous les tapis vérifié', status: 'pending', actionCorrective: '', frequence: 'quotidien' },
      { id: 'item-eq-04', label: 'Thermomètres calibrés et fonctionnels', description: 'Vérification étalonnage mensuelle à jour', status: 'pending', actionCorrective: '', frequence: 'hebdo' },
      { id: 'item-eq-05', label: 'Conditionnement — machines propres', description: 'Têtes de remplissage nettoyées et stérilisées', status: 'pending', actionCorrective: '', frequence: 'quotidien' },
      { id: 'item-eq-06', label: 'Bacs et contenants désinfectés', description: 'Rinçage à l\'eau chaude 82°C minimum', status: 'pending', actionCorrective: '', frequence: 'quotidien' },
    ],
  },
  {
    id: 'group-personnel',
    label: 'Personnel',
    icon: ClipboardCheck,
    color: 'purple',
    items: [
      { id: 'item-pers-01', label: 'Tenues de travail propres et complètes', description: 'Blouse, charlotte, gants, chaussures de sécurité', status: 'pending', actionCorrective: '', frequence: 'quotidien' },
      { id: 'item-pers-02', label: 'Lavage des mains respecté aux points critiques', description: 'Entrée production, après pause, après manipulation déchet', status: 'pending', actionCorrective: '', frequence: 'quotidien' },
      { id: 'item-pers-03', label: 'Pas de bijoux ni montre en zone production', description: 'Contrôle visuel à l\'entrée de la zone', status: 'pending', actionCorrective: '', frequence: 'quotidien' },
      { id: 'item-pers-04', label: 'Formation hygiène à jour (12 mois)', description: 'Vérification dates de formation dans dossier RH', status: 'pending', actionCorrective: '', frequence: 'hebdo' },
      { id: 'item-pers-05', label: 'Certificat médical valide — personnel en contact', description: 'Pas de certificat expiré pour opérateurs production', status: 'pending', actionCorrective: '', frequence: 'hebdo' },
    ],
  },
  {
    id: 'group-produits',
    label: 'Produits & Stockage',
    icon: ClipboardCheck,
    color: 'orange',
    items: [
      { id: 'item-prod-01', label: 'Matières premières correctement étiquetées', description: 'N° lot, DLC, fournisseur visibles sur chaque contenant', status: 'pending', actionCorrective: '', frequence: 'quotidien' },
      { id: 'item-prod-02', label: 'Séparation matières premières / produits finis', description: 'Pas de stockage mixte en chambre froide', status: 'pending', actionCorrective: '', frequence: 'quotidien' },
      { id: 'item-prod-03', label: 'Produits chimiques de nettoyage séparés', description: 'Zone dédiée, hors contact alimentaire', status: 'pending', actionCorrective: '', frequence: 'quotidien' },
      { id: 'item-prod-04', label: 'DLC vérifiées sur tous les lots en stock', description: 'Alerte si DLC < 72h', status: 'pending', actionCorrective: '', frequence: 'quotidien' },
      { id: 'item-prod-05', label: 'Déchets et sous-produits évacués', description: 'Bacs déchets vidés et nettoyés avant début production', status: 'pending', actionCorrective: '', frequence: 'quotidien' },
      { id: 'item-prod-06', label: 'Nuisibles — aucun signe de présence', description: 'Inspection pièges, absence de rongeurs ou insectes', status: 'pending', actionCorrective: '', frequence: 'quotidien' },
    ],
  },
];

const colorMap: Record<string, { bg: string; text: string; border: string; progress: string }> = {
  teal:   { bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-200',   progress: 'bg-teal-500' },
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   progress: 'bg-blue-500' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', progress: 'bg-purple-500' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', progress: 'bg-orange-500' },
};

interface HygieneChecklistProps {
  onSessionValidated: (session: HygieneSession) => void;
  sessionCount: number;
}

export default function HygieneChecklist({ onSessionValidated, sessionCount }: HygieneChecklistProps) {
  const [groups, setGroups] = useState<CheckGroup[]>(buildInitialGroups);
  const [isSaving, setIsSaving] = useState(false);
  const [signature, setSignature] = useState('Marie Leconte');

  const setItemStatus = (groupId: string, itemId: string, status: ItemStatus) => {
    setGroups((prev) => prev.map((g) =>
      g.id === groupId
        ? { ...g, items: g.items.map((item) => item.id === itemId ? { ...item, status, actionCorrective: status === 'ok' ? '' : item.actionCorrective } : item) }
        : g
    ));
  };

  const setActionCorrective = (groupId: string, itemId: string, value: string) => {
    setGroups((prev) => prev.map((g) =>
      g.id === groupId
        ? { ...g, items: g.items.map((item) => item.id === itemId ? { ...item, actionCorrective: value } : item) }
        : g
    ));
  };

  const allItems = groups.flatMap((g) => g.items);
  const okCount = allItems.filter((i) => i.status === 'ok').length;
  const nokCount = allItems.filter((i) => i.status === 'nok').length;
  const pendingCount = allItems.filter((i) => i.status === 'pending').length;
  const answeredCount = okCount + nokCount;
  const globalScore = answeredCount > 0 ? Math.round((okCount / answeredCount) * 100) : 0;

  const nokWithoutAction = allItems.filter((i) => i.status === 'nok' && !i.actionCorrective.trim());

  const getNowStrings = useCallback(() => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return { date: `${dd}/${mm}/${yyyy}`, heure: `${hh}:${min}`, isoDate: `${yyyy}-${mm}-${dd}` };
  }, []);

  const handleSave = async () => {
    if (pendingCount > 0) {
      toast.error(`${pendingCount} item(s) non renseigné(s) — veuillez cocher OK ou NOK pour chaque item`);
      return;
    }
    if (nokWithoutAction.length > 0) {
      toast.error(`${nokWithoutAction.length} item(s) NOK sans action corrective — obligatoire avant validation`);
      return;
    }
    setIsSaving(true);

    const { date, heure, isoDate } = getNowStrings();

    // Build full items snapshot for viewing/printing
    const itemsSnapshot: CheckItemSnapshot[] = groups.flatMap((g) =>
      g.items.map((item) => ({
        id: item.id,
        label: item.label,
        description: item.description,
        status: item.status,
        actionCorrective: item.actionCorrective,
        frequence: item.frequence,
        groupLabel: g.label,
      }))
    );

    // Save to Supabase
    const supabase = createClient();
    const { error: insertError } = await supabase.from('hygiene_sessions').insert([{
      date_session: isoDate,
      heure,
      score: globalScore,
      signataire: signature.trim() || 'Anonyme',
      statut: 'valide',
      nok_count: nokCount,
      items: itemsSnapshot,
    }]);

    setIsSaving(false);

    if (insertError) {
      toast.error(`Erreur d'enregistrement: ${insertError.message}`);
      return;
    }

    const newSession: HygieneSession = {
      id: `sess-${Date.now()}`,
      date,
      heure,
      score: globalScore,
      signataire: signature.trim() || 'Anonyme',
      statut: 'valide',
      nok: nokCount,
      items: itemsSnapshot,
    };

    onSessionValidated(newSession);
    toast.success(`✅ Session #${sessionCount + 1} validée — Score: ${globalScore}% — ${heure}`);

    // Reset form for next session
    setGroups(buildInitialGroups());
  };

  return (
    <div className="space-y-5">
      {/* Session banner */}
      {sessionCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
          <PlusCircle size={15} className="text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-700 font-medium">
            {sessionCount} session{sessionCount > 1 ? 's' : ''} déjà validée{sessionCount > 1 ? 's' : ''} aujourd&apos;hui — vous pouvez en soumettre une nouvelle à tout moment.
          </p>
        </div>
      )}

      {/* Global score */}
      <div className="card-section p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-800">Score de la session en cours</h2>
          <span className={`text-2xl font-bold font-tabular ${globalScore >= 90 ? 'text-emerald-600' : globalScore >= 75 ? 'text-amber-600' : 'text-red-600'}`}>
            {answeredCount > 0 ? `${globalScore}%` : '—'}
          </span>
        </div>
        <div className="h-3 bg-zinc-100 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-500 ${globalScore >= 90 ? 'bg-emerald-500' : globalScore >= 75 ? 'bg-amber-400' : 'bg-red-500'}`}
            style={{ width: `${answeredCount > 0 ? globalScore : 0}%` }}
          />
        </div>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <CheckCircle size={12} /> {okCount} OK
          </span>
          <span className="flex items-center gap-1.5 text-red-600 font-medium">
            <XCircle size={12} /> {nokCount} NOK
          </span>
          <span className="flex items-center gap-1.5 text-zinc-400">
            <AlertTriangle size={12} /> {pendingCount} En attente
          </span>
          <span className="ml-auto text-zinc-400">{allItems.length} items au total</span>
        </div>
        {nokWithoutAction.length > 0 && (
          <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            <span>{nokWithoutAction.length} item(s) NOK sans action corrective — la validation est bloquée</span>
          </div>
        )}
      </div>

      {/* Groups */}
      {groups.map((group) => {
        const colors = colorMap[group.color];
        const groupAnswered = group.items.filter((i) => i.status !== 'pending').length;
        const groupOk = group.items.filter((i) => i.status === 'ok').length;
        const groupScore = groupAnswered > 0 ? Math.round((groupOk / groupAnswered) * 100) : 0;

        return (
          <div key={group.id} className="card-section overflow-visible">
            <div className={`section-header ${colors.bg} border-b ${colors.border}`}>
              <div className="flex items-center gap-2">
                <ClipboardCheck size={15} className={colors.text} />
                <h3 className={`text-sm font-semibold ${colors.text}`}>{group.label}</h3>
                <span className="text-xs text-zinc-400">({group.items.length} items)</span>
              </div>
              <div className="flex items-center gap-3">
                {groupAnswered > 0 && (
                  <>
                    <div className="w-24 h-2 bg-zinc-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors.progress}`}
                        style={{ width: `${groupScore}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold ${colors.text}`}>{groupScore}%</span>
                  </>
                )}
              </div>
            </div>

            <div className="divide-y divide-zinc-100">
              {group.items.map((item) => (
                <div key={item.id} className="px-5 py-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-800">{item.label}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{item.description}</p>
                      <span className={`inline-flex items-center mt-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide ${item.frequence === 'quotidien' ? 'bg-teal-50 text-teal-600' : 'bg-purple-50 text-purple-600'}`}>
                        {item.frequence}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setItemStatus(group.id, item.id, 'ok')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-100 ${
                          item.status === 'ok' ?'bg-emerald-500 border-emerald-500 text-white' :'bg-white border-zinc-200 text-zinc-400 hover:border-emerald-300 hover:text-emerald-600'
                        }`}
                      >
                        <CheckCircle size={12} /> OK
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemStatus(group.id, item.id, 'nok')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-100 ${
                          item.status === 'nok' ?'bg-red-500 border-red-500 text-white' :'bg-white border-zinc-200 text-zinc-400 hover:border-red-300 hover:text-red-600'
                        }`}
                      >
                        <XCircle size={12} /> NOK
                      </button>
                    </div>
                  </div>
                  {item.status === 'nok' && (
                    <div className="flex items-start gap-2 animate-slide-up">
                      <PenLine size={13} className="text-red-400 shrink-0 mt-2" />
                      <input
                        type="text"
                        className="form-input text-xs py-1.5 flex-1 border-red-200 focus:border-red-400"
                        placeholder="Action corrective obligatoire..."
                        value={item.actionCorrective}
                        onChange={(e) => setActionCorrective(group.id, item.id, e.target.value)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Signature & Submit */}
      <div className="card-section p-5 space-y-4">
        <div>
          <label className="form-label">Signataire / Responsable</label>
          <input
            type="text"
            className="form-input"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="Nom du responsable"
          />
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary w-full justify-center"
        >
          {isSaving ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <CheckCircle size={15} />
              Valider et enregistrer la session
            </>
          )}
        </button>
      </div>
    </div>
  );
}