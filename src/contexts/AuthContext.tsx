'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type UserRole = 'operateur' | 'responsable_qualite' | 'manager_production' | 'direction';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
}

// Role display labels
export const ROLE_LABELS: Record<UserRole, string> = {
  operateur: 'Opérateur',
  responsable_qualite: 'Resp. Qualité',
  manager_production: 'Manager Production',
  direction: 'Direction',
};

// Role colors for badges
export const ROLE_COLORS: Record<UserRole, string> = {
  operateur: 'bg-blue-100 text-blue-700',
  responsable_qualite: 'bg-teal-100 text-teal-700',
  manager_production: 'bg-orange-100 text-orange-700',
  direction: 'bg-purple-100 text-purple-700',
};

// Permission matrix per role
export const ROLE_PERMISSIONS: Record<UserRole, {
  canAccessDashboard: boolean;
  canAccessReception: boolean;
  canAccessEmballages: boolean;
  canAccessHygiene: boolean;
  canAccessTemperatures: boolean;
  canAccessAnomalies: boolean;
  canAccessEchantillonnage: boolean;
  canAccessFacturation: boolean;
  canValidate: boolean;
  canManageAnomalies: boolean;
  canViewKPI: boolean;
  canViewGlobal: boolean;
  canManageDirection: boolean;
  canManageDepots: boolean;
}> = {
  operateur: {
    canAccessDashboard: false,
    canAccessReception: true,
    canAccessEmballages: true,
    canAccessHygiene: true,
    canAccessTemperatures: true,
    canAccessAnomalies: false,
    canAccessEchantillonnage: true,
    canAccessFacturation: false,
    canValidate: false,
    canManageAnomalies: false,
    canViewKPI: false,
    canViewGlobal: false,
    canManageDirection: false,
    canManageDepots: false,
  },
  responsable_qualite: {
    canAccessDashboard: true,
    canAccessReception: true,
    canAccessEmballages: true,
    canAccessHygiene: true,
    canAccessTemperatures: true,
    canAccessAnomalies: true,
    canAccessEchantillonnage: true,
    canAccessFacturation: false,
    canValidate: true,
    canManageAnomalies: true,
    canViewKPI: false,
    canViewGlobal: false,
    canManageDirection: false,
    canManageDepots: false,
  },
  manager_production: {
    canAccessDashboard: true,
    canAccessReception: true,
    canAccessEmballages: true,
    canAccessHygiene: true,
    canAccessTemperatures: true,
    canAccessAnomalies: true,
    canAccessEchantillonnage: true,
    canAccessFacturation: true,
    canValidate: true,
    canManageAnomalies: true,
    canViewKPI: true,
    canViewGlobal: true,
    canManageDirection: false,
    canManageDepots: true,
  },
  direction: {
    canAccessDashboard: true,
    canAccessReception: true,
    canAccessEmballages: true,
    canAccessHygiene: true,
    canAccessTemperatures: true,
    canAccessAnomalies: true,
    canAccessEchantillonnage: true,
    canAccessFacturation: true,
    canValidate: true,
    canManageAnomalies: true,
    canViewKPI: true,
    canViewGlobal: true,
    canManageDirection: true,
    canManageDepots: true,
  },
};

interface AuthContextType {
  user: any;
  session: any;
  loading: boolean;
  profile: UserProfile | null;
  role: UserRole | null;
  permissions: typeof ROLE_PERMISSIONS[UserRole] | null;
  signUp: (email: string, password: string, metadata?: any) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  getCurrentUser: () => Promise<any>;
  isEmailVerified: () => boolean;
  getUserProfile: () => Promise<any>;
  hasPermission: (permission: keyof typeof ROLE_PERMISSIONS[UserRole]) => boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const supabase = createClient();

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) return null;
      return {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        role: data.role as UserRole,
        isActive: data.is_active,
      } as UserProfile;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const p = await fetchProfile(session.user.id);
        setProfile(p);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const p = await fetchProfile(session.user.id);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const role = profile?.role ?? null;
  const permissions = role ? ROLE_PERMISSIONS[role] : null;

  const hasPermission = (permission: keyof typeof ROLE_PERMISSIONS[UserRole]): boolean => {
    if (!permissions) return false;
    return permissions[permission] === true;
  };

  const signUp = async (email: string, password: string, metadata: any = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: metadata?.fullName || '',
          avatar_url: metadata?.avatarUrl || '',
          role: metadata?.role || 'operateur',
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  };

  const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  };

  const isEmailVerified = () => user?.email_confirmed_at !== null;

  const getUserProfile = async () => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) throw error;
    return data;
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    profile,
    role,
    permissions,
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    isEmailVerified,
    getUserProfile,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
