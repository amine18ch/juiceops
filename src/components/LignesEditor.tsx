'use client';
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

export interface Ligne {
  _id: string;
  produit: string;
  quantite: number;
  prix_unitaire_ht: number;
  taux_tva: number;
  remise: number;
}

interface Produit { id: string; nom: string; prix_unitaire: number; }
interface Params   { fodec: number; timbre: number; devise: string; }

const TVA_OPTS = [
  { v: 0,  l: '0% — Exonéré' },
  { v: 7,  l: '7% — Réduit' },
  { v: 13, l: '13% — Intermédiaire' },
  { v: 19, l: '19% — Normal' },
];

export function calcLigne(l: Ligne, fodec: number) {
  const ht     = l.quantite * l.prix_unitaire_ht * (1 - l.remise / 100);
  const fodecM = ht * (fodec / 100);
  const tvaM   = ht * (l.taux_tva / 100);
  return { ht, fodecM, tvaM, total: ht + fodecM + tvaM };
}

export function calcTotaux(lignes: Ligne[], params: Params) {
  const totHT    = lignes.reduce((s, l) => s + calcLigne(l, params.fodec).ht,     0);
  const totFodec = lignes.reduce((s, l) => s + calcLigne(l, params.fodec).fodecM, 0);
  const totTVA   = lignes.reduce((s, l) => s + calcLigne(l, params.fodec).tvaM,   0);
  const ttc      = totHT + totFodec + totTVA + params.timbre;
  return { totHT, totFodec, totTVA, ttc };
}

export function newLigne(): Ligne {
  return { _id: crypto.randomUUID(), produit: '', quantite: 1, prix_unitaire_ht: 0, taux_tva: 19, remise: 0 };
}

interface Props {
  lignes: Ligne[];
  onChange: (lignes: Ligne[]) => void;
  produits: Produit[];
  params: Params;
  typeFilter?: string; // matiere_premiere | produit_fini | all
  showQteCommandee?: boolean; // pour BL
  qtesCommandees?: Record<string, number>;
  onQteCommandeeChange?: (id: string, v: number) => void;
}

export default function LignesEditor({ lignes, onChange, produits, params, showQteCommandee, qtesCommandees, onQteCommandeeChange, typeFilter }: Props) {
  const filteredProduits = typeFilter && typeFilter !== 'all'
    ? produits.filter((p: any) => p.type_produit === typeFilter || !p.type_produit)
    : produits;
  const fmt = (n: number) => n.toFixed(3);

  const update = (id: string, field: keyof Ligne, value: any) => {
    onChange(lignes.map(l => l._id === id ? { ...l, [field]: value } : l));
  };

  const selectProduit = (id: string, nom: string) => {
    const p = filteredProduits.find(x => x.nom === nom);
    onChange(lignes.map(l => l._id === id ? { ...l, produit: nom, prix_unitaire_ht: p?.prix_unitaire ?? l.prix_unitaire_ht } : l));
  };

  const remove = (id: string) => onChange(lignes.filter(l => l._id !== id));
  const add    = () => onChange([...lignes, newLigne()]);

  const { totHT, totFodec, totTVA, ttc } = calcTotaux(lignes, params);

  return (
    <div className="space-y-3">
      {/* Lines table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-500 min-w-[180px]">Produit</th>
              {showQteCommandee && <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-500 w-20">Qté cmd</th>}
              <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-500 w-20">{showQteCommandee ? 'Qté livrée' : 'Quantité'}</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-500 w-28">Prix HT ({params.devise})</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-500 w-28">TVA</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-500 w-20">Remise %</th>
              <th className="text-right px-3 py-2 text-xs font-semibold text-zinc-500 w-28">Montant HT</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {lignes.map((l) => {
              const { ht } = calcLigne(l, params.fodec);
              return (
                <tr key={l._id} className="hover:bg-zinc-50/60">
                  {/* Produit */}
                  <td className="px-3 py-2">
                    <select
                      className="w-full text-xs border border-zinc-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-teal-500 bg-white"
                      value={l.produit}
                      onChange={e => selectProduit(l._id, e.target.value)}
                    >
                      <option value="">Sélectionner...</option>
                      {filteredProduits.map(p => <option key={p.id} value={p.nom}>{p.nom}</option>)}
                    </select>
                  </td>
                  {/* Qté commandée (BL only) */}
                  {showQteCommandee && (
                    <td className="px-3 py-2">
                      <input type="number" min="0" step="1"
                        className="w-full text-xs border border-zinc-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-teal-500 font-tabular"
                        value={qtesCommandees?.[l._id] ?? l.quantite}
                        onChange={e => onQteCommandeeChange?.(l._id, parseFloat(e.target.value) || 0)}
                      />
                    </td>
                  )}
                  {/* Quantité */}
                  <td className="px-3 py-2">
                    <input type="number" min="0" step="1"
                      className="w-full text-xs border border-zinc-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-teal-500 font-tabular"
                      value={l.quantite}
                      onChange={e => update(l._id, 'quantite', parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  {/* Prix HT */}
                  <td className="px-3 py-2">
                    <input type="number" min="0" step="0.001"
                      className="w-full text-xs border border-zinc-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-teal-500 font-tabular"
                      value={l.prix_unitaire_ht}
                      onChange={e => update(l._id, 'prix_unitaire_ht', parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  {/* TVA */}
                  <td className="px-3 py-2">
                    <select
                      className="w-full text-xs border border-zinc-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-teal-500 bg-white"
                      value={l.taux_tva}
                      onChange={e => update(l._id, 'taux_tva', parseFloat(e.target.value))}
                    >
                      {TVA_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                  </td>
                  {/* Remise */}
                  <td className="px-3 py-2">
                    <input type="number" min="0" max="100" step="0.5"
                      className="w-full text-xs border border-zinc-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-teal-500 font-tabular"
                      value={l.remise}
                      onChange={e => update(l._id, 'remise', parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  {/* Montant HT */}
                  <td className="px-3 py-2 text-right">
                    <span className="text-xs font-tabular font-semibold text-zinc-700">
                      {fmt(ht)} {params.devise}
                    </span>
                  </td>
                  {/* Delete */}
                  <td className="px-2 py-2">
                    {lignes.length > 1 && (
                      <button onClick={() => remove(l._id)} type="button"
                        className="p-1 rounded text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add line button */}
      <button type="button" onClick={add}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-teal-700 border border-teal-200 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors">
        <Plus size={13} /> Ajouter une ligne
      </button>

      {/* Totaux */}
      {(totHT > 0) && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 space-y-1.5">
          <p className="text-xs font-bold text-zinc-700 uppercase tracking-wide mb-2">Récapitulatif — {params.devise}</p>
          <div className="flex justify-between text-xs text-zinc-600">
            <span>Total HT Net</span>
            <span className="font-tabular font-medium">{fmt(totHT)} {params.devise}</span>
          </div>
          <div className="flex justify-between text-xs text-amber-700">
            <span>FODEC ({params.fodec}%)</span>
            <span className="font-tabular">{fmt(totFodec)} {params.devise}</span>
          </div>
          <div className="flex justify-between text-xs text-blue-700">
            <span>Total TVA</span>
            <span className="font-tabular">{fmt(totTVA)} {params.devise}</span>
          </div>
          <div className="flex justify-between text-xs text-zinc-600">
            <span>Timbre fiscal</span>
            <span className="font-tabular">{fmt(params.timbre)} {params.devise}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-teal-700 border-t-2 border-teal-300 pt-2 mt-1">
            <span>Total TTC</span>
            <span className="font-tabular text-base">{fmt(ttc)} {params.devise}</span>
          </div>
        </div>
      )}
    </div>
  );
}
