'use client';
import React, { useState } from 'react';
import { HygieneSession, CheckItemSnapshot } from '../page';
import { Eye, Printer, CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';

interface HygieneHistoriqueProps {
  sessions: HygieneSession[];
  loading?: boolean;
}

// ─── Print helper ────────────────────────────────────────────────────────────
function printSession(session: HygieneSession) {
  const scoreColor = session.score >= 90 ? '#059669' : session.score >= 75 ? '#d97706' : '#dc2626';

  const groupedItems: Record<string, CheckItemSnapshot[]> = {};
  if (session.items) {
    session.items.forEach((item) => {
      if (!groupedItems[item.groupLabel]) groupedItems[item.groupLabel] = [];
      groupedItems[item.groupLabel].push(item);
    });
  }

  const groupsHtml = Object.entries(groupedItems).map(([groupLabel, items]) => {
    const itemsHtml = items.map((item) => {
      const statusIcon = item.status === 'ok' ? '✅' : item.status === 'nok' ? '❌' : '⏳';
      const rowBg = item.status === 'nok' ? '#fff1f2' : item.status === 'ok' ? '#f0fdf4' : '#fafafa';
      const actionRow = item.status === 'nok' && item.actionCorrective
        ? `<tr style="background:${rowBg}"><td colspan="3" style="padding:4px 12px 8px 36px;font-size:11px;color:#b91c1c;font-style:italic;">↳ Action corrective : ${item.actionCorrective}</td></tr>`
        : '';
      return `
        <tr style="background:${rowBg};border-bottom:1px solid #e5e7eb;">
          <td style="padding:7px 12px;font-size:12px;color:#374151;">${statusIcon} ${item.label}</td>
          <td style="padding:7px 12px;font-size:11px;color:#6b7280;text-align:center;">${item.frequence === 'quotidien' ? 'Quotidien' : 'Hebdo'}</td>
          <td style="padding:7px 12px;font-size:12px;font-weight:600;text-align:center;color:${item.status === 'ok' ? '#059669' : item.status === 'nok' ? '#dc2626' : '#9ca3af'};">${item.status === 'ok' ? 'OK' : item.status === 'nok' ? 'NOK' : '—'}</td>
        </tr>${actionRow}`;
    }).join('');
    return `
      <div style="margin-bottom:16px;">
        <div style="background:#f3f4f6;padding:6px 12px;font-size:12px;font-weight:700;color:#374151;border-radius:4px 4px 0 0;border:1px solid #e5e7eb;">${groupLabel}</div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-top:none;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:6px 12px;font-size:11px;color:#6b7280;text-align:left;font-weight:600;">Point de contrôle</th>
              <th style="padding:6px 12px;font-size:11px;color:#6b7280;text-align:center;font-weight:600;">Fréquence</th>
              <th style="padding:6px 12px;font-size:11px;color:#6b7280;text-align:center;font-weight:600;">Résultat</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
      </div>`;
  }).join('');

  const nokItems = session.items?.filter((i) => i.status === 'nok') ?? [];
  const nokSummary = nokItems.length > 0
    ? `<div style="margin-top:16px;padding:12px;background:#fff1f2;border:1px solid #fecaca;border-radius:6px;">
        <p style="font-size:12px;font-weight:700;color:#b91c1c;margin:0 0 8px 0;">⚠️ Items NOK — Actions correctives</p>
        ${nokItems.map((i) => `<p style="font-size:11px;color:#374151;margin:4px 0;"><strong>${i.label}</strong> : ${i.actionCorrective || 'Aucune action renseignée'}</p>`).join('')}
      </div>`
    : '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Check-list Hygiène — ${session.date} ${session.heure}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #111827; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #e5e7eb;">
    <div>
      <h1 style="font-size:18px;font-weight:800;margin:0 0 4px 0;color:#111827;">Check-list Hygiène BPH</h1>
      <p style="font-size:12px;color:#6b7280;margin:0;">Date : <strong>${session.date}</strong> &nbsp;|&nbsp; Heure : <strong>${session.heure}</strong> &nbsp;|&nbsp; Signataire : <strong>${session.signataire}</strong></p>
      <p style="font-size:11px;color:#9ca3af;margin:4px 0 0 0;">Réf. session : ${session.id}</p>
    </div>
    <div style="text-align:center;background:#f9fafb;border:2px solid #e5e7eb;border-radius:8px;padding:12px 20px;">
      <p style="font-size:28px;font-weight:900;margin:0;color:${scoreColor};">${session.score}%</p>
      <p style="font-size:11px;color:#6b7280;margin:2px 0 0 0;">Score hygiène</p>
      ${session.nok > 0 ? `<p style="font-size:10px;color:#dc2626;margin:2px 0 0 0;">${session.nok} item(s) NOK</p>` : '<p style="font-size:10px;color:#059669;margin:2px 0 0 0;">Aucun NOK</p>'}
    </div>
  </div>
  ${session.items ? groupsHtml : '<p style="color:#6b7280;font-size:13px;">Détail des items non disponible pour cette session.</p>'}
  ${nokSummary}
  <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;">
    <span>JuiceOps — Contrôle Hygiène ISO 22000 / HACCP</span>
    <span>Imprimé le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
  </div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function SessionDetailModal({ session, onClose }: { session: HygieneSession; onClose: () => void }) {
  const scoreColor = session.score >= 90 ? 'text-emerald-600' : session.score >= 75 ? 'text-amber-600' : 'text-red-600';
  const scoreBg = session.score >= 90 ? 'bg-emerald-50 border-emerald-200' : session.score >= 75 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

  const groupedItems: Record<string, CheckItemSnapshot[]> = {};
  if (session.items) {
    session.items.forEach((item) => {
      if (!groupedItems[item.groupLabel]) groupedItems[item.groupLabel] = [];
      groupedItems[item.groupLabel].push(item);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-zinc-100">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Détail de la session</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{session.date} à {session.heure} — {session.signataire}</p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Réf : {session.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${scoreBg}`}>
              <span className={`text-lg font-bold font-tabular ${scoreColor}`}>{session.score}%</span>
              {session.nok > 0
                ? <span className="text-[10px] text-red-600 font-medium">{session.nok} NOK</span>
                : <span className="text-[10px] text-emerald-600 font-medium">✓ Conforme</span>
              }
            </div>
            <button
              onClick={() => printSession(session)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors"
            >
              <Printer size={13} /> Imprimer
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-500 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {!session.items ? (
            <div className="text-center py-10 text-zinc-400 text-sm">
              <AlertTriangle size={24} className="mx-auto mb-2 text-zinc-300" />
              Détail des items non disponible pour les sessions historiques.
            </div>
          ) : (
            Object.entries(groupedItems).map(([groupLabel, items]) => {
              const okCount = items.filter((i) => i.status === 'ok').length;
              const nokCount = items.filter((i) => i.status === 'nok').length;
              return (
                <div key={groupLabel} className="card-section overflow-hidden">
                  <div className="section-header bg-zinc-50 border-b border-zinc-100">
                    <h3 className="text-sm font-semibold text-zinc-700">{groupLabel}</h3>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-emerald-600 font-medium">{okCount} OK</span>
                      {nokCount > 0 && <span className="text-red-600 font-medium">{nokCount} NOK</span>}
                    </div>
                  </div>
                  <div className="divide-y divide-zinc-100">
                    {items.map((item) => (
                      <div key={item.id} className={`px-4 py-3 ${item.status === 'nok' ? 'bg-red-50/40' : ''}`}>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 shrink-0">
                            {item.status === 'ok'
                              ? <CheckCircle size={16} className="text-emerald-500" />
                              : item.status === 'nok'
                              ? <XCircle size={16} className="text-red-500" />
                              : <AlertTriangle size={16} className="text-zinc-300" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm font-medium ${item.status === 'nok' ? 'text-red-800' : 'text-zinc-800'}`}>{item.label}</p>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 font-semibold ${item.status === 'ok' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : item.status === 'nok' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-zinc-50 text-zinc-400 border-zinc-200'}`}>
                                {item.status === 'ok' ? 'OK' : item.status === 'nok' ? 'NOK' : '—'}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400 mt-0.5">{item.description}</p>
                            {item.status === 'nok' && item.actionCorrective && (
                              <div className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200">
                                <p className="text-xs text-red-700"><span className="font-semibold">Action corrective :</span> {item.actionCorrective}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Session Row ──────────────────────────────────────────────────────────────
function SessionRow({ session, isToday, index }: { session: HygieneSession; isToday: boolean; index?: number }) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <>
      <div className="px-4 py-3 hover:bg-zinc-50 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              {isToday && index !== undefined && (
                <span className="text-[10px] text-zinc-400 font-tabular">#{index}</span>
              )}
              <span className={`text-sm font-bold font-tabular ${session.score >= 90 ? 'text-emerald-600' : session.score >= 75 ? 'text-amber-600' : 'text-red-600'}`}>
                {session.score}%
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded border font-medium bg-emerald-50 text-emerald-600 border-emerald-200">
                Validée
              </span>
            </div>
            <p className="text-xs text-zinc-500">{session.signataire}</p>
            {session.nok > 0 && (
              <p className="text-[10px] text-red-500 font-medium">{session.nok} item(s) NOK</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className="text-right">
              <p className="text-xs font-tabular font-semibold text-teal-700">{session.heure}</p>
              <p className="text-[10px] text-zinc-400">{session.date}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowDetail(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-100 hover:bg-teal-50 hover:text-teal-700 text-zinc-500 text-[10px] font-semibold transition-colors"
                title="Consulter la check-list"
              >
                <Eye size={11} /> Voir
              </button>
              <button
                onClick={() => printSession(session)}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-100 hover:bg-teal-50 hover:text-teal-700 text-zinc-500 text-[10px] font-semibold transition-colors"
                title="Imprimer la check-list"
              >
                <Printer size={11} /> Imprimer
              </button>
            </div>
          </div>
        </div>
        <div className="mt-2 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${session.score >= 90 ? 'bg-emerald-400' : session.score >= 75 ? 'bg-amber-400' : 'bg-red-400'}`}
            style={{ width: `${session.score}%` }}
          />
        </div>
      </div>
      {showDetail && <SessionDetailModal session={session} onClose={() => setShowDetail(false)} />}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HygieneHistorique({ sessions, loading }: HygieneHistoriqueProps) {
  const today = (() => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  })();

  const todaySessions = sessions.filter((s) => s.date === today);
  const pastSessions = sessions.filter((s) => s.date !== today);

  const avgScore = sessions.length > 0
    ? Math.round(sessions.slice(0, 7).reduce((acc, s) => acc + s.score, 0) / Math.min(sessions.length, 7))
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="metric-card border-zinc-200 text-center">
          <p className="text-2xl font-bold font-tabular text-teal-700">{avgScore > 0 ? `${avgScore}%` : '—'}</p>
          <p className="text-xs text-zinc-500 mt-0.5">Score moyen 7j</p>
        </div>
        <div className="metric-card border-zinc-200 text-center">
          <p className="text-2xl font-bold font-tabular text-zinc-800">{todaySessions.length}</p>
          <p className="text-xs text-zinc-500 mt-0.5">Session{todaySessions.length !== 1 ? 's' : ''} aujourd&apos;hui</p>
        </div>
      </div>

      {/* Today's sessions */}
      {todaySessions.length > 0 && (
        <div className="card-section">
          <div className="section-header bg-teal-50 border-b border-teal-100">
            <h2 className="text-sm font-semibold text-teal-800">Sessions d&apos;aujourd&apos;hui</h2>
            <span className="text-xs font-medium text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full">{todaySessions.length}</span>
          </div>
          <div className="divide-y divide-zinc-100">
            {todaySessions.map((s, idx) => (
              <SessionRow key={s.id} session={s} isToday={true} index={todaySessions.length - idx} />
            ))}
          </div>
        </div>
      )}

      {/* Past sessions */}
      <div className="card-section">
        <div className="section-header">
          <h2 className="text-sm font-semibold text-zinc-800">Sessions précédentes</h2>
        </div>
        {pastSessions.length === 0 && sessions.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-zinc-400">Aucune session enregistrée</div>
        ) : pastSessions.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-zinc-400">Aucune session antérieure</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {pastSessions.slice(0, 8).map((s) => (
              <SessionRow key={s.id} session={s} isToday={false} />
            ))}
          </div>
        )}
      </div>

      {/* Fréquence */}
      <div className="card-section p-4">
        <h3 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide mb-3">Fréquences requises</h3>
        <div className="space-y-2">
          {[
            { label: 'Contrôle quotidien', freq: 'Chaque jour ouvré', statut: 'ok' },
            { label: 'Contrôle hebdomadaire', freq: 'Lundi matin', statut: 'ok' },
            { label: 'Audit mensuel', freq: '1er lundi du mois', statut: 'warn' },
          ].map((f) => (
            <div key={`freq-${f.label}`} className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-700">{f.label}</p>
                <p className="text-[10px] text-zinc-400">{f.freq}</p>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${f.statut === 'ok' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                {f.statut === 'ok' ? '✓ À jour' : '⚡ À planifier'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}