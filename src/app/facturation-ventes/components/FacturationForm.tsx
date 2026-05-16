'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Receipt, Loader2, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import LignesEditor, { Ligne, newLigne, calcTotaux } from '@/components/LignesEditor';

export default function FacturationForm() {
  const supabase = useMemo(() => createClient(), []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients]   = useState<any[]>([]);
  const [produits, setProduits] = useState<any[]>([]);
  const [params, setParams]     = useState({ fodec: 1, timbre: 1, devise: 'TND' });
  const [loadingData, setLoadingData] = useState(true);

  // Form fields
  const [clientNom, setClientNom]   = useState('');
  const [clientId, setClientId]     = useState('');
  const [numFac, setNumFac]         = useState('');
  const [dateFacture, setDateFacture] = useState(new Date().toISOString().split('T')[0]);
  const [dateEcheance, setDateEcheance] = useState('');
  const [statutPaiement, setStatutPaiement] = useState<'en_attente'|'paye'|'retard'|'annule'>('en_attente');
  const [modePaiement, setModePaiement] = useState('virement');
  const [notes, setNotes]         = useState('');
  const [lignes, setLignes]       = useState<Ligne[]>([newLigne()]);

  useEffect(() => {
    const fetchAll = async () => {
      const [cRes, pRes, paramRes] = await Promise.all([
        supabase.from('clients').select('id,nom').eq('actif', true).order('nom'),
        supabase.from('produits').select('id,nom,prix_unitaire').eq('actif', true).order('nom'),
        supabase.from('parametres').select('cle,valeur'),
      ]);
      if (cRes.data) setClients(cRes.data);
      if (pRes.data) setProduits(pRes.data);
      if (paramRes.data) {
        const m: any = {};
        (paramRes.data as any[]).forEach((p: any) => { m[p.cle] = p.valeur; });
        setParams({ fodec: parseFloat(m.fodec||'1'), timbre: parseFloat(m.timbre_fiscal||'1'), devise: m.devise||'TND' });
      }
      setLoadingData(false);
    };
    fetchAll();
  }, [supabase]);

  const { totHT, totFodec, totTVA, ttc } = calcTotaux(lignes, params);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientNom || lignes.some(l => !l.produit || !l.quantite || !l.prix_unitaire_ht)) {
      toast.error('Client et lignes produits (avec quantité et prix) obligatoires.');
      return;
    }
    setIsSubmitting(true);
    const numero = numFac || `FAC-${new Date().getFullYear()}-${Math.floor(Math.random()*900+100)}`;
    const first  = lignes[0];

    const { error } = await supabase.from('factures').insert([{
      numero_facture: numero, client_id: clientId, client_nom: clientNom,
      date_facture: dateFacture, date_echeance: dateEcheance,
      lignes: lignes.map(({ _id, ...r }) => r),
      produit: lignes.map(l => l.produit).join(', '),
      quantite: first.quantite, prix_unitaire_ht: first.prix_unitaire_ht,
      taux_tva: first.taux_tva, remise: first.remise,
      montant_ht: totHT, montant_tva: totTVA, montant_ttc: ttc,
      statut_paiement: statutPaiement, mode_paiement: modePaiement, notes,
    }]);

    setIsSubmitting(false);
    if (error) { toast.error(`Erreur: ${error.message}`); return; }

    toast.success(`Facture ${numero} créée — TTC : ${ttc.toFixed(3)} ${params.devise}`, { duration: 5000 });
    if (statutPaiement === 'retard') toast.warning('Facture en retard — Relance recommandée', { duration: 4000 });

    // Reset
    setClientNom(''); setClientId(''); setNumFac('');
    setDateFacture(new Date().toISOString().split('T')[0]); setDateEcheance('');
    setStatutPaiement('en_attente'); setModePaiement('virement'); setNotes('');
    setLignes([newLigne()]);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="card-section">
        <div className="section-header">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-teal-700"/>
            <h2 className="text-sm font-semibold text-zinc-800">Nouvelle facture</h2>
            <span className="ml-2 text-[10px] px-2 py-0.5 bg-teal-50 border border-teal-200 text-teal-700 rounded-full font-semibold">Loi fiscale tunisienne</span>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Client + N° */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Client <span className="text-red-500">*</span></label>
              <select className="form-select" value={clientNom}
                onChange={e => { const c = clients.find(x => x.nom === e.target.value); setClientNom(e.target.value); setClientId(c?.id||''); }}
                disabled={loadingData}>
                <option value="">{loadingData ? 'Chargement...' : 'Sélectionner'}</option>
                {clients.map(c => <option key={c.id} value={c.nom}>{c.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">N° Facture</label>
              <input className="form-input font-mono" placeholder="FAC-2026-XXX" value={numFac} onChange={e => setNumFac(e.target.value)}/>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Date facture <span className="text-red-500">*</span></label>
              <input type="date" className="form-input" value={dateFacture} onChange={e => setDateFacture(e.target.value)} required/>
            </div>
            <div>
              <label className="form-label">Date échéance <span className="text-red-500">*</span></label>
              <input type="date" className="form-input" value={dateEcheance} onChange={e => setDateEcheance(e.target.value)} required/>
            </div>
          </div>

          {/* Lignes produits */}
          <div>
            <label className="form-label mb-2">Lignes de la facture <span className="text-red-500">*</span></label>
            <LignesEditor lignes={lignes} onChange={setLignes} produits={produits} params={params} typeFilter="produit_fini"/>
          </div>

          {/* FODEC toggle info */}
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <span className="font-semibold">FODEC</span> ({params.fodec}%) et timbre fiscal ({params.timbre} {params.devise}) appliqués automatiquement — modifiables dans les Paramètres.
          </div>

          {/* Paiement */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Statut paiement <span className="text-red-500">*</span></label>
              <select className="form-select" value={statutPaiement} onChange={e => setStatutPaiement(e.target.value as any)}>
                <option value="en_attente">En attente</option>
                <option value="paye">Payé</option>
                <option value="retard">En retard</option>
                <option value="annule">Annulé</option>
              </select>
            </div>
            <div>
              <label className="form-label">Mode de paiement</label>
              <select className="form-select" value={modePaiement} onChange={e => setModePaiement(e.target.value)}>
                <option value="virement">Virement bancaire</option>
                <option value="cheque">Chèque</option>
                <option value="especes">Espèces</option>
                <option value="traite">Traite</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Notes internes</label>
            <textarea rows={2} className="form-input resize-none" placeholder="Informations complémentaires..." value={notes} onChange={e => setNotes(e.target.value)}/>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 sticky bottom-4 bg-white border border-zinc-200 rounded-xl shadow-lg px-5 py-4">
        <button type="button" onClick={() => { setClientNom('');setLignes([newLigne()]); }} className="btn-secondary">Réinitialiser</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
          {isSubmitting ? <Loader2 size={15} className="animate-spin"/> : <Plus size={15}/>}
          {isSubmitting ? 'Enregistrement...' : 'Créer la facture'}
        </button>
      </div>
    </form>
  );
}
