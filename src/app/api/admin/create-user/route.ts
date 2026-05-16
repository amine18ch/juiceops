import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';

const VALID_ROLES = new Set(['operateur','responsable_qualite','manager_production','direction']);

export async function POST(request: NextRequest) {
  const currentUser = await getUser(request);
  if (!currentUser) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  if (currentUser.role !== 'direction') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  try {
    const { email, password, full_name, role } = await request.json();
    if (!email || !password || !full_name || !role) {
      return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 });
    }
    if (!VALID_ROLES.has(role)) {
      return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Mot de passe trop court (min 8 caractères)' }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const id = crypto.randomUUID();
    const conn = await pool.getConnection();
    try {
      await conn.execute(
        'INSERT INTO user_profiles (id, email, password_hash, full_name, role, is_active) VALUES (?, ?, ?, ?, ?, TRUE)',
        [id, email.toLowerCase().trim(), password_hash, full_name, role]
      );
      conn.release();
      return NextResponse.json({ user: { id, email, full_name, role, is_active: true } }, { status: 201 });
    } catch (dbErr: any) {
      conn.release();
      if (dbErr.code === 'ER_DUP_ENTRY') {
        return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 });
      }
      throw dbErr;
    }
  } catch (err: any) {
    console.error('create-user error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
