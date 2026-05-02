'use client';
import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import HygieneChecklist from './components/HygieneChecklist';
import HygieneHistorique from './components/HygieneHistorique';
import { createClient } from '@/lib/supabase/client';

export interface CheckItemSnapshot {
  id: string;
  label: string;
  description: string;
  status: 'ok' | 'nok' | 'pending';
  actionCorrective: string;
  frequence: 'quotidien' | 'hebdo';
  groupLabel: string;
}

export interface HygieneSession {
  id: string;
  date: string;
  heure: string;
  score: number;
  signataire: string;
  statut: 'valide' | 'en_cours';
  nok: number;
  items?: CheckItemSnapshot[];
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function HygienePage() {
  const [sessions, setSessions] = useState<HygieneSession[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('hygiene_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) {
      setSessions(data.map((s: any) => ({
        id: s.id,
        date: formatDate(s.date_session),
        heure: s.heure,
        score: s.score,
        signataire: s.signataire,
        statut: s.statut as 'valide' | 'en_cours',
        nok: s.nok_count ?? 0,
        items: s.items ?? undefined,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleSessionValidated = (session: HygieneSession) => {
    setSessions((prev) => [session, ...prev]);
    setSessionCount((c) => c + 1);
  };

  const today = (() => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  })();

  const todayCount = sessions.filter((s) => s.date === today).length;

  return (
    <AppLayout>
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 xl:px-10 py-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Hygiène &amp; Check-list</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Contrôle BPH — Soumission libre, plusieurs fois par jour</p>
          </div>
          <div className="flex items-center gap-2">
            {todayCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
                {todayCount} session{todayCount > 1 ? 's' : ''} validée{todayCount > 1 ? 's' : ''} aujourd&apos;hui
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-semibold text-zinc-500">
                Aucune session aujourd&apos;hui
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 2xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <HygieneChecklist onSessionValidated={handleSessionValidated} sessionCount={sessionCount} />
          </div>
          <div className="xl:col-span-1">
            <HygieneHistorique sessions={sessions} loading={loading} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}