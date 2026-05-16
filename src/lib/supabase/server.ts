import { pool } from '@/lib/db';
import { getUser } from '@/lib/auth';

// Server-side Supabase-compatible adapter using MariaDB directly

const ALLOWED_TABLES = [
  'user_profiles','produits','fournisseurs','clients','depots',
  'chambres_froides','receptions','hygiene_sessions','emballage_controles',
  'temperature_releves','anomalies','factures','echantillonnage',
];

function safeCols(table: string, cols: string): string {
  if (cols !== '*') return cols;
  if (table === 'user_profiles') return 'id, email, full_name, role, is_active, created_at, updated_at';
  return '*';
}

class ServerQB {
  private _t: string;
  private _op = 'select';
  private _cols = '*';
  private _filters: { col: string; val: any }[] = [];
  private _orderCol?: string;
  private _orderAsc = true;
  private _limitN?: number;
  private _single = false;
  private _insertData?: any[];
  private _updateData?: any;
  private _upsertData?: any;
  private _upsertConflict?: string;

  constructor(table: string) { this._t = table; }

  select(cols = '*') { this._cols = cols; return this; }
  eq(col: string, val: any) { this._filters.push({ col, val }); return this; }
  order(col: string, opts?: { ascending?: boolean }) {
    this._orderCol = col; this._orderAsc = opts?.ascending ?? true; return this;
  }
  limit(n: number) { this._limitN = n; return this; }
  single() { this._single = true; this._limitN = 1; return this; }
  insert(data: any[]) { this._op = 'insert'; this._insertData = data; return this; }
  update(data: any) { this._op = 'update'; this._updateData = data; return this; }
  delete() { this._op = 'delete'; return this; }
  upsert(data: any, opts?: { onConflict?: string }) {
    this._op = 'upsert'; this._upsertData = data; this._upsertConflict = opts?.onConflict; return this;
  }

  async execute(): Promise<{ data: any; error: any }> {
    if (!ALLOWED_TABLES.includes(this._t)) return { data: null, error: { message: 'Table non autorisée' } };
    const conn = await pool.getConnection();
    try {
      const where = this._filters.length
        ? `WHERE ${this._filters.map(f => `\`${f.col}\` = ?`).join(' AND ')}`
        : '';
      const wVals = this._filters.map(f => f.val);

      switch (this._op) {
        case 'select': {
          const q = `SELECT ${safeCols(this._t, this._cols)} FROM \`${this._t}\` ${where}
            ${this._orderCol ? `ORDER BY \`${this._orderCol}\` ${this._orderAsc ? 'ASC' : 'DESC'}` : ''}
            ${this._limitN ? `LIMIT ${this._limitN}` : ''}`;
          const [rows] = await conn.execute(q, wVals) as any;
          if (this._single) {
            return rows.length ? { data: rows[0], error: null } : { data: null, error: { message: 'Not found' } };
          }
          return { data: rows, error: null };
        }
        case 'insert': {
          const item = { ...this._insertData![0] };
          if (!item.id) item.id = crypto.randomUUID();
          const cols = Object.keys(item);
          await conn.execute(
            `INSERT INTO \`${this._t}\` (${cols.map(c => `\`${c}\``).join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
            cols.map(c => item[c])
          );
          return { data: [item], error: null };
        }
        case 'update': {
          const cols = Object.keys(this._updateData);
          await conn.execute(
            `UPDATE \`${this._t}\` SET ${cols.map(c => `\`${c}\`=?`).join(',')} ${where}`,
            [...cols.map(c => this._updateData[c]), ...wVals]
          );
          return { data: this._updateData, error: null };
        }
        case 'delete': {
          await conn.execute(`DELETE FROM \`${this._t}\` ${where}`, wVals);
          return { data: null, error: null };
        }
        case 'upsert': {
          const item = { ...(Array.isArray(this._upsertData) ? this._upsertData[0] : this._upsertData) };
          if (!item.id) item.id = crypto.randomUUID();
          const cols = Object.keys(item);
          const upd = cols.filter(c => c !== this._upsertConflict).map(c => `\`${c}\`=VALUES(\`${c}\`)`).join(',');
          await conn.execute(
            `INSERT INTO \`${this._t}\` (${cols.map(c => `\`${c}\``).join(',')}) VALUES (${cols.map(() => '?').join(',')}) ON DUPLICATE KEY UPDATE ${upd}`,
            cols.map(c => item[c])
          );
          return { data: item, error: null };
        }
        default: return { data: null, error: { message: 'Opération inconnue' } };
      }
    } catch (err: any) {
      return { data: null, error: { message: err.message } };
    } finally {
      conn.release();
    }
  }

  then(resolve: (v: any) => any, reject?: (r?: any) => any) {
    return this.execute().then(resolve, reject);
  }
}

export async function createClient() {
  return {
    from: (table: string) => new ServerQB(table),
    auth: {
      async getUser() {
        const user = await getUser();
        return { data: { user }, error: null };
      },
    },
  };
}
