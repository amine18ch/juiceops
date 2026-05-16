// POST /api/commercial/sync
// Syncs: échéances dates → statuts, factures → statuts, niveau_risque
// Called on page load in recouvrement/echeances to ensure fresh state

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { pool } from '@/lib/db';

function calcNiveauRisque(maxRetardJours: number): string {
  if (maxRetardJours > 90)  return 'contentieux';
  if (maxRetardJours > 60)  return 'risque';
  if (maxRetardJours > 30)  return 'surveillance';
  return 'normal';
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const conn = await pool.getConnection();
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Mark overdue échéances
    await conn.execute(
      `UPDATE echeances
       SET statut = 'en_retard'
       WHERE statut = 'a_venir' AND date_echeance < ?`,
      [today]
    );

    // 2. For each facture with échéances, recalculate montant_paye from paiement_factures
    await conn.execute(`
      UPDATE factures f
      SET montant_paye = COALESCE((
        SELECT SUM(pf.montant_affecte)
        FROM paiement_factures pf
        JOIN paiements p ON p.id = pf.paiement_id
        WHERE pf.facture_id = f.id AND p.annule = FALSE
      ), 0),
      montant_restant = f.montant_ttc - COALESCE((
        SELECT SUM(pf.montant_affecte)
        FROM paiement_factures pf
        JOIN paiements p ON p.id = pf.paiement_id
        WHERE pf.facture_id = f.id AND p.annule = FALSE
      ), 0)
    `);

    // 3. Update facture statut_paiement based on montant_paye
    await conn.execute(`
      UPDATE factures
      SET statut_paiement = CASE
        WHEN montant_paye <= 0              THEN 'en_attente'
        WHEN montant_paye >= montant_ttc - 0.001 THEN 'paye'
        ELSE 'partiellement_payee'
      END
      WHERE statut_paiement != 'annule'
    `);

    // 4. Mark factures as 'retard' if they have overdue échéances and aren't paid
    await conn.execute(`
      UPDATE factures f
      SET statut_paiement = 'retard'
      WHERE EXISTS (
        SELECT 1 FROM echeances e
        WHERE e.facture_id = f.id AND e.statut = 'en_retard'
      )
      AND f.statut_paiement IN ('en_attente', 'partiellement_payee')
      AND f.montant_restant > 0.001
    `);

    // 5. Update niveau_risque per client based on max days overdue
    const [clientRows] = await conn.execute(`
      SELECT DISTINCT client_id,
        DATEDIFF(CURDATE(), MIN(date_facture)) AS max_jours
      FROM factures
      WHERE statut_paiement IN ('en_attente','partiellement_payee','retard')
        AND client_id IS NOT NULL
      GROUP BY client_id
    `) as any[];

    for (const row of clientRows as any[]) {
      const risque = calcNiveauRisque(row.max_jours || 0);
      await conn.execute(
        `UPDATE factures SET niveau_risque = ? WHERE client_id = ? AND statut_paiement IN ('en_attente','partiellement_payee','retard')`,
        [risque, row.client_id]
      );
    }

    conn.release();
    return NextResponse.json({ synced: true, timestamp: new Date().toISOString() });

  } catch (err: any) {
    conn.release();
    console.error('Sync error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
