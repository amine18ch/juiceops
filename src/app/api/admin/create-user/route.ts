import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    // Verify the caller is authenticated and has direction role
    const serverSupabase = await createServerClient();
    const { data: { user }, error: authError } = await serverSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Check caller's role
    const { data: callerProfile } = await serverSupabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!callerProfile || callerProfile.role !== 'direction') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { email, password, full_name, role, is_active } = await req.json();

    if (!email || !password || !full_name || !role) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
    }

    // Use service role admin client to create user without affecting current session
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    if (newUser?.user) {
      const { error: profileError } = await adminSupabase.from('user_profiles').upsert({
        id: newUser.user.id,
        email,
        full_name,
        role,
        is_active: is_active ?? true,
      }, { onConflict: 'id' });

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
