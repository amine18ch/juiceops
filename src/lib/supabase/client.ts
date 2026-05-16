'use client';

// Drop-in Supabase-compatible adapter — routes all calls to local MariaDB API
// Same API surface as @supabase/supabase-js so no page files need to change.

let _authCallbacks: Array<(event: string, session: any) => void> = [];
let _cachedUser: any = null;
let _fetchingUser: Promise<any> | null = null;

async function fetchMe(): Promise<any> {
  if (_fetchingUser) return _fetchingUser;
  _fetchingUser = fetch('/api/auth/me')
    .then(r => r.json())
    .then(d => { _cachedUser = d.user ?? null; _fetchingUser = null; return _cachedUser; })
    .catch(() => { _cachedUser = null; _fetchingUser = null; return null; });
  return _fetchingUser;
}

class QueryBuilder {
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
  private _inFilters: { col: string; vals: any[] }[] = [];

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
  in(col: string, vals: any[]) { this._inFilters.push({ col, vals }); return this; }

  async execute(): Promise<{ data: any; error: any }> {
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: this._t, operation: this._op, cols: this._cols,
          filters: this._filters, inFilters: this._inFilters,
          orderCol: this._orderCol, orderAsc: this._orderAsc,
          limitN: this._limitN, single: this._single,
          insertData: this._insertData, updateData: this._updateData,
          upsertData: this._upsertData, upsertConflict: this._upsertConflict,
        }),
      });
      const json = await res.json();
      if (!res.ok) return { data: null, error: json.error || { message: 'Erreur requête' } };
      return json;
    } catch (err: any) {
      return { data: null, error: { message: err.message } };
    }
  }

  then(resolve: (v: any) => any, reject?: (r?: any) => any) {
    return this.execute().then(resolve, reject);
  }
}

export function createClient() {
  return {
    from: (table: string) => new QueryBuilder(table),

    auth: {
      async getSession() {
        const user = await fetchMe();
        return { data: { session: user ? { user } : null }, error: null };
      },

      async getUser() {
        const user = await fetchMe();
        return { data: { user }, error: null };
      },

      async signInWithPassword({ email, password }: { email: string; password: string }) {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) return { data: null, error: data.error || { message: 'Connexion échouée' } };
        _cachedUser = data.user;
        const session = { user: data.user };
        _authCallbacks.forEach(cb => cb('SIGNED_IN', session));
        return { data: { user: data.user, session }, error: null };
      },

      async signOut() {
        await fetch('/api/auth/logout', { method: 'POST' });
        _cachedUser = null;
        _authCallbacks.forEach(cb => cb('SIGNED_OUT', null));
        return { error: null };
      },

      async signUp(_opts: any) {
        return { data: null, error: { message: 'Utilisez le panneau admin pour créer des comptes' } };
      },

      onAuthStateChange(callback: (event: string, session: any) => void) {
        _authCallbacks.push(callback);
        fetchMe().then(user => {
          callback(user ? 'SIGNED_IN' : 'SIGNED_OUT', user ? { user } : null);
        });
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                _authCallbacks = _authCallbacks.filter(cb => cb !== callback);
              },
            },
          },
        };
      },
    },
  };
}
