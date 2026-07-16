/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Trash2, 
  Edit, 
  ArrowUpDown, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  FileSpreadsheet, 
  Eye, 
  Plus,
  RefreshCw
} from 'lucide-react';
import { Actividad, Disciplina, Etapa, Responsable, Prioridad, EstadoActividad } from '../types';
import { DISCIPLINAS, ETAPAS, RESPONSABLES, ESTADOS, PRIORIDADES } from '../data';

interface TableViewProps {
  actividades: Actividad[];
  referenceDate: string;
  onEditActivity: (id: number) => void;
  onDeleteActivity: (id: number) => void;
  onNavigate: (section: 'dashboard' | 'tabla' | 'formulario' | 'cronograma' | 'configuracion') => void;
}

type SortField = 'id' | 'wbs' | 'tarea' | 'responsable' | 'estado' | 'inicio_planificado' | 'fin_planificado' | 'atraso_dias';
type SortOrder = 'asc' | 'desc';

export default function TableView({ 
  actividades, 
  referenceDate, 
  onEditActivity, 
  onDeleteActivity, 
  onNavigate 
}: TableViewProps) {
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('TODOS');
  const [filterResponsable, setFilterResponsable] = useState<string>('TODOS');
  const [filterDisciplina, setFilterDisciplina] = useState<string>('TODOS');
  const [filterEtapa, setFilterEtapa] = useState<string>('TODOS');
  const [filterPrioridad, setFilterPrioridad] = useState<string>('TODOS');
  const [filterCritica, setFilterCritica] = useState<string>('TODOS');

  // Ordenamiento
  const [sortField, setSortField] = useState<SortField>('wbs');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Resetear filtros
  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterEstado('TODOS');
    setFilterResponsable('TODOS');
    setFilterDisciplina('TODOS');
    setFilterEtapa('TODOS');
    setFilterPrioridad('TODOS');
    setFilterCritica('TODOS');
  };

  // Cambiar orden
  const requestSort = (field: SortField) => {
    let order: SortOrder = 'asc';
    if (sortField === field && sortOrder === 'asc') {
      order = 'desc';
    }
    setSortField(field);
    setSortOrder(order);
  };

  // Función para parsear WBS a array numérico para ordenamiento jerárquico real de WBS
  // Ejemplo: "2.3.1" -> [2, 3, 1]
  const parseWBSForSorting = (wbsStr: string): number[] => {
    if (!wbsStr) return [999];
    return wbsStr.split('.').map(part => {
      const parsed = parseInt(part, 10);
      return isNaN(parsed) ? 0 : parsed;
    });
  };

  // Filtrado y ordenamiento de actividades
  const filteredAndSortedActivities = useMemo(() => {
    // 1. Filtrar
    let result = actividades.filter(act => {
      // Búsqueda por texto (ID, WBS, Tarea, Observaciones)
      const matchesSearch = 
        act.id.toString().includes(searchTerm) ||
        act.wbs.toLowerCase().includes(searchTerm.toLowerCase()) ||
        act.tarea.toLowerCase().includes(searchTerm.toLowerCase()) ||
        act.observaciones.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesEstado = filterEstado === 'TODOS' || act.estado === filterEstado;
      const matchesResponsable = filterResponsable === 'TODOS' || act.responsable === filterResponsable;
      const matchesDisciplina = filterDisciplina === 'TODOS' || act.disciplina === filterDisciplina;
      const matchesEtapa = filterEtapa === 'TODOS' || act.etapa === filterEtapa;
      const matchesPrioridad = filterPrioridad === 'TODOS' || act.prioridad === filterPrioridad;
      const matchesCritica = filterCritica === 'TODOS' || act.critica === filterCritica;

      return (
        matchesSearch && 
        matchesEstado && 
        matchesResponsable && 
        matchesDisciplina && 
        matchesEtapa && 
        matchesPrioridad &&
        matchesCritica
      );
    });

    // 2. Ordenar
    result.sort((a, b) => {
      let comparison = 0;

      if (sortField === 'wbs') {
        // Ordenamiento jerárquico de WBS (por niveles, ej 1.10 viene después de 1.2)
        const aWbs = parseWBSForSorting(a.wbs);
        const bWbs = parseWBSForSorting(b.wbs);
        
        const maxLen = Math.max(aWbs.length, bWbs.length);
        for (let i = 0; i < maxLen; i++) {
          const aVal = aWbs[i] !== undefined ? aWbs[i] : -1;
          const bVal = bWbs[i] !== undefined ? bWbs[i] : -1;
          if (aVal !== bVal) {
            comparison = aVal - bVal;
            break;
          }
        }
      } else if (sortField === 'id' || sortField === 'atraso_dias') {
        comparison = (a[sortField] || 0) - (b[sortField] || 0);
      } else if (sortField === 'inicio_planificado' || sortField === 'fin_planificado') {
        const dateA = new Date(a[sortField] || '').getTime();
        const dateB = new Date(b[sortField] || '').getTime();
        comparison = dateA - dateB;
      } else {
        // Campos string generales (tarea, responsable, estado)
        const valA = String(a[sortField] || '').toLowerCase();
        const valB = String(b[sortField] || '').toLowerCase();
        comparison = valA.localeCompare(valB, 'es-ES');
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [actividades, searchTerm, filterEstado, filterResponsable, filterDisciplina, filterEtapa, filterPrioridad, filterCritica, sortField, sortOrder]);

  // Exportar a CSV (Planilla Excel compatible)
  const exportToCSV = () => {
    if (actividades.length === 0) return;

    // Encabezados
    const headers = [
      'ID', 'WBS', 'Tipo Registro', 'Tarea', 'Disciplina', 'Etapa', 'Responsable', 
      'Critica', 'Prioridad', 'Estado', 'Inicio Planificado', 'Fin Planificado', 
      'Duracion Planificada', 'Inicio Real', 'Fin Real', 'Duracion Real', 
      'Atraso en dias', 'Valor de Tarea', 'Avance Porcentaje Valor', 
      'Entregables', 'Observaciones', 'Avance Planificado', 'Avance Real'
    ];

    // Filas
    const rows = filteredAndSortedActivities.map(act => [
      act.id,
      `"${act.wbs}"`,
      `"${act.tipo_registro}"`,
      `"${act.tarea.replace(/"/g, '""')}"`,
      `"${act.disciplina}"`,
      `"${act.etapa}"`,
      `"${act.responsable}"`,
      `"${act.critica}"`,
      `"${act.prioridad}"`,
      `"${act.estado}"`,
      act.inicio_planificado,
      act.fin_planificado,
      act.duracion_planificada,
      act.inicio_real || '',
      act.fin_real || '',
      act.duracion_real || '',
      act.atraso_dias,
      act.valor_tarea,
      act.avance_porcentaje_valor,
      `"${act.entregables}"`,
      `"${act.observaciones.replace(/"/g, '""')}"`,
      `${act.avance_planificado}%`,
      `${act.avance_real}%`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" // UTF-8 BOM para soporte de acentos en Excel
      + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Planilla_Actividades_${referenceDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Colores por Estado (Adaptados al Tema Elegant Dark)
  const getBadgeClassEstado = (estado: EstadoActividad) => {
    switch (estado) {
      case 'Completada':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'En Curso':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'No Iniciada':
        return 'bg-[#0A0C10] text-[#94A3B8] border-[#1E293B]';
      case 'Pausada':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Cancelada':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-[#0A0C10] text-[#94A3B8] border-[#1E293B]';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="table-view-container">
      {/* Encabezado y Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-[#11141B] p-6 rounded-2xl border border-[#1E293B] shadow-sm gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#E2E8F0] tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="text-blue-500 h-5 w-5" />
            Lista de Actividades (Planilla de Control)
          </h2>
          <p className="text-[#94A3B8] text-xs mt-1">
            Visualiza y edita todas las tareas del proyecto con formato similar a una planilla Excel.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold transition-all cursor-pointer"
            title="Descargar planilla compatible con Microsoft Excel"
          >
            <Download className="h-4 w-4" />
            Exportar CSV Excel
          </button>
          
          <button
            onClick={() => onNavigate('formulario')}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-[#E2E8F0] rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Nueva Actividad
          </button>
        </div>
      </div>

      {/* PANEL DE BÚSQUEDA Y FILTROS */}
      <div className="bg-[#11141B] p-5 rounded-xl border border-[#1E293B] shadow-sm space-y-4" id="filters-panel">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Campo de búsqueda */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por Tarea, WBS, Observaciones o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#0A0C10] border border-[#1E293B] rounded-xl text-xs focus:bg-[#0A0C10] focus:outline-hidden focus:ring-1 focus:ring-blue-500 transition-all font-medium text-[#E2E8F0] placeholder-slate-500"
            />
          </div>

          <button
            onClick={handleResetFilters}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-[#1E293B] text-[#E2E8F0] hover:bg-[#1E293B] bg-[#0A0C10] rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Limpiar Filtros
          </button>
        </div>

        {/* selectores de filtros */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3" id="filters-grid">
          {/* Filtro Estado */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#94A3B8] uppercase">Estado</label>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="w-full p-2 bg-[#0A0C10] border border-[#1E293B] rounded-lg text-xs font-medium text-[#E2E8F0] focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="TODOS">🔍 Todos</option>
              {ESTADOS.map(est => (
                <option key={est} value={est}>{est}</option>
              ))}
            </select>
          </div>

          {/* Filtro Responsable */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#94A3B8] uppercase">Responsable</label>
            <select
              value={filterResponsable}
              onChange={(e) => setFilterResponsable(e.target.value)}
              className="w-full p-2 bg-[#0A0C10] border border-[#1E293B] rounded-lg text-xs font-medium text-[#E2E8F0] focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="TODOS">👤 Todos</option>
              {RESPONSABLES.map(resp => (
                <option key={resp} value={resp}>{resp}</option>
              ))}
            </select>
          </div>

          {/* Filtro Disciplina */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#94A3B8] uppercase">Disciplina</label>
            <select
              value={filterDisciplina}
              onChange={(e) => setFilterDisciplina(e.target.value)}
              className="w-full p-2 bg-[#0A0C10] border border-[#1E293B] rounded-lg text-xs font-medium text-[#E2E8F0] focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="TODOS">⚙️ Todas</option>
              {DISCIPLINAS.map(disc => (
                <option key={disc} value={disc}>{disc}</option>
              ))}
            </select>
          </div>

          {/* Filtro Etapa */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#94A3B8] uppercase">Etapa</label>
            <select
              value={filterEtapa}
              onChange={(e) => setFilterEtapa(e.target.value)}
              className="w-full p-2 bg-[#0A0C10] border border-[#1E293B] rounded-lg text-xs font-medium text-[#E2E8F0] focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="TODOS">📊 Todas</option>
              {ETAPAS.map(et => (
                <option key={et} value={et}>{et}</option>
              ))}
            </select>
          </div>

          {/* Filtro Prioridad */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#94A3B8] uppercase">Prioridad</label>
            <select
              value={filterPrioridad}
              onChange={(e) => setFilterPrioridad(e.target.value)}
              className="w-full p-2 bg-[#0A0C10] border border-[#1E293B] rounded-lg text-xs font-medium text-[#E2E8F0] focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="TODOS">⚡ Todas</option>
              {PRIORIDADES.map(prio => (
                <option key={prio} value={prio}>{prio}</option>
              ))}
            </select>
          </div>

          {/* Filtro Crítica */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#94A3B8] uppercase">Crítica</label>
            <select
              value={filterCritica}
              onChange={(e) => setFilterCritica(e.target.value)}
              className="w-full p-2 bg-[#0A0C10] border border-[#1E293B] rounded-lg text-xs font-medium text-[#E2E8F0] focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="TODOS">⚠️ Ambos</option>
              <option value="Sí">Ruta Crítica (Sí)</option>
              <option value="No">No Crítica (No)</option>
            </select>
          </div>
        </div>
      </div>

      {/* METRICAS DE FILTRADO EN TIEMPO REAL */}
      <div className="flex items-center justify-between text-xs text-[#94A3B8] font-medium px-2">
        <span>Mostrando <strong className="text-[#E2E8F0] font-bold">{filteredAndSortedActivities.length}</strong> de <strong className="text-[#E2E8F0] font-bold">{actividades.length}</strong> actividades totales</span>
        <span className="hidden sm:inline">Haz clic en los encabezados para ordenar</span>
      </div>

      {/* TABLA PRINCIPAL DE EXCEL */}
      <div className="bg-[#11141B] rounded-2xl border border-[#1E293B] shadow-sm overflow-hidden" id="excel-grid-wrapper">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-auto whitespace-nowrap">
            <thead>
              <tr className="bg-[#0A0C10] border-b border-[#1E293B] text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider select-none">
                <th className="py-3 px-4 font-semibold text-center border-r border-[#1E293B] w-12 cursor-pointer hover:bg-[#1E293B]" onClick={() => requestSort('id')}>
                  <div className="flex items-center justify-center gap-1">
                    ID {sortField === 'id' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold border-r border-[#1E293B] w-16 cursor-pointer hover:bg-[#1E293B]" onClick={() => requestSort('wbs')}>
                  <div className="flex items-center gap-1">
                    WBS {sortField === 'wbs' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold border-r border-[#1E293B] w-24">Registro</th>
                <th className="py-3 px-4 font-semibold border-r border-[#1E293B] min-w-[200px] cursor-pointer hover:bg-[#1E293B]" onClick={() => requestSort('tarea')}>
                  <div className="flex items-center gap-1">
                    Tarea / Descripción {sortField === 'tarea' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold border-r border-[#1E293B]">Disciplina</th>
                <th className="py-3 px-4 font-semibold border-r border-[#1E293B]">Etapa</th>
                <th className="py-3 px-4 font-semibold border-r border-[#1E293B] cursor-pointer hover:bg-[#1E293B]" onClick={() => requestSort('responsable')}>
                  <div className="flex items-center gap-1">
                    Responsable {sortField === 'responsable' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold text-center border-r border-[#1E293B]">Prioridad</th>
                <th className="py-3 px-4 font-semibold text-center border-r border-[#1E293B] cursor-pointer hover:bg-[#1E293B]" onClick={() => requestSort('estado')}>
                  <div className="flex items-center justify-center gap-1">
                    Estado {sortField === 'estado' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold text-center border-r border-[#1E293B] cursor-pointer hover:bg-[#1E293B]" onClick={() => requestSort('inicio_planificado')}>
                  <div className="flex items-center justify-center gap-1">
                    Inicio Plan. {sortField === 'inicio_planificado' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold text-center border-r border-[#1E293B] cursor-pointer hover:bg-[#1E293B]" onClick={() => requestSort('fin_planificado')}>
                  <div className="flex items-center justify-center gap-1">
                    Fin Plan. {sortField === 'fin_planificado' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold text-center border-r border-[#1E293B]">Dur. Plan.</th>
                <th className="py-3 px-4 font-semibold text-center border-r border-[#1E293B]">Inicio Real</th>
                <th className="py-3 px-4 font-semibold text-center border-r border-[#1E293B]">Fin Real</th>
                <th className="py-3 px-4 font-semibold text-center border-r border-[#1E293B]">Dur. Real</th>
                <th className="py-3 px-4 font-semibold text-center border-r border-[#1E293B] cursor-pointer hover:bg-[#1E293B]" onClick={() => requestSort('atraso_dias')}>
                  <div className="flex items-center justify-center gap-1">
                    Atraso {sortField === 'atraso_dias' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold text-right border-r border-[#1E293B]">Valor ($)</th>
                <th className="py-3 px-4 font-semibold text-right border-r border-[#1E293B]">Avance % Plan</th>
                <th className="py-3 px-4 font-semibold text-right border-r border-[#1E293B]">Avance % Real</th>
                <th className="py-3 px-4 font-semibold text-center border-r border-[#1E293B]">Entregable</th>
                <th className="py-3 px-4 font-semibold border-r border-[#1E293B]">Observaciones</th>
                <th className="py-3 px-4 font-semibold text-center sticky right-0 bg-[#0A0C10] z-10 border-l border-[#1E293B]">Acciones</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-[#1E293B] text-xs">
              {filteredAndSortedActivities.length > 0 ? (
                filteredAndSortedActivities.map((act) => {
                  const isCompleted = act.estado === 'Completada';
                  const isDelayed = act.atraso_dias > 0;
                  const isCritical = act.critica === 'Sí';
                  
                  // Fórmulas de resaltado Elegant Dark:
                  let rowBackground = 'hover:bg-[#1E293B]/30';
                  let statusBorderClass = '';

                  if (isCompleted) {
                    rowBackground = 'bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-200';
                  } else if (isDelayed) {
                    rowBackground = 'bg-rose-500/5 hover:bg-rose-500/10 text-rose-200';
                  }

                  if (isCritical) {
                    statusBorderClass = 'border-l-4 border-l-rose-500';
                  }

                  return (
                    <tr key={act.id} className={`${rowBackground} transition-colors`}>
                      {/* ID */}
                      <td className={`py-2.5 px-3 text-center border-r border-[#1E293B]/40 font-mono font-semibold text-[#94A3B8] ${statusBorderClass}`}>
                        {act.id}
                      </td>
                      
                      {/* WBS */}
                      <td className="py-2.5 px-3 border-r border-[#1E293B]/40 font-mono font-bold text-[#E2E8F0]">
                        {act.wbs}
                      </td>

                      {/* Tipo Registro */}
                      <td className="py-2.5 px-3 border-r border-[#1E293B]/40 font-medium">
                        <span className={`inline-block px-2 py-0.5 text-[9px] font-extrabold rounded-md ${
                          act.tipo_registro === 'Título' ? 'bg-purple-500/15 text-purple-300' :
                          act.tipo_registro === 'Tarea' ? 'bg-slate-500/15 text-slate-300' :
                          act.tipo_registro === 'Subtarea' ? 'bg-indigo-500/15 text-indigo-300' :
                          'bg-amber-500/15 text-amber-300' // Hito
                        }`}>
                          {act.tipo_registro}
                        </span>
                      </td>

                      {/* Tarea / Descripción */}
                      <td className="py-2.5 px-4 border-r border-[#1E293B]/40 font-medium max-w-[280px] truncate" title={act.tarea}>
                        <div className="flex items-center gap-1.5">
                           {isCritical && <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" title="Ruta Crítica" />}
                          <span className={act.tipo_registro === 'Título' ? 'font-bold uppercase text-[#E2E8F0]' : 'text-[#E2E8F0]'}>
                            {act.tarea}
                          </span>
                        </div>
                      </td>

                      {/* Disciplina */}
                      <td className="py-2.5 px-3 border-r border-[#1E293B]/40 text-[#94A3B8]">
                        {act.disciplina}
                      </td>

                      {/* Etapa */}
                      <td className="py-2.5 px-3 border-r border-[#1E293B]/40 text-[#94A3B8]">
                        {act.etapa}
                      </td>

                      {/* Responsable */}
                      <td className="py-2.5 px-3 border-r border-[#1E293B]/40 font-medium text-[#E2E8F0]">
                        {act.responsable || 'Sin Asignar'}
                      </td>

                      {/* Prioridad */}
                      <td className="py-2.5 px-3 text-center border-r border-[#1E293B]/40">
                        <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded-md ${
                          act.prioridad === 'Alta' ? 'bg-rose-500/15 text-rose-400' :
                          act.prioridad === 'Media' ? 'bg-amber-500/15 text-amber-400' :
                          'bg-sky-500/15 text-sky-400'
                        }`}>
                          {act.prioridad}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="py-2.5 px-3 text-center border-r border-[#1E293B]/40">
                        <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${getBadgeClassEstado(act.estado)}`}>
                          {act.estado}
                        </span>
                      </td>

                      {/* Inicio Planificado */}
                      <td className="py-2.5 px-3 text-center border-r border-[#1E293B]/40 text-[#94A3B8] font-mono">
                        {act.inicio_planificado}
                      </td>

                      {/* Fin Planificado */}
                      <td className="py-2.5 px-3 text-center border-r border-[#1E293B]/40 text-[#94A3B8] font-mono">
                        {act.fin_planificado}
                      </td>

                      {/* Duración Planificada */}
                      <td className="py-2.5 px-3 text-center border-r border-[#1E293B]/40 text-[#94A3B8] font-mono">
                        {act.duracion_planificada}d
                      </td>

                      {/* Inicio Real */}
                      <td className="py-2.5 px-3 text-center border-r border-[#1E293B]/40 text-[#94A3B8] font-mono">
                        {act.inicio_real || '-'}
                      </td>

                      {/* Fin Real */}
                      <td className="py-2.5 px-3 text-center border-r border-[#1E293B]/40 text-[#94A3B8] font-mono">
                        {act.fin_real || '-'}
                      </td>

                      {/* Duración Real */}
                      <td className="py-2.5 px-3 text-center border-r border-[#1E293B]/40 text-[#94A3B8] font-mono">
                        {act.duracion_real ? `${act.duracion_real}d` : '-'}
                      </td>

                      {/* Atraso */}
                      <td className="py-2.5 px-3 text-center border-r border-[#1E293B]/40 font-mono">
                        {act.atraso_dias > 0 ? (
                          <span className="text-rose-400 font-black bg-rose-500/15 border border-rose-500/35 px-1.5 py-0.5 rounded-sm">
                            +{act.atraso_dias}d
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium">0d</span>
                        )}
                      </td>

                      {/* Valor de Tarea */}
                      <td className="py-2.5 px-3 text-right border-r border-[#1E293B]/40 font-mono font-medium text-[#E2E8F0]">
                        {act.valor_tarea ? `$${act.valor_tarea.toLocaleString('es-ES')}` : '$0'}
                      </td>

                      {/* Avance % Plan */}
                      <td className="py-2.5 px-3 text-right border-r border-[#1E293B]/40 font-mono font-bold text-blue-400">
                        {act.avance_planificado}%
                      </td>

                      {/* Avance % Real */}
                      <td className="py-2.5 px-3 text-right border-r border-[#1E293B]/40 font-mono font-black text-emerald-400">
                        {act.avance_real}%
                      </td>

                      {/* Entregable */}
                      <td className="py-2.5 px-3 text-center border-r border-[#1E293B]/40">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-md ${
                          act.entregables === 'Sí' ? 'bg-indigo-500/15 text-indigo-400' : 'bg-[#0A0C10] text-[#94A3B8]'
                        }`}>
                          {act.entregables}
                        </span>
                      </td>

                      {/* Observaciones */}
                      <td className="py-2.5 px-4 border-r border-[#1E293B]/40 text-[#94A3B8] italic max-w-[200px] truncate" title={act.observaciones}>
                        {act.observaciones || '-'}
                      </td>

                      {/* Acciones */}
                      <td className="py-2.5 px-3 text-center sticky right-0 bg-[#11141B] z-10 border-l border-[#1E293B] shadow-sm flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onEditActivity(act.id)}
                          className="p-1.5 text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-md transition-all cursor-pointer"
                          title="Editar actividad"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`¿Estás seguro de que deseas eliminar la actividad ${act.wbs} - "${act.tarea}"?`)) {
                              onDeleteActivity(act.id);
                            }
                          }}
                          className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-md transition-all cursor-pointer"
                          title="Eliminar actividad"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={22} className="py-16 text-center text-[#94A3B8] bg-[#0A0C10]/40">
                    <div className="flex flex-col items-center justify-center">
                      <Search className="h-8 w-8 text-slate-500 mb-2" />
                      <p className="font-bold text-[#E2E8F0]">No se encontraron actividades</p>
                      <p className="text-xs text-[#94A3B8] mt-1">Prueba quitando filtros de búsqueda o restableciendo los valores.</p>
                      <button 
                        onClick={handleResetFilters}
                        className="mt-3 px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
                      >
                        Mostrar todas las actividades
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
