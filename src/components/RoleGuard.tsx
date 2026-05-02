'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldOff, ArrowLeft } from 'lucide-react';

interface RoleGuardProps {
  children: React.ReactNode;
  permission: string;
}

export default function RoleGuard({ children, permission }: RoleGuardProps) {
  const { loading, user, permissions } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const hasAccess = permissions?.[permission as keyof typeof permissions] === true;

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <ShieldOff size={28} className="text-red-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-800">Accès refusé</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Vous n&apos;avez pas les permissions nécessaires pour accéder à cette section.
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
        >
          <ArrowLeft size={16} />
          Retour
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
