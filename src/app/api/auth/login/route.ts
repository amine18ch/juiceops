import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { signToken, setAuthCookie } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: { message: 'Email et mot de passe requis' } }, { status: 400 });
    }

    const conn = await pool.getConnection();
    const [rows] = await conn.execute(
      'SELECT id, email, password_hash, full_name, role, is_active FROM user_profiles WHERE email = ? LIMIT 1',
      [email.toLowerCase().trim()]
    ) as any[];
    conn.release();

    if (!rows.length) {
      return NextResponse.json({ error: { message: 'Email ou mot de passe incorrect' } }, { status: 401 });
    }

    const u = rows[0];
    if (!u.is_active) {
      return NextResponse.json({ error: { message: 'Compte désactivé. Contactez un administrateur.' } }, { status: 403 });
    }

    const valid = await bcrypt.compare(password, u.password_hash);
    if (!valid) {
      return NextResponse.json({ error: { message: 'Email ou mot de passe incorrect' } }, { status: 401 });
    }

    const payload = { id: u.id, email: u.email, full_name: u.full_name, role: u.role, is_active: u.is_active };
    const token = await signToken(payload);
    const response = NextResponse.json({ user: payload });
    setAuthCookie(response, token);
    return response;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: { message: 'Erreur serveur' } }, { status: 500 });
  }
}
