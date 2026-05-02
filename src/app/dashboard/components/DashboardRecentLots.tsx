import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';

const recentLots = [
  { id: 'lot-L2026041', numero: 'L-2026-041', produit: 'Citrons Bio', fournisseur: 'Agrumes Bio SARL', quantite: '480 kg', dlc: '17/04/2026', tempReception: '8.2°C', statut: 'refuse' as const, operateur: 'T. Martin' },
  { id: 'lot-L2026040', numero: 'L-2026-040', produit: 'Oranges Valencia', fournisseur: 'SunFruit Maroc', quantite: '1 200 kg', dlc: '25/04/2026', tempReception: '3.1°C', statut: 'accepte' as const, operateur: 'S. Benali' },
  { id: 'lot-L2026039', numero: 'L-2026-039', produit: 'Pommes Gala', fournisseur: 'Vergers du Nord', quantite: '850 kg', dlc: '30/04/2026', tempReception: '2.8°C', statut: 'accepte' as const, operateur: 'T. Martin' },
  { id: 'lot-L2026038', numero: 'L-2026-038', produit: 'Gingembre frais', fournisseur: 'Épices & Co', quantite: '120 kg', dlc: '22/04/2026', tempReception: '4.5°C', statut: 'en_attente' as const, operateur: 'L. Dupont' },
  { id: 'lot-L2026037', numero: 'L-2026-037', produit: 'Mangues Alphonso', fournisseur: 'Tropic Import', quantite: '320 kg', dlc: '20/04/2026', tempReception: '5.1°C', statut: 'en_attente' as const, operateur: 'S. Benali' },
  { id: 'lot-L2026036', numero: 'L-2026-036', produit: 'Carottes BIO', fournisseur: 'Ferme Lévêque', quantite: '600 kg', dlc: '28/04/2026', tempReception: '3.4°C', statut: 'accepte' as const, operateur: 'T. Martin' },
];

export default function DashboardRecentLots() {
  return (
    <div className="card-section">
      <div className="section-header">
        <div>
          <h2 className="text-sm font-semibold text-zinc-800">Lots récents — Réceptions du jour</h2>
          <p className="text-xs text-zinc-400 mt-0.5">6 lots reçus ce matin</p>
        </div>
        <Link href="/r-ception-des-produits" className="btn-secondary text-xs py-1.5">
          Voir tout <ArrowRight size={13} />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-th">N° Lot</th>
              <th className="table-th">Produit</th>
              <th className="table-th">Fournisseur</th>
              <th className="table-th">Quantité</th>
              <th className="table-th">DLC</th>
              <th className="table-th">T° réception</th>
              <th className="table-th">Statut</th>
              <th className="table-th">Opérateur</th>
            </tr>
          </thead>
          <tbody>
            {recentLots.map((lot) => (
              <tr key={lot.id} className="table-row">
                <td className="table-td">
                  <span className="font-mono text-xs font-semibold text-teal-700">{lot.numero}</span>
                </td>
                <td className="table-td font-medium text-zinc-800">{lot.produit}</td>
                <td className="table-td text-zinc-500">{lot.fournisseur}</td>
                <td className="table-td font-tabular">{lot.quantite}</td>
                <td className={`table-td font-tabular text-xs ${lot.dlc === '17/04/2026' ? 'text-red-600 font-semibold' : 'text-zinc-600'}`}>
                  {lot.dlc}
                  {lot.dlc === '17/04/2026' && <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1 rounded">DLC!</span>}
                </td>
                <td className={`table-td font-tabular text-xs ${parseFloat(lot.tempReception) > 4 ? 'text-red-600 font-semibold' : 'text-zinc-600'}`}>
                  {lot.tempReception}
                  {parseFloat(lot.tempReception) > 4 && <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1 rounded">NOK</span>}
                </td>
                <td className="table-td">
                  <StatusBadge status={lot.statut} />
                </td>
                <td className="table-td text-zinc-500 text-xs">{lot.operateur}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}