import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { pool } from '@/lib/db';

const ALLOWED_TABLES = new Set([
  'user_profiles','produits','fournisseurs','clients','depots',
  'chambres_froides','receptions','hygiene_sessions','emballage_controles',
  'temperature_releves','anomalies','factures','echantillonnage','parametres','devis','bons_commande','bons_livraison','paiements','paiement_factures','echeances','relances',
]);

// Never return these columns
const HIDDEN: Record<string, string[]> = {
  user_profiles: ['password_hash'],
};

// Serialize objects/arrays to JSON strings for MariaDB JSON columns
function serializeRow(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v !== null && typeof v === 'object') {
      out[k] = JSON.stringify(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}


// Auto-parse JSON strings returned by MariaDB for JSON columns
function parseJsonFields(rows: any[]): any[] {
  return rows.map(row => {
    const parsed: any = {};
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
        try { parsed[key] = JSON.parse(value); } catch { parsed[key] = value; }
      } else {
        parsed[key] = value;
      }
    }
    return parsed;
  });
}

function buildSelectCols(table: string, requested: string): string {
  if (requested && requested !== '*') return requested;
  const hidden = HIDDEN[table];
  if (!hidden?.length) return '*';
  // Explicitly list all except hidden
  const all: Record<string, string[]> = {
    user_profiles: ['id','email','full_name','role','is_active','created_at','updated_at'],
  };
  return (all[table] || ['*']).join(', ');
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ data: null, error: { message: 'Non authentifié' } }, { status: 401 });
  }

  const {
    table, operation, cols, filters, inFilters, orderCol, orderAsc,
    limitN, single, insertData, updateData, upsertData, upsertConflict,
  } = await request.json();

  if (!ALLOWED_TABLES.has(table)) {
    return NextResponse.json({ data: null, error: { message: 'Table non autorisée' } }, { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    const safeFilters: { col: string; val: any }[] = Array.isArray(filters) ? filters : [];
    const safeInFilters: { col: string; vals: any[] }[] = Array.isArray(inFilters) ? inFilters : [];

    const whereParts: string[] = [];
    const wVals: any[] = [];
    safeFilters.forEach(f => { whereParts.push(`\`${f.col}\` = ?`); wVals.push(f.val); });
    safeInFilters.forEach(f => {
      if (f.vals?.length) {
        whereParts.push(`\`${f.col}\` IN (${f.vals.map(() => '?').join(',')})`);
        wVals.push(...f.vals);
      }
    });
    const where = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    switch (operation) {
      case 'select': {
        const selectCols = buildSelectCols(table, cols || '*');
        const order = orderCol ? `ORDER BY \`${orderCol}\` ${orderAsc ? 'ASC' : 'DESC'}` : '';
        const limit = limitN ? `LIMIT ${Number(limitN)}` : '';
        const [rows] = await conn.execute(
          `SELECT ${selectCols} FROM \`${table}\` ${where} ${order} ${limit}`,
          wVals
        ) as any[];
        if (single) {
          const parsed = parseJsonFields(rows as any[]);
          return NextResponse.json(parsed.length
            ? { data: parsed[0], error: null }
            : { data: null, error: { message: 'Not found' } }
          );
        }
        return NextResponse.json({ data: parseJsonFields(rows as any[]), error: null });
      }

      case 'insert': {
        // Accept both insert([{}]) and insert({}) forms
        const rawInsert = Array.isArray(insertData) ? insertData : (insertData ? [insertData] : []);
        if (!rawInsert.length) {
          return NextResponse.json({ data: null, error: { message: 'Données manquantes' } }, { status: 400 });
        }
        // Alias so the loop below works unchanged
        const insertData2 = rawInsert;
        if (!insertData2.length) {
          return NextResponse.json({ data: null, error: { message: 'Données manquantes' } }, { status: 400 });
        }
        const results = [];
        for (const raw of insertData2) {
          const item = serializeRow({ ...raw });
          if (!item.id) item.id = crypto.randomUUID();
          const c = Object.keys(item);
          await conn.execute(
            `INSERT INTO \`${table}\` (${c.map(k => `\`${k}\``).join(',')}) VALUES (${c.map(() => '?').join(',')})`,
            c.map(k => item[k])
          );
          results.push(item);
        }
        return NextResponse.json({ data: results, error: null });
      }

      case 'update': {
        if (!updateData) return NextResponse.json({ data: null, error: { message: 'Données manquantes' } }, { status: 400 });
        const serialized = serializeRow(updateData);
        const c = Object.keys(serialized);
        await conn.execute(
          `UPDATE \`${table}\` SET ${c.map(k => `\`${k}\`=?`).join(',')} ${where}`,
          [...c.map(k => serialized[k]), ...wVals]
        );
        return NextResponse.json({ data: updateData, error: null });
      }

      case 'delete': {
        await conn.execute(`DELETE FROM \`${table}\` ${where}`, wVals);
        return NextResponse.json({ data: null, error: null });
      }

      case 'upsert': {
        const raw = Array.isArray(upsertData) ? upsertData[0] : upsertData;
        const item = serializeRow({ ...raw });
        if (!item.id) item.id = crypto.randomUUID();
        const c = Object.keys(item);
        const upd = c.filter(k => k !== upsertConflict).map(k => `\`${k}\`=VALUES(\`${k}\`)`).join(',');
        await conn.execute(
          `INSERT INTO \`${table}\` (${c.map(k => `\`${k}\``).join(',')}) VALUES (${c.map(() => '?').join(',')}) ON DUPLICATE KEY UPDATE ${upd}`,
          c.map(k => item[k])
        );
        return NextResponse.json({ data: item, error: null });
      }

      default:
        return NextResponse.json({ data: null, error: { message: 'Opération inconnue' } }, { status: 400 });
    }
  } catch (err: any) {
    console.error(`DB error [${table}/${operation}]:`, err.message);
    return NextResponse.json({ data: null, error: { message: err.message } }, { status: 500 });
  } finally {
    conn.release();
  }
}
