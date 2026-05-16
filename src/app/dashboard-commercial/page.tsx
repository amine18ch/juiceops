'use client';
import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import RoleGuard from '@/components/RoleGuard';
import { createClient } from '@/lib/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { FileText, ShoppingCart, Truck, Receipt, TrendingUp, AlertCircle, Clock, CheckCircle, ArrowRight, Users } from 'lucide-react';

const fmt = (n: number, d = 'TND') => `${Number(n).toFixed(3)} ${d}`;
const fmtK = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}K` : n.toFixed(0);

export default function DashboardCommercialPage() {
  return <AppLayout><RoleGuard permission="canAccessFacturation"><DashboardContent /></RoleGuard></AppLayout>;
}

function DashboardContent() {
  const supabase = useMemo(() => createClient(), []);
  const [devise, setDevise] = useState('TND');
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    devisCount: 0, devisMontant: 0,
    bcCount: 0, bcMontant: 0,
    blCount: 0, blMontant: 0,
    facCount: 0, facMontant: 0,
    caMois: 0, caAnnee: 0,
    impayes: 0, enRetard: 0,
    tauxConversion: 0,
  });
  const [topClients, setTopClients] = useState<any[]>([]);
  const [recentFac, setRecentFac]   = useState<any[]>([]);
  const [pipeline, setPipeline]     = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const now   = new Date();
      const mois  = now.toISOString().slice(0,7); // YYYY-MM
      const annee = now.getFullYear().toString();

      const [devRes, bcRes, blRes, facRes, paramRes] = await Promise.all([
        supabase.from('devis').select('montant_ttc,statut,created_at'),
        supabase.from('bons_commande').select('montant_ttc,statut,created_at'),
        supabase.from('bons_livraison').select('montant_ttc,statut,created_at'),
        supabase.from('factures').select('montant_ttc,statut_paiement,client_nom,numero_facture,date_facture,created_at'),
        supabase.from('parametres').select('cle,valeur'),
      ]);

      if (paramRes.data) {
        const m: any = {};
        (paramRes.data as any[]).forEach((p: any) => { m[p.cle] = p.valeur; });
        setDevise(m.devise || 'TND');
      }

      const devs = (devRes.data || []) as any[];
      const bcs  = (bcRes.data  || []) as any[];
      const bls  = (blRes.data  || []) as any[];
      const facs = (facRes.data || []) as any[];

      const sum = (arr: any[], k='montant_ttc') => arr.reduce((s,x)=>s+(parseFloat(x[k])||0),0);

      const facsPaids = facs.filter(f=>f.statut_paiement==='paye');
      const caMois = sum(facsPaids.filter(f=>f.date_facture?.startsWith(mois)));
      const caAnnee = sum(facsPaids.filter(f=>f.date_facture?.startsWith(annee)));
      const impayes = sum(facs.filter(f=>['en_attente'].includes(f.statut_paiement)));
      const enRetard = sum(facs.filter(f=>f.statut_paiement==='retard'));
      const tauxConversion = devs.length > 0 ? Math.round((facs.length / devs.length) * 100) : 0;

      setKpis({
        devisCount: devs.length, devisMontant: sum(devs),
        bcCount: bcs.length, bcMontant: sum(bcs),
        blCount: bls.length, blMontant: sum(bls),
        facCount: facs.length, facMontant: sum(facs),
        caMois, caAnnee, impayes, enRetard, tauxConversion,
      });

      // Pipeline
      setPipeline([
        { label:'Devis', count:devs.length, montant:sum(devs), icon:'📋', color:'bg-zinc-100 text-zinc-700' },
        { label:'BC',    count:bcs.length,  montant:sum(bcs),  icon:'🛒', color:'bg-blue-100 text-blue-700' },
        { label:'BL',    count:bls.length,  montant:sum(bls),  icon:'🚚', color:'bg-purple-100 text-purple-700' },
        { label:'Factures', count:facs.length, montant:sum(facs), icon:'🧾', color:'bg-teal-100 text-teal-700' },
      ]);

      // Top clients by CA
      const clientCA: Record<string,number> = {};
      facs.forEach(f => {
        if (f.client_nom) clientCA[f.client_nom] = (clientCA[f.client_nom]||0) + (parseFloat(f.montant_ttc)||0);
      });
      setTopClients(Object.entries(clientCA).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([nom,ca])=>({nom,ca})));

      // Recent factures
      setRecentFac([...facs].sort((a,b)=>b.created_at?.localeCompare(a.created_at||'')).slice(0,5));

      // Monthly CA (last 6 months)
      const months: any[] = [];
      for (let i=5; i>=0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
        const key = d.toISOString().slice(0,7);
        const label = d.toLocaleDateString('fr-FR',{month:'short',year:'2-digit'});
        const ca = sum(facs.filter(f=>f.date_facture?.startsWith(key)));
        months.push({ label, ca });
      }
      setMonthlyData(months);

      setLoading(false);
    };
    fetchAll();
  }, [supabase]);

  const statutColor: Record<string,string> = {
    en_attente: 'bg-yellow-100 text-yellow-700',
    paye:       'bg-green-100 text-green-700',
    retard:     'bg-red-100 text-red-700',
    annule:     'bg-zinc-100 text-zinc-500',
  };
  const statutLabel: Record<string,string> = {
    en_attente:'En attente', paye:'Payé', retard:'En retard', annule:'Annulé',
  };

  if (loading) return <div className="flex items-center justify-center h-64 gap-2 text-zinc-400"><div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"/></div>;

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2"><TrendingUp size={20} className="text-teal-600"/> Dashboard Commercial</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Vue d'ensemble de l'activité commerciale — Devis · BC · BL · Factures</p>
      </div>

      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon="💰" label="CA ce mois" value={fmt(kpis.caMois, devise)} sub="Factures payées" color="teal"/>
        <KpiCard icon="📈" label="CA cette année" value={fmt(kpis.caAnnee, devise)} sub="Factures payées" color="blue"/>
        <KpiCard icon="⏳" label="À encaisser" value={fmt(kpis.impayes, devise)} sub="En attente" color="amber"/>
        <KpiCard icon="🔴" label="En retard" value={fmt(kpis.enRetard, devise)} sub="Relance requise" color="red"/>
      </div>

      {/* Pipeline Funnel */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6">
        <h2 className="text-sm font-bold text-zinc-800 mb-4">Pipeline commercial</h2>
        <div className="flex items-stretch gap-2">
          {pipeline.map((p, i) => (
            <React.Fragment key={p.label}>
              <div className="flex-1 rounded-xl border border-zinc-200 p-4 text-center hover:border-teal-300 transition-colors">
                <div className="text-2xl mb-1">{p.icon}</div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{p.label}</p>
                <p className="text-3xl font-bold text-zinc-900 mt-1">{p.count}</p>
                <p className="text-xs font-tabular text-zinc-500 mt-0.5">{fmt(p.montant, devise)}</p>
              </div>
              {i < pipeline.length-1 && (
                <div className="flex items-center text-zinc-300"><ArrowRight size={18}/></div>
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
          <TrendingUp size={13} className="text-teal-500"/>
          Taux de conversion Devis → Facture : <span className="font-bold text-teal-600">{kpis.tauxConversion}%</span>
        </div>
      </div>

      {/* Charts + Top clients */}
      <div className="grid grid-cols-3 gap-4">
        {/* Monthly CA Chart */}
        <div className="col-span-2 bg-white rounded-2xl border border-zinc-200 p-6">
          <h2 className="text-sm font-bold text-zinc-800 mb-4">CA mensuel (6 derniers mois)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5"/>
              <XAxis dataKey="label" tick={{fontSize:11, fill:'#71717a'}}/>
              <YAxis tick={{fontSize:11, fill:'#71717a'}} tickFormatter={fmtK}/>
              <Tooltip formatter={(v:any)=>[fmt(v,devise),'CA']} labelStyle={{fontSize:12}}/>
              <Bar dataKey="ca" fill="#0d9488" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Clients */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6">
          <h2 className="text-sm font-bold text-zinc-800 mb-4 flex items-center gap-2"><Users size={14} className="text-teal-600"/> Top clients</h2>
          {topClients.length === 0
            ? <p className="text-sm text-zinc-400 text-center py-6">Aucune donnée</p>
            : <div className="space-y-3">
                {topClients.map((c,i)=>(
                  <div key={c.nom} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${i===0?'bg-amber-100 text-amber-700':i===1?'bg-zinc-100 text-zinc-600':'bg-zinc-50 text-zinc-500'}`}>{i+1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-800 truncate">{c.nom}</p>
                      <div className="w-full bg-zinc-100 rounded-full h-1.5 mt-1">
                        <div className="bg-teal-500 h-1.5 rounded-full" style={{width:`${Math.min((c.ca/(topClients[0]?.ca||1))*100,100)}%`}}/>
                      </div>
                    </div>
                    <span className="text-xs font-tabular font-semibold text-zinc-700 shrink-0">{fmtK(c.ca)}</span>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* Doc type KPIs + Recent factures */}
      <div className="grid grid-cols-2 gap-4">
        {/* Document stats */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6">
          <h2 className="text-sm font-bold text-zinc-800 mb-4">Volumes par document</h2>
          <div className="space-y-3">
            {[
              { label:'Devis', count:kpis.devisCount, montant:kpis.devisMontant, icon:<FileText size={16} className="text-zinc-500"/>, href:'/devis' },
              { label:'Bons de commande', count:kpis.bcCount, montant:kpis.bcMontant, icon:<ShoppingCart size={16} className="text-blue-500"/>, href:'/bons-commande' },
              { label:'Bons de livraison', count:kpis.blCount, montant:kpis.blMontant, icon:<Truck size={16} className="text-purple-500"/>, href:'/bons-livraison' },
              { label:'Factures', count:kpis.facCount, montant:kpis.facMontant, icon:<Receipt size={16} className="text-teal-500"/>, href:'/facturation-ventes' },
            ].map(d=>(
              <a key={d.label} href={d.href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center group-hover:bg-zinc-200 transition-colors">{d.icon}</div>
                <div className="flex-1"><p className="text-sm font-medium text-zinc-700">{d.label}</p><p className="text-xs font-tabular text-zinc-400">{fmt(d.montant, devise)}</p></div>
                <span className="text-xl font-bold text-zinc-800">{d.count}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Recent factures */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6">
          <h2 className="text-sm font-bold text-zinc-800 mb-4">Dernières factures</h2>
          {recentFac.length===0
            ? <p className="text-sm text-zinc-400 text-center py-6">Aucune facture</p>
            : <div className="space-y-2">
                {recentFac.map(f=>(
                  <div key={f.numero_facture} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-zinc-600">{f.numero_facture}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${statutColor[f.statut_paiement]||'bg-zinc-100 text-zinc-500'}`}>
                          {statutLabel[f.statut_paiement]||f.statut_paiement}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 truncate mt-0.5">{f.client_nom}</p>
                    </div>
                    <span className="text-sm font-bold font-tabular text-zinc-800 shrink-0">{fmt(f.montant_ttc, devise)}</span>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, color }: { icon:string; label:string; value:string; sub:string; color:string }) {
  const colors: Record<string,string> = {
    teal:'bg-teal-50 border-teal-200', blue:'bg-blue-50 border-blue-200',
    amber:'bg-amber-50 border-amber-200', red:'bg-red-50 border-red-200',
  };
  const textColors: Record<string,string> = {
    teal:'text-teal-700', blue:'text-blue-700', amber:'text-amber-700', red:'text-red-700',
  };
  return (
    <div className={`rounded-2xl border p-5 ${colors[color]}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <p className={`text-xl font-bold font-tabular ${textColors[color]}`}>{value}</p>
      <p className="text-xs font-semibold text-zinc-700 mt-1">{label}</p>
      <p className="text-[11px] text-zinc-500 mt-0.5">{sub}</p>
    </div>
  );
}
