// POST  → enregistrer paiement + affecter factures + solder échéances FIFO
// PATCH → annuler paiement (revert tout)

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { pool } from '@/lib/db';

function calcStatut(paye: number, total: number): string {
  if (paye <= 0)                return 'en_attente';
  if (paye >= total - 0.001)    return 'paye';
  return 'partiellement_payee';
}

async function solderEcheancesFIFO(conn: any, factureId: string, montantDisponible: number) {
  // Get unpaid/partial échéances ordered by date (FIFO)
  const [rows] = await conn.execute(
    `SELECT * FROM echeances
     WHERE facture_id = ? AND statut IN ('a_venir','en_retard','partiellement_payee')
     ORDER BY date_echeance ASC`,
    [factureId]
  ) as any[];

  let restant = montantDisponible;
  for (const e of rows as any[]) {
    if (restant <= 0) break;
    const dejaPayeSurEch = parseFloat(e.montant_paye) || 0;
    const aPayerSurEch   = parseFloat(e.montant) - dejaPayeSurEch;
    const appliquer      = Math.min(restant, aPayerSurEch);
    const newPaye        = dejaPayeSurEch + appliquer;
    const newStatut      = newPaye >= parseFloat(e.montant) - 0.001
      ? 'payee'
      : newPaye > 0 ? 'partiellement_payee' : e.statut;
    await conn.execute(
      'UPDATE echeances SET montant_paye = ?, statut = ? WHERE id = ?',
      [newPaye, newStatut, e.id]
    );
    restant -= appliquer;
  }
}

async function revertEcheancesFIFO(conn: any, factureId: string, montantARevert: number) {
  // Revert in reverse order (LIFO for revert)
  const [rows] = await conn.execute(
    `SELECT * FROM echeances
     WHERE facture_id = ? AND montant_paye > 0
     ORDER BY date_echeance DESC`,
    [factureId]
  ) as any[];

  let aRevert = montantARevert;
  for (const e of rows as any[]) {
    if (aRevert <= 0) break;
    const payeSurEch = parseFloat(e.montant_paye) || 0;
    const revertAmt  = Math.min(aRevert, payeSurEch);
    const newPaye    = payeSurEch - revertAmt;
    const newStatut  = newPaye <= 0
      ? (new Date(e.date_echeance) < new Date() ? 'en_retard' : 'a_venir')
      : 'partiellement_payee';
    await conn.execute(
      'UPDATE echeances SET montant_paye = ?, statut = ? WHERE id = ?',
      [newPaye, newStatut, e.id]
    );
    aRevert -= revertAmt;
  }
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { date_paiement, montant, mode_paiement, reference, client_id, client_nom, notes, affectations } = await request.json();

  if (!date_paiement || !montant || !affectations?.length) {
    return NextResponse.json({ error: 'date_paiement, montant et affectations obligatoires' }, { status: 400 });
  }

  const totalAff = affectations.reduce((s: number, a: any) => s + parseFloat(a.montant_affecte || 0), 0);
  if (totalAff > parseFloat(montant) + 0.001) {
    return NextResponse.json({ error: `Total affecté ${totalAff.toFixed(3)} > montant ${montant}` }, { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const paiementId = crypto.randomUUID();
    const numero     = `PAI-${new Date().getFullYear()}-${Math.floor(Math.random()*9000+1000)}`;

    await conn.execute(
      'INSERT INTO paiements (id,numero,date_paiement,montant,mode_paiement,reference,client_id,client_nom,notes) VALUES (?,?,?,?,?,?,?,?,?)',
      [paiementId, numero, date_paiement, montant, mode_paiement||'virement', reference||'', client_id||null, client_nom||'', notes||'']
    );

    for (const aff of affectations) {
      const montantAff = parseFloat(aff.montant_affecte);
      await conn.execute(
        'INSERT INTO paiement_factures (id,paiement_id,facture_id,montant_affecte) VALUES (?,?,?,?)',
        [crypto.randomUUID(), paiementId, aff.facture_id, montantAff]
      );

      // Update facture montant_paye
      const [fRows] = await conn.execute('SELECT montant_ttc, montant_paye FROM factures WHERE id=?', [aff.facture_id]) as any[];
      if (fRows.length > 0) {
        const total   = parseFloat(fRows[0].montant_ttc) || 0;
        const paye    = (parseFloat(fRows[0].montant_paye) || 0) + montantAff;
        const restant = Math.max(0, total - paye);
        const statut  = calcStatut(paye, total);
        await conn.execute(
          'UPDATE factures SET montant_paye=?, montant_restant=?, statut_paiement=? WHERE id=?',
          [paye, restant, statut, aff.facture_id]
        );
      }

      // *** FIFO: solder les échéances de la facture ***
      await solderEcheancesFIFO(conn, aff.facture_id, montantAff);
    }

    await conn.commit();
    return NextResponse.json({ paiement_id: paiementId, numero }, { status: 201 });

  } catch (err: any) {
    await conn.rollback();
    console.error('Paiement error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    conn.release();
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { paiement_id, motif_annulation } = await request.json();
  if (!paiement_id) return NextResponse.json({ error: 'paiement_id requis' }, { status: 400 });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [pRows] = await conn.execute('SELECT * FROM paiements WHERE id=? AND annule=FALSE', [paiement_id]) as any[];
    if (!pRows.length) {
      conn.release();
      return NextResponse.json({ error: 'Paiement introuvable ou déjà annulé' }, { status: 404 });
    }

    const [pfRows] = await conn.execute('SELECT * FROM paiement_factures WHERE paiement_id=?', [paiement_id]) as any[];

    for (const pf of pfRows as any[]) {
      // Revert facture
      const [fRows] = await conn.execute('SELECT montant_ttc, montant_paye FROM factures WHERE id=?', [pf.facture_id]) as any[];
      if (fRows.length > 0) {
        const total   = parseFloat(fRows[0].montant_ttc) || 0;
        const paye    = Math.max(0, (parseFloat(fRows[0].montant_paye) || 0) - parseFloat(pf.montant_affecte));
        const restant = Math.max(0, total - paye);
        const statut  = calcStatut(paye, total);
        await conn.execute(
          'UPDATE factures SET montant_paye=?, montant_restant=?, statut_paiement=? WHERE id=?',
          [paye, restant, statut, pf.facture_id]
        );
      }

      // *** Revert échéances LIFO ***
      await revertEcheancesFIFO(conn, pf.facture_id, parseFloat(pf.montant_affecte));
    }

    await conn.execute(
      'UPDATE paiements SET annule=TRUE, motif_annulation=? WHERE id=?',
      [motif_annulation||'Annulé', paiement_id]
    );

    await conn.commit();
    return NextResponse.json({ success: true });

  } catch (err: any) {
    await conn.rollback();
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    conn.release();
  }
}
