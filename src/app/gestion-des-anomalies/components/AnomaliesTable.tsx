'use client';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Search, Filter, Plus, Trash2, ChevronUp, ChevronDown, X, Loader2, AlertTriangle, Thermometer, Package, ClipboardX, Box,  } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import { useForm } from 'react-hook-form';
import { createClient } from '@/lib/supabase/client';

type Severite = 'critique' | 'majeur' | 'mineur';
type StatutAnomalie = 'ouvert' | 'en_cours' | 'resolu' | 'cloture';
type TypeAnomalie = 'temperature' | 'hygiene' | 'reception' | 'emballage' | 'production';

interface Anomalie {
  id: string;
  numero: string;
  type: TypeAnomalie;
  lot: string;
  zone: string;
  severite: Severite;
  responsable: string;
  statut: StatutAnomalie;
  dateOuverture: string;
  delaiHeures: number;
  description: string;
  source: 'auto' | 'manuel';
}

const typeIcons: Record<TypeAnomalie, React.ElementType> = {
  temperature: Thermometer,
  hygiene: ClipboardX,
  reception: Package,
  emballage: Box,
  production: AlertTriangle,
};

const typeLabels: Record<TypeAnomalie, string> = {
  temperature: 'Température',
  hygiene: 'Hygiène',
  reception: 'Réception',
  emballage: 'Emballage',
  production: 'Production',
};

type SortField = 'numero' | 'type' | 'severite' | 'statut' | 'dateOuverture' | 'delaiHeures';

type CreateAnomalieForm = {
  type: TypeAnomalie;
  lot: string;
  zone: string;
  severite: Severite;
  responsable: string;
  description: string;
};

const responsables = ['M. Leconte', 'T. Martin', 'S. Benali', 'L. Dupont', 'P. Rousseau'];

function calcDelaiHeures(dateOuverture: string): number {
  const now = new Date();
  const opened = new Date(dateOuverture);
  return Math.round(((now.getTime() - opened.getTime()) / (1000 * 60 * 60)) * 10) / 10;
}

function formatDateOuverture(isoDate: string): string {
  const d = new Date(isoDate);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} ${hh}:${min}`;
}

export default function AnomaliesTable() {
  const [anomalies, setAnomalies] = useState<Anomalie[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState<string>('tous');
  const [filterSeverite, setFilterSeverite] = useState<string>('tous');
  const [filterType, setFilterType] = useState<string>('tous');
  const [sortField, setSortField] = useState<SortField>('dateOuverture');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [modalCreate, setModalCreate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateAnomalieForm>();

  const supabase = createClient();

  const fetchAnomalies = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('anomalies')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setAnomalies(data.map((a: any) => ({
        id: a.id,
        numero: a.numero,
        type: a.type as TypeAnomalie,
        lot: a.lot,
        zone: a.zone,
        severite: a.severite as Severite,
        responsable: a.responsable || '',
        statut: a.statut as StatutAnomalie,
        dateOuverture: formatDateOuverture(a.date_ouverture || a.created_at),
        delaiHeures: calcDelaiHeures(a.date_ouverture || a.created_at),
        description: a.description,
        source: a.source as 'auto' | 'manuel',
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchAnomalies(); }, []);

  const filtered = anomalies.filter((a) => {
    const matchSearch = search === '' ||
      a.numero.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase()) ||
      a.lot.toLowerCase().includes(search.toLowerCase()) ||
      a.zone.toLowerCase().includes(search.toLowerCase());
    const matchStatut = filterStatut === 'tous' || a.statut === filterStatut;
    const matchSeverite = filterSeverite === 'tous' || a.severite === filterSeverite;
    const matchType = filterType === 'tous' || a.type === filterType;
    return matchSearch && matchStatut && matchSeverite && matchType;
  }).sort((a, b) => {
    let cmp = 0;
    if (sortField === 'delaiHeures') cmp = a.delaiHeures - b.delaiHeures;
    else cmp = String(a[sortField]).localeCompare(String(b[sortField]));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <span className="inline-flex flex-col ml-1 opacity-40">
      <ChevronUp size={9} className={sortField === field && sortDir === 'asc' ? 'opacity-100 text-teal-700' : ''} />
      <ChevronDown size={9} className={sortField === field && sortDir === 'desc' ? 'opacity-100 text-teal-700' : ''} />
    </span>
  );

  const changeStatut = async (id: string, newStatut: StatutAnomalie) => {
    const { error } = await supabase.from('anomalies').update({ statut: newStatut }).eq('id', id);
    if (!error) {
      setAnomalies((prev) => prev.map((a) => a.id === id ? { ...a, statut: newStatut } : a));
      toast.success(`Statut mis à jour : ${newStatut}`);
    } else {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const deleteAnomalie = async (id: string) => {
    const { error } = await supabase.from('anomalies').delete().eq('id', id);
    if (!error) {
      setAnomalies((prev) => prev.filter((a) => a.id !== id));
      toast.success('Anomalie supprimée');
    } else {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const handleBulkDelete = async () => {
    const { error } = await supabase.from('anomalies').delete().in('id', selectedRows);
    if (!error) {
      setAnomalies((prev) => prev.filter((a) => !selectedRows.includes(a.id)));
      toast.success(`${selectedRows.length} anomalie(s) supprimée(s)`);
      setSelectedRows([]);
    } else {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const onCreateSubmit = async (data: CreateAnomalieForm) => {
    setIsCreating(true);
    const numero = `ANO-${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}`;
    const { error } = await supabase.from('anomalies').insert([{
      numero,
      type: data.type,
      lot: data.lot || '—',
      zone: data.zone,
      severite: data.severite,
      responsable: data.responsable || '',
      statut: 'ouvert',
      description: data.description,
      source: 'manuel',
    }]);
    setIsCreating(false);
    if (error) {
      toast.error(`Erreur: ${error.message}`);
      return;
    }
    setModalCreate(false);
    reset();
    toast.success(`Anomalie ${numero} créée`);
    fetchAnomalies();
  };

  const allSelected = filtered.length > 0 && filtered.every((a) => selectedRows.includes(a.id));
  const toggleAll = () => {
    setSelectedRows(allSelected ? [] : filtered.map((a) => a.id));
  };

  return (
    <>
      <div className="card-section">
        {/* Toolbar */}
        <div className="section-header flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                className="form-input pl-8 py-1.5 text-xs"
                placeholder="Rechercher n° anomalie, lot, zone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Filter size={13} className="text-zinc-400" />
              <select className="form-select py-1.5 text-xs w-auto" value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}>
                <option value="tous">Tous statuts</option>
                <option value="ouvert">Ouverte</option>
                <option value="en_cours">En cours</option>
                <option value="resolu">Résolue</option>
                <option value="cloture">Clôturée</option>
              </select>
              <select className="form-select py-1.5 text-xs w-auto" value={filterSeverite} onChange={(e) => setFilterSeverite(e.target.value)}>
                <option value="tous">Toutes sévérités</option>
                <option value="critique">Critique</option>
                <option value="majeur">Majeur</option>
                <option value="mineur">Mineur</option>
              </select>
              <select className="form-select py-1.5 text-xs w-auto" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="tous">Tous types</option>
                <option value="temperature">Température</option>
                <option value="hygiene">Hygiène</option>
                <option value="reception">Réception</option>
                <option value="emballage">Emballage</option>
                <option value="production">Production</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">{filtered.length} résultat(s)</span>
            <button onClick={() => setModalCreate(true)} className="btn-primary text-xs py-1.5">
              <Plus size={14} /> Nouvelle anomalie
            </button>
          </div>
        </div>

        {/* Bulk action bar */}
        {selectedRows.length > 0 && (
          <div className="flex items-center gap-3 px-5 py-2.5 bg-teal-50 border-b border-teal-200 animate-slide-up">
            <span className="text-xs font-semibold text-teal-700">{selectedRows.length} sélectionné(s)</span>
            <button onClick={handleBulkDelete} className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1">
              <Trash2 size={12} /> Supprimer la sélection
            </button>
            <button onClick={() => setSelectedRows([])} className="text-xs text-zinc-500 hover:text-zinc-700 ml-auto">
              Annuler
            </button>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th w-10">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-3.5 h-3.5" aria-label="Sélectionner tout" />
                  </th>
                  <th className="table-th cursor-pointer select-none" onClick={() => toggleSort('numero')}>
                    N° Anomalie <SortIcon field="numero" />
                  </th>
                  <th className="table-th cursor-pointer select-none" onClick={() => toggleSort('type')}>
                    Type <SortIcon field="type" />
                  </th>
                  <th className="table-th">Lot / Zone</th>
                  <th className="table-th cursor-pointer select-none" onClick={() => toggleSort('severite')}>
                    Sévérité <SortIcon field="severite" />
                  </th>
                  <th className="table-th">Responsable</th>
                  <th className="table-th cursor-pointer select-none" onClick={() => toggleSort('statut')}>
                    Statut <SortIcon field="statut" />
                  </th>
                  <th className="table-th cursor-pointer select-none" onClick={() => toggleSort('dateOuverture')}>
                    Date ouverture <SortIcon field="dateOuverture" />
                  </th>
                  <th className="table-th cursor-pointer select-none" onClick={() => toggleSort('delaiHeures')}>
                    Délai <SortIcon field="delaiHeures" />
                  </th>
                  <th className="table-th">Source</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center">
                      <AlertTriangle size={32} className="text-zinc-300 mx-auto mb-2" />
                      <p className="text-sm font-medium text-zinc-500">Aucune anomalie trouvée</p>
                      <p className="text-xs text-zinc-400 mt-1">Modifiez vos filtres ou créez une nouvelle anomalie</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((ano) => {
                    const TypeIcon = typeIcons[ano.type];
                    const isSelected = selectedRows.includes(ano.id);
                    return (
                      <tr key={ano.id} className={`table-row ${isSelected ? 'bg-teal-50/50' : ''}`}>
                        <td className="table-td">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => setSelectedRows((prev) => isSelected ? prev.filter((id) => id !== ano.id) : [...prev, ano.id])}
                            className="w-3.5 h-3.5"
                            aria-label={`Sélectionner ${ano.numero}`}
                          />
                        </td>
                        <td className="table-td">
                          <span className="font-mono text-xs font-semibold text-teal-700">{ano.numero}</span>
                        </td>
                        <td className="table-td">
                          <span className="flex items-center gap-1.5">
                            <TypeIcon size={13} className="text-zinc-400 shrink-0" />
                            <span className="text-xs">{typeLabels[ano.type]}</span>
                          </span>
                        </td>
                        <td className="table-td">
                          <p className="text-xs font-medium text-zinc-800 truncate max-w-[140px]">{ano.zone}</p>
                          <p className="text-[10px] text-zinc-400 font-mono">{ano.lot}</p>
                        </td>
                        <td className="table-td">
                          <StatusBadge status={ano.severite} />
                        </td>
                        <td className="table-td">
                          {ano.responsable ? (
                            <span className="text-xs text-zinc-700">{ano.responsable}</span>
                          ) : (
                            <span className="text-xs text-red-500 font-medium">Non assigné ⚠</span>
                          )}
                        </td>
                        <td className="table-td">
                          <select
                            value={ano.statut}
                            onChange={(e) => changeStatut(ano.id, e.target.value as StatutAnomalie)}
                            className={`text-xs px-2 py-1 rounded-full border font-medium cursor-pointer focus:outline-none ${
                              ano.statut === 'ouvert' ? 'bg-red-100 text-red-700 border-red-200' :
                              ano.statut === 'en_cours' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                              ano.statut === 'resolu' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                            }`}
                            aria-label="Changer le statut"
                          >
                            <option value="ouvert">Ouverte</option>
                            <option value="en_cours">En cours</option>
                            <option value="resolu">Résolue</option>
                            <option value="cloture">Clôturée</option>
                          </select>
                        </td>
                        <td className="table-td text-xs text-zinc-500 font-tabular">{ano.dateOuverture}</td>
                        <td className="table-td">
                          <span className={`text-xs font-tabular font-semibold ${ano.delaiHeures > 12 ? 'text-red-600' : ano.delaiHeures > 4 ? 'text-amber-600' : 'text-zinc-600'}`}>
                            {ano.delaiHeures < 1 ? `${Math.round(ano.delaiHeures * 60)}min` : `${ano.delaiHeures}h`}
                          </span>
                        </td>
                        <td className="table-td">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${ano.source === 'auto' ? 'bg-teal-50 text-teal-600 border border-teal-200' : 'bg-zinc-100 text-zinc-500 border border-zinc-200'}`}>
                            {ano.source === 'auto' ? '⚡ Auto' : '✎ Manuel'}
                          </span>
                        </td>
                        <td className="table-td">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => deleteAnomalie(ano.id)}
                              className="p-1.5 rounded hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors"
                              title="Supprimer cette anomalie"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100">
          <span className="text-xs text-zinc-400">{filtered.length} anomalie(s) affichée(s) sur {anomalies.length} total</span>
        </div>
      </div>

      {/* Create Modal */}
      <Modal open={modalCreate} onClose={() => { setModalCreate(false); reset(); }} title="Créer une anomalie" size="lg">
        <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Type <span className="text-red-500">*</span></label>
              <select className="form-select" {...register('type', { required: 'Type obligatoire' })}>
                <option value="">Sélectionner</option>
                <option value="temperature">Température</option>
                <option value="hygiene">Hygiène</option>
                <option value="reception">Réception</option>
                <option value="emballage">Emballage</option>
                <option value="production">Production</option>
              </select>
              {errors.type && <p className="form-error">{errors.type.message}</p>}
            </div>
            <div>
              <label className="form-label">Sévérité <span className="text-red-500">*</span></label>
              <select className="form-select" {...register('severite', { required: 'Sévérité obligatoire' })}>
                <option value="">Sélectionner</option>
                <option value="critique">Critique</option>
                <option value="majeur">Majeur</option>
                <option value="mineur">Mineur</option>
              </select>
              {errors.severite && <p className="form-error">{errors.severite.message}</p>}
            </div>
            <div>
              <label className="form-label">Lot / Référence</label>
              <input className="form-input font-mono" placeholder="ex: L-2026-042" {...register('lot')} />
            </div>
            <div>
              <label className="form-label">Zone concernée <span className="text-red-500">*</span></label>
              <input className="form-input" placeholder="ex: Chambre froide 1" {...register('zone', { required: 'Zone obligatoire' })} />
              {errors.zone && <p className="form-error">{errors.zone.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="form-label">Responsable assigné</label>
              <select className="form-select" {...register('responsable')}>
                <option value="">Non assigné</option>
                {responsables.map((r) => <option key={`resp-${r}`} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="form-label">Description <span className="text-red-500">*</span></label>
              <textarea
                rows={4}
                className="form-input resize-none"
                placeholder="Description détaillée de l'anomalie..."
                {...register('description', { required: 'Description obligatoire' })}
              />
              {errors.description && <p className="form-error">{errors.description.message}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-zinc-100">
            <button type="button" onClick={() => { setModalCreate(false); reset(); }} className="btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={isCreating} className="btn-primary">
              {isCreating ? <><Loader2 size={14} className="animate-spin" /> Création...</> : <><Plus size={14} /> Créer l&apos;anomalie</>}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}