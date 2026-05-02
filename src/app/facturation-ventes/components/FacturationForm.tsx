'use client';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Receipt, Loader2, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type FacturationFormData = {
  client: string;
  clientId: string;
  numeroFacture: string;
  dateFacture: string;
  dateEcheance: string;
  produit: string;
  quantite: string;
  prixUnitaireHT: string;
  tauxTVA: string;
  remise: string;
  statutPaiement: 'en_attente' | 'paye' | 'retard' | 'annule';
  modePaiement: string;
  notes: string;
};

const produits = [
  'Jus d\'orange frais 25cl', 'Jus d\'orange frais 50cl',
  'Smoothie mangue-passion 33cl', 'Jus de pomme 1L',
  'Jus de carotte-gingembre 25cl', 'Jus multifruits 50cl',
  'Smoothie vert épinards 33cl', 'Jus de betterave 25cl',
  'Pack découverte 6 bouteilles', 'Carton 12 bouteilles 25cl',
];

export default function FacturationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<{ id: string; nom: string }[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('clients')
        .select('id, nom')
        .order('nom', { ascending: true });
      if (!error && data) {
        setClients(data);
      }
      setLoadingClients(false);
    };
    fetchClients();
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FacturationFormData>({
    defaultValues: {
      dateFacture: new Date().toISOString().split('T')[0],
      tauxTVA: '5.5',
      remise: '0',
      statutPaiement: 'en_attente',
      modePaiement: 'virement',
    },
  });

  const quantite = parseFloat(watch('quantite') || '0');
  const prixUnitaireHT = parseFloat(watch('prixUnitaireHT') || '0');
  const tauxTVA = parseFloat(watch('tauxTVA') || '0');
  const remise = parseFloat(watch('remise') || '0');

  const montantHT = quantite * prixUnitaireHT;
  const montantRemise = montantHT * (remise / 100);
  const montantHTNet = montantHT - montantRemise;
  const montantTVA = montantHTNet * (tauxTVA / 100);
  const montantTTC = montantHTNet + montantTVA;

  const onSubmit = async (data: FacturationFormData) => {
    setIsSubmitting(true);

    const numFac = data.numeroFacture || `FAC-${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}`;
    const selectedClient = clients.find(c => c.nom === data.client);

    const supabase = createClient();
    const { error: insertError } = await supabase.from('factures').insert([{
      numero_facture: numFac,
      client_id: selectedClient?.id || null,
      client_nom: data.client,
      date_facture: data.dateFacture,
      date_echeance: data.dateEcheance,
      produit: data.produit,
      quantite: parseFloat(data.quantite),
      prix_unitaire_ht: parseFloat(data.prixUnitaireHT),
      taux_tva: tauxTVA,
      remise,
      montant_ht: montantHTNet,
      montant_tva: montantTVA,
      montant_ttc: montantTTC,
      statut_paiement: data.statutPaiement,
      mode_paiement: data.modePaiement,
      notes: data.notes || '',
    }]);

    setIsSubmitting(false);

    if (insertError) {
      toast.error(`Erreur d'enregistrement: ${insertError.message}`);
      return;
    }

    toast.success(`Facture ${numFac} créée — Montant TTC : ${montantTTC.toFixed(2)} €`, { duration: 5000 });

    if (data.statutPaiement === 'retard') {
      toast.warning('Facture marquée en retard — Relance client recommandée', { duration: 4000 });
    }

    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="card-section">
        <div className="section-header">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-teal-700" />
            <h2 className="text-sm font-semibold text-zinc-800">Nouvelle facture</h2>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {/* Client & N° facture */}
          <div>
            <label className="form-label">Client <span className="text-red-500">*</span></label>
            <select
              className="form-select"
              {...register('client', { required: 'Client obligatoire' })}
              disabled={loadingClients}
            >
              <option value="">{loadingClients ? 'Chargement...' : 'Sélectionner un client'}</option>
              {clients.map((c) => (
                <option key={`fac-client-${c.id}`} value={c.nom}>{c.nom}</option>
              ))}
            </select>
            {errors.client && <p className="form-error">{errors.client.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">N° facture</label>
              <input
                className="form-input font-mono"
                placeholder="FAC-2026-XXX"
                {...register('numeroFacture')}
              />
            </div>
            <div>
              <label className="form-label">Date facture <span className="text-red-500">*</span></label>
              <input
                type="date"
                className="form-input"
                {...register('dateFacture', { required: 'Date obligatoire' })}
              />
              {errors.dateFacture && <p className="form-error">{errors.dateFacture.message}</p>}
            </div>
          </div>

          <div>
            <label className="form-label">Date d&apos;échéance <span className="text-red-500">*</span></label>
            <input
              type="date"
              className="form-input"
              {...register('dateEcheance', { required: 'Échéance obligatoire' })}
            />
            {errors.dateEcheance && <p className="form-error">{errors.dateEcheance.message}</p>}
          </div>

          {/* Produit */}
          <div>
            <label className="form-label">Produit / Prestation <span className="text-red-500">*</span></label>
            <select
              className="form-select"
              {...register('produit', { required: 'Produit obligatoire' })}
            >
              <option value="">Sélectionner un produit</option>
              {produits.map((p) => (
                <option key={`fac-prod-${p}`} value={p}>{p}</option>
              ))}
            </select>
            {errors.produit && <p className="form-error">{errors.produit.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Quantité <span className="text-red-500">*</span></label>
              <input
                type="number"
                step="1"
                className="form-input font-tabular"
                placeholder="0"
                {...register('quantite', { required: 'Quantité obligatoire', min: { value: 1, message: 'Min 1' } })}
              />
              {errors.quantite && <p className="form-error">{errors.quantite.message}</p>}
            </div>
            <div>
              <label className="form-label">Prix unitaire HT (€) <span className="text-red-500">*</span></label>
              <input
                type="number"
                step="0.01"
                className="form-input font-tabular"
                placeholder="0.00"
                {...register('prixUnitaireHT', { required: 'Prix obligatoire', min: { value: 0.01, message: 'Valeur positive' } })}
              />
              {errors.prixUnitaireHT && <p className="form-error">{errors.prixUnitaireHT.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">TVA (%)</label>
              <select className="form-select" {...register('tauxTVA')}>
                <option value="0">0% (exonéré)</option>
                <option value="5.5">5,5% (alimentaire)</option>
                <option value="10">10%</option>
                <option value="20">20%</option>
              </select>
            </div>
            <div>
              <label className="form-label">Remise (%)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                className="form-input font-tabular"
                placeholder="0"
                {...register('remise')}
              />
            </div>
          </div>

          {/* Calcul automatique */}
          {montantTTC > 0 && (
            <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 space-y-2 animate-slide-up">
              <p className="text-xs font-semibold text-zinc-700 mb-2">Récapitulatif</p>
              <div className="flex justify-between text-xs text-zinc-600">
                <span>Montant HT</span>
                <span className="font-tabular font-medium">{montantHT.toFixed(2)} €</span>
              </div>
              {remise > 0 && (
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Remise ({remise}%)</span>
                  <span className="font-tabular text-red-500">- {montantRemise.toFixed(2)} €</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-zinc-600">
                <span>TVA ({tauxTVA}%)</span>
                <span className="font-tabular font-medium">{montantTVA.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-teal-700 border-t border-teal-200 pt-2 mt-1">
                <span>Total TTC</span>
                <span className="font-tabular">{montantTTC.toFixed(2)} €</span>
              </div>
            </div>
          )}

          {/* Paiement */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Statut paiement <span className="text-red-500">*</span></label>
              <select
                className="form-select"
                {...register('statutPaiement', { required: true })}
              >
                <option value="en_attente">En attente</option>
                <option value="paye">Payé</option>
                <option value="retard">En retard</option>
                <option value="annule">Annulé</option>
              </select>
            </div>
            <div>
              <label className="form-label">Mode de paiement</label>
              <select className="form-select" {...register('modePaiement')}>
                <option value="virement">Virement bancaire</option>
                <option value="cheque">Chèque</option>
                <option value="especes">Espèces</option>
                <option value="carte">Carte bancaire</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Notes internes</label>
            <textarea
              rows={2}
              className="form-input resize-none"
              placeholder="Informations complémentaires..."
              {...register('notes')}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 sticky bottom-4 bg-white border border-zinc-200 rounded-xl shadow-lg px-5 py-4">
        <button type="button" onClick={() => reset()} className="btn-secondary">
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
              <Plus size={15} />
              Créer la facture
            </>
          )}
        </button>
      </div>
    </form>
  );
}
