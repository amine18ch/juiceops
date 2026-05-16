'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { useAuth, ROLE_LABELS, ROLE_COLORS } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard, PackageCheck, AlertTriangle, Thermometer,
  ClipboardCheck, Box, ChevronLeft, ChevronRight, User,
  Settings, LogOut, FlaskConical, Receipt, Package,
  Truck, Users, Warehouse, UserCog, FileText, ShoppingCart, TrendingUp, CreditCard, Calendar, Shield,
} from 'lucide-react';

const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', badgeKey: null, permKey: 'canAccessDashboard' },
    ],
  },
  {
    label: 'Qualité & Contrôle',
    items: [
      { href: '/r-ception-des-produits',  icon: PackageCheck,   label: 'Réception Produits',   badgeKey: 'receptions',   permKey: 'canAccessReception' },
      { href: '/contr-le-des-emballages', icon: Box,            label: 'Contrôle Emballages',  badgeKey: null,           permKey: 'canAccessEmballages' },
      { href: '/hygi-ne-check-list',      icon: ClipboardCheck, label: 'Hygiène & Check-list', badgeKey: null,           permKey: 'canAccessHygiene' },
      { href: '/chantillonnage',          icon: FlaskConical,   label: 'Échantillonnage',      badgeKey: null,           permKey: 'canAccessEchantillonnage' },
    ],
  },
  {
    label: 'Surveillance',
    items: [
      { href: '/temp-ratures-de-stockage', icon: Thermometer,   label: 'Températures', badgeKey: 'temperatures', permKey: 'canAccessTemperatures' },
      { href: '/gestion-des-anomalies',    icon: AlertTriangle, label: 'Anomalies',    badgeKey: 'anomalies',    permKey: 'canAccessAnomalies' },
    ],
  },
  {
    label: 'Commercial',
    items: [
      { href: '/dashboard-commercial', icon: TrendingUp, label: 'KPI Commercial',       badgeKey: null, permKey: 'canAccessFacturation' },
      { href: '/devis',                icon: FileText,     label: 'Devis',                badgeKey: null, permKey: 'canAccessFacturation' },
      { href: '/bons-commande',        icon: ShoppingCart, label: 'Bons de commande',     badgeKey: null, permKey: 'canAccessFacturation' },
      { href: '/bons-livraison',       icon: Truck,        label: 'Bons de livraison',    badgeKey: null, permKey: 'canAccessFacturation' },
      { href: '/facturation-ventes',   icon: Receipt,      label: 'Facturation & Ventes', badgeKey: null, permKey: 'canAccessFacturation' },
      { href: '/paiements',             icon: CreditCard,   label: 'Paiements',            badgeKey: null, permKey: 'canAccessFacturation' },
      { href: '/echeances',             icon: Calendar,     label: 'Échéances',             badgeKey: null, permKey: 'canAccessFacturation' },
      { href: '/recouvrement',          icon: Shield,       label: 'Recouvrement',          badgeKey: null, permKey: 'canAccessFacturation' },
    ],
  },
  {
    label: 'Direction',
    items: [
      { href: '/gestion-produits',        icon: Package,     label: 'Produits',          badgeKey: null, permKey: 'canManageDirection' },
      { href: '/gestion-fournisseurs',    icon: Truck,       label: 'Fournisseurs',      badgeKey: null, permKey: 'canManageDirection' },
      { href: '/gestion-clients',         icon: Users,       label: 'Clients',           badgeKey: null, permKey: 'canManageDirection' },
      { href: '/gestion-depots',          icon: Warehouse,   label: 'Dépôts',            badgeKey: null, permKey: 'canManageDepots' },
      { href: '/gestion-chambres-froides',icon: Thermometer, label: 'Chambres Froides',  badgeKey: null, permKey: 'canManageDepots' },
      { href: '/gestion-utilisateurs',    icon: UserCog,     label: 'Utilisateurs',      badgeKey: null, permKey: 'canManageDirection' },
      { href: '/parametres',              icon: Settings,    label: 'Paramètres',        badgeKey: null, permKey: 'canManageDirection' },
    ],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [badges, setBadges] = useState<Record<string, number>>({});
  const pathname = usePathname();
  const router = useRouter();
  const { profile, role, permissions, signOut, loading } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!profile?.id) return;
    const fetchBadges = async () => {
      const [anomRes, recepRes, tempRes] = await Promise.all([
        supabase.from('anomalies').select('id').eq('statut', 'ouvert'),
        supabase.from('receptions').select('id').eq('statut', 'en_attente'),
        supabase.from('temperature_releves').select('id').eq('statut', 'alerte'),
      ]);
      setBadges({
        anomalies:    (anomRes.data  as any[])?.length || 0,
        receptions:   (recepRes.data as any[])?.length || 0,
        temperatures: (tempRes.data  as any[])?.length || 0,
      });
    };
    fetchBadges();
  }, [profile?.id, supabase]);

  const handleSignOut = async () => {
    try { await signOut(); } catch {}
    router.replace('/login');
  };

  const filteredGroups = NAV_GROUPS
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (!permissions) return false;
        return permissions[item.permKey as keyof typeof permissions] === true;
      }),
    }))
    .filter(group => group.items.length > 0);

  return (
    <aside className={`h-screen bg-white border-r border-zinc-200 flex flex-col transition-all duration-300 ease-in-out shrink-0 ${collapsed ? 'w-16' : 'w-60'}`}>
      {/* Logo */}
      <div className={`flex items-center border-b border-zinc-100 h-16 px-3 ${collapsed ? 'justify-center' : 'gap-2 px-4'}`}>
        <AppLogo size={32} />
        {!collapsed && <span className="font-bold text-teal-700 text-lg tracking-tight">JuiceOps</span>}
      </div>

      {/* Role badge */}
      {!collapsed && role && (
        <div className="px-4 py-2 border-b border-zinc-100">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${ROLE_COLORS[role]}`}>
            {ROLE_LABELS[role]}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-4">
        {filteredGroups.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest px-3 mb-1.5">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                const badgeCount = item.badgeKey ? (badges[item.badgeKey] || 0) : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`sidebar-nav-item relative ${isActive ? 'sidebar-nav-item-active' : 'sidebar-nav-item-inactive'} ${collapsed ? 'justify-center px-0' : ''}`}
                  >
                    <Icon size={18} className="shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {badgeCount > 0 && (
                          <span className="ml-auto text-[10px] font-bold bg-red-500 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                            {badgeCount}
                          </span>
                        )}
                      </>
                    )}
                    {collapsed && badgeCount > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-zinc-100 p-2 space-y-0.5">
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2.5 mb-1 rounded-lg bg-zinc-50 border border-zinc-200">
            <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
              <User size={14} className="text-teal-700" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-zinc-800 truncate">
                {loading ? '...' : (profile?.fullName || profile?.email || 'Utilisateur')}
              </p>
              <p className="text-[10px] text-zinc-400 truncate">
                {role ? ROLE_LABELS[role] : ''}
              </p>
            </div>
            <button onClick={handleSignOut} className="text-zinc-400 hover:text-red-500 transition-colors" title="Déconnexion">
              <LogOut size={14} />
            </button>
          </div>
        )}
        {collapsed && (
          <button onClick={handleSignOut} className="sidebar-nav-item sidebar-nav-item-inactive w-full justify-center px-0" title="Déconnexion">
            <LogOut size={18} className="shrink-0" />
          </button>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all duration-150"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
