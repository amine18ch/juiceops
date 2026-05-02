import React from 'react';

type StatusType =
  | 'accepte' | 'refuse' | 'en_attente' | 'en_cours' |'ouvert'| 'resolu' | 'cloture' |'ok'| 'alerte' | 'danger' | 'critique' | 'majeur' | 'mineur' |'paye' | 'en_retard' | 'brouillon' | 'emis';

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  accepte:    { label: 'Accepté',     className: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  refuse:     { label: 'Refusé',      className: 'bg-red-100 text-red-700 border border-red-200' },
  en_attente: { label: 'En attente',  className: 'bg-amber-100 text-amber-700 border border-amber-200' },
  en_cours:   { label: 'En cours',    className: 'bg-blue-100 text-blue-700 border border-blue-200' },
  ouvert:     { label: 'Ouverte',     className: 'bg-red-100 text-red-700 border border-red-200' },
  resolu:     { label: 'Résolue',     className: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  cloture:    { label: 'Clôturée',    className: 'bg-zinc-100 text-zinc-500 border border-zinc-200' },
  ok:         { label: 'OK',          className: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  alerte:     { label: 'Alerte',      className: 'bg-amber-100 text-amber-700 border border-amber-200' },
  danger:     { label: 'DANGER',      className: 'bg-red-100 text-red-700 border border-red-300 font-bold' },
  critique:   { label: 'Critique',    className: 'bg-red-100 text-red-700 border border-red-200' },
  majeur:     { label: 'Majeur',      className: 'bg-orange-100 text-orange-700 border border-orange-200' },
  mineur:     { label: 'Mineur',      className: 'bg-yellow-100 text-yellow-700 border border-yellow-200' },
  paye:       { label: 'Payée',       className: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  en_retard:  { label: 'En retard',   className: 'bg-red-100 text-red-700 border border-red-200' },
  brouillon:  { label: 'Brouillon',   className: 'bg-zinc-100 text-zinc-500 border border-zinc-200' },
  emis:       { label: 'Émise',       className: 'bg-blue-100 text-blue-700 border border-blue-200' },
};

export default function StatusBadge({ status }: { status: StatusType }) {
  const config = statusConfig[status] ?? { label: status, className: 'bg-zinc-100 text-zinc-500' };
  return (
    <span className={`status-badge ${config.className}`}>
      {config.label}
    </span>
  );
}