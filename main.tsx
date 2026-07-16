/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Calendar, ChevronRight, Info, Award, Circle } from 'lucide-react';
import { Actividad } from '../types';

interface GanttViewProps {
  actividades: Actividad[];
  referenceDate: string;
}

export default function GanttView({ actividades, referenceDate }: GanttViewProps) {
  const [filterResponsable, setFilterResponsable] = useState('TODOS');
  const [filterDisciplina, setFilterDisciplina] = useState('TODOS');

  // Ordenar actividades por WBS para el cronograma (orden jerárquico correcto)
  const parseWBS = (wbsStr: string): number[] => {
    if (!wbsStr) return [999];
    return wbsStr.split('.').map(part => {
      const parsed = parseInt(part, 10);
      return isNaN(parsed) ? 0 : parsed;
    });
  };

  const sortedActivities = useMemo(() => {
    const filtered = actividades.filter(act => {
      const matchesResp = filterResponsable === 'TODOS' || act.responsable === filterResponsable;
      const matchesDisc = filterDisciplina === 'TODOS' || act.disciplina === filterDisciplina;
      return matchesResp && matchesDisc;
    });

    return [...filtered].sort((a, b) => {
      const aWbs = parseWBS(a.wbs);
      const bWbs = parseWBS(b.wbs);
      const maxLen = Math.max(aWbs.length, bWbs.length);
      for (let i = 0; i < maxLen; i++) {
        const aVal = aWbs[i] !== undefined ? aWbs[i] : -1;
        const bVal = bWbs[i] !== undefined ? bWbs[i] : -1;
        if (aVal !== bVal) return aVal - bVal;
      }
      return 0;
    });
  }, [actividades, filterResponsable, filterDisciplina]);

  // Obtener todos los responsables y disciplinas únicos para filtros rápidos
  const listResponsables = useMemo(() => {
    const list = new Set(actividades.map(a => a.responsable).filter(Boolean));
    return Array.from(list);
  }, [actividades]);

  const listDisciplinas = useMemo(() => {
    const list = new Set(actividades.map(a => a.disciplina).filter(Boolean));
    return Array.from(list);
  }, [actividades]);

  // Determinar los meses del proyecto a graficar
  const timelineMonths = useMemo(() => {
    if (actividades.length === 0) return [];
    
    let earliestTime = Infinity;
    let latestTime = -Infinity;

    actividades.forEach(act => {
      if (act.inicio_planificado) {
        const t = new Date(act.inicio_planificado).getTime();
        if (t < earliestTime) earliestTime = t;
      }
      if (act.fin_planificado) {
        const t = new Date(act.fin_planificado).getTime();
        if (t > latestTime) latestTime = t;
      }
      if (act.inicio_real) {
        const t = new Date(act.inicio_real).getTime();
        if (t < earliestTime) earliestTime = t;
      }
      if (act.fin_real) {
        const t = new Date(act.fin_real).getTime();
        if (t > latestTime) latestTime = t;
      }
    });

    // En caso de que no haya fechas válidas, usar un rango de prueba alrededor de la fecha de referencia
    if (earliestTime === Infinity || latestTime === -Infinity) {
      const dRef = new Date(referenceDate);
      earliestTime = new Date(dRef.getFullYear(), dRef.getMonth() - 2, 1).getTime();
      latestTime = new Date(dRef.getFullYear(), dRef.getMonth() + 4, 1).getTime();
    }

    const startMonthDate = new Date(earliestTime);
    startMonthDate.setDate(1); // Inicio de mes
    
    const endMonthDate = new Date(latestTime);
    endMonthDate.setMonth(endMonthDate.getMonth() + 1);
    endMonthDate.setDate(0); // Fin de mes

    const months: { year: number, month: number, label: string, key: string }[] = [];
    const current = new Date(startMonthDate);

    while (current <= endMonthDate) {
      months.push({
        year: current.getFullYear(),
        month: current.getMonth(),
        label: current.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }).toUpperCase(),
        key: `${current.getFullYear()}-${current.getMonth()}`
      });
      current.setMonth(current.getMonth() + 1);
    }

    return {
      months,
      startMs: startMonthDate.getTime(),
      endMs: endMonthDate.getTime(),
      totalDurationMs: endMonthDate.getTime() - startMonthDate.getTime()
    };
  }, [actividades, referenceDate]);

  // Función para calcular la posición porcentual de una fecha en el timeline
  const getPercentPosition = (dateStr: string) => {
    if (!dateStr || !timelineMonths.startMs || !timelineMonths.totalDurationMs) return 0;
    const time = new Date(dateStr).getTime();
    const position = ((time - timelineMonths.startMs) / timelineMonths.totalDurationMs) * 100;
    return Math.min(100, Math.max(0, position));
  };

  // Colores del Gantt por Estado
  const getBarColorClass = (estado: string, isCritica: boolean) => {
    if (estado === 'Completada') return 'bg-emerald-500';
    if (estado === 'En Curso') return isCritica ? 'bg-rose-500' : 'bg-blue-500';
    if (estado === 'Pausada') return 'bg-amber-500';
    if (estado === 'Cancelada') return 'bg-rose-400';
    return 'bg-slate-600'; // No Iniciada
  };

  return (
    <div className="space-y-6 animate-fade-in" id="gantt-view-container">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-[#11141B] p-6 rounded-2xl border border-[#1E293B] shadow-sm gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#E2E8F0] tracking-tight flex items-center gap-2">
            <Calendar className="text-blue-500 h-5 w-5" />
            Cronograma del Proyecto (Carta Gantt Simple)
          </h2>
          <p className="text-[#94A3B8] text-xs mt-1">
            Visualización temporal de hitos y barras de duración planificada frente a avances reales físicos.
          </p>
        </div>

        {/* Filtros rápidos del Gantt */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-[#94A3B8] uppercase mr-1">Responsable:</span>
            <select
              value={filterResponsable}
              onChange={(e) => setFilterResponsable(e.target.value)}
              className="p-1.5 bg-[#0A0C10] border border-[#1E293B] rounded-lg text-xs font-semibold text-[#E2E8F0] focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="TODOS">Todos</option>
              {listResponsables.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-[#94A3B8] uppercase mr-1">Disciplina:</span>
            <select
              value={filterDisciplina}
              onChange={(e) => setFilterDisciplina(e.target.value)}
              className="p-1.5 bg-[#0A0C10] border border-[#1E293B] rounded-lg text-xs font-semibold text-[#E2E8F0] focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="TODOS">Todas</option>
              {listDisciplinas.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* GUÍA DE SIMBOLOGÍA */}
      <div className="bg-[#11141B] p-4 rounded-xl border border-[#1E293B] shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium text-[#94A3B8]">
            <span className="w-4 h-2 bg-[#0A0C10] border border-dashed border-[#1E293B] rounded-xs inline-block"></span>
            Barra Planificada
          </span>
          
          <span className="flex items-center gap-1.5 font-medium text-[#94A3B8]">
            <span className="w-4 h-2 bg-emerald-500 rounded-xs inline-block"></span>
            Completada (100%)
          </span>

          <span className="flex items-center gap-1.5 font-medium text-[#94A3B8]">
            <span className="w-4 h-2 bg-blue-500 rounded-xs inline-block"></span>
            En Curso (Estándar)
          </span>

          <span className="flex items-center gap-1.5 font-medium text-[#94A3B8]">
            <span className="w-4 h-2 bg-rose-500 rounded-xs inline-block"></span>
            En Curso Crítica / Atrasada
          </span>

          <span className="flex items-center gap-1.5 font-medium text-[#94A3B8]">
            <Award className="h-4 w-4 text-amber-500" />
            Hito del Proyecto
          </span>
        </div>

        <div className="text-[10px] bg-[#0A0C10] py-1 px-2.5 rounded-lg border border-[#1E293B] text-[#94A3B8] font-mono">
          Control: {referenceDate}
        </div>
      </div>

      {/* DIAGRAMA GANTT */}
      <div className="bg-[#11141B] rounded-2xl border border-[#1E293B] shadow-sm overflow-hidden" id="gantt-chart-wrapper">
        <div className="overflow-x-auto">
          {/* Contenedor del Gantt que obliga a un ancho mínimo de timeline */}
          <div className="min-w-[850px]" style={{ width: '100%' }}>
            
            {/* CABEZAL GANTT: Meses */}
            <div className="flex border-b border-[#1E293B] bg-[#0A0C10] font-bold text-[10px] text-[#E2E8F0] select-none">
              {/* Celda izquierda congelada del listado de tareas */}
              <div className="w-[300px] p-3 border-r border-[#1E293B] shrink-0 uppercase tracking-wider font-extrabold text-[#94A3B8]">
                WBS & Tarea
              </div>
              
              {/* Área del Timeline de meses */}
              <div className="flex-1 flex relative">
                {timelineMonths.months.map((m, idx) => (
                  <div 
                    key={m.key} 
                    className={`flex-1 text-center py-3 border-r border-[#1E293B] shrink-0 font-extrabold tracking-wider ${
                      idx === timelineMonths.months.length - 1 ? 'border-r-0' : ''
                    }`}
                  >
                    {m.label}
                  </div>
                ))}
              </div>
            </div>

            {/* FILAS DE TAREAS Y BARRAS */}
            <div className="divide-y divide-[#1E293B]">
              {sortedActivities.length > 0 ? (
                sortedActivities.map(act => {
                  const isTitle = act.tipo_registro === 'Título';
                  const isHito = act.tipo_registro === 'Hito';
                  
                  // Calcular porcentajes de inicio y fin planificado para la barra
                  const pStartPlan = getPercentPosition(act.inicio_planificado);
                  const pEndPlan = getPercentPosition(act.fin_planificado);
                  const pWidthPlan = Math.max(1, pEndPlan - pStartPlan); // Ancho mínimo de 1%

                  // Calcular porcentajes reales (si tiene inicio_real)
                  const pStartReal = act.inicio_real ? getPercentPosition(act.inicio_real) : pStartPlan;
                  // Si no tiene fin real, usamos la fecha de referencia para dibrar la barra hasta hoy, o la fin_planificado si no hay atraso
                  const finalRealDateStr = act.fin_real || (act.estado === 'En Curso' ? referenceDate : act.fin_planificado);
                  const pEndReal = getPercentPosition(finalRealDateStr);
                  const pWidthReal = Math.max(1, pEndReal - pStartReal);

                  return (
                    <div key={act.id} className={`flex items-center hover:bg-[#0A0C10]/40 transition-colors ${isTitle ? 'bg-[#0A0C10]/20' : ''}`}>
                      
                      {/* LADO IZQUIERDO: Nombre e Información */}
                      <div className="w-[300px] p-2.5 border-r border-[#1E293B] shrink-0 flex items-start gap-2 overflow-hidden">
                        <span className="font-mono font-bold text-[#94A3B8] text-xs w-10 shrink-0">
                          {act.wbs}
                        </span>
                        
                        <div className="truncate text-xs">
                          <p className={`truncate font-semibold ${isTitle ? 'uppercase font-bold text-[#E2E8F0]' : 'text-[#E2E8F0]'}`}>
                            {act.tarea}
                          </p>
                          <p className="text-[9px] text-[#94A3B8] mt-0.5 font-medium">
                            {isHito ? 'Hito' : `${act.inicio_planificado} al ${act.fin_planificado}`} 
                            {act.avance_real > 0 && ` • Avance: ${act.avance_real}%`}
                          </p>
                        </div>
                      </div>

                      {/* LADO DERECHO: Canvas del Timeline */}
                      <div className="flex-1 p-2 h-14 relative flex items-center">
                        
                        {/* Líneas divisorias de meses de fondo */}
                        <div className="absolute inset-0 flex pointer-events-none">
                          {timelineMonths.months.map((m, idx) => (
                            <div 
                              key={m.key} 
                              className={`flex-1 border-r border-[#1E293B]/40 ${
                                idx === timelineMonths.months.length - 1 ? 'border-r-0' : ''
                              }`}
                            />
                          ))}
                        </div>

                        {/* Dibujar la Barra */}
                        {isTitle ? (
                          // Título: Barra minimalista de sección o resumen
                          <div 
                            className="absolute h-2 bg-[#0A0C10] rounded-full border border-[#1E293B] overflow-hidden"
                            style={{ 
                              left: `${pStartPlan}%`, 
                              width: `${pWidthPlan}%` 
                            }}
                          >
                            <div 
                              className="bg-blue-500 h-full rounded-full" 
                              style={{ width: `${act.avance_real}%` }}
                            />
                          </div>
                        ) : isHito ? (
                          // Hito: Diamante/Icono en la fecha planificada
                          <div 
                            className="absolute flex items-center justify-center -ml-2"
                            style={{ left: `${pStartPlan}%` }}
                            title={`Hito: ${act.tarea} (${act.inicio_planificado})`}
                          >
                            <Award className={`h-5 w-5 ${act.estado === 'Completada' ? 'text-emerald-400' : 'text-amber-500'}`} />
                            <span className="absolute bottom-full mb-1 text-[8px] bg-[#0A0C10] text-[#E2E8F0] border border-[#1E293B] font-bold py-0.5 px-1 rounded-sm opacity-0 hover:opacity-100 whitespace-nowrap transition-opacity">
                              Hito: {act.wbs}
                            </span>
                          </div>
                        ) : (
                          // Tarea / Subtarea estándar
                          <div className="w-full relative h-7">
                            
                            {/* 1. Barra Planificada (Fondo gris) */}
                            <div 
                              className="absolute top-0 h-3 bg-[#0A0C10] border border-dashed border-[#1E293B] rounded-sm"
                              style={{ 
                                left: `${pStartPlan}%`, 
                                width: `${pWidthPlan}%` 
                              }}
                              title={`Planificado: ${act.inicio_planificado} al ${act.fin_planificado}`}
                            />

                            {/* 2. Barra Real (Frente de color) */}
                            {act.estado !== 'No Iniciada' && (
                              <div 
                                className={`absolute top-4 h-3.5 rounded-sm flex items-center px-1 overflow-hidden shadow-xs transition-all ${getBarColorClass(act.estado, act.critica === 'Sí' || act.atraso_dias > 0)}`}
                                style={{ 
                                  left: `${pStartReal}%`, 
                                  width: `${pWidthReal}%` 
                                }}
                                title={`Real/Ejecución: ${act.inicio_real || 'Plan'} - Avance: ${act.avance_real}%`}
                              >
                                {/* Barra interna de progreso */}
                                <div 
                                  className="absolute top-0 left-0 bottom-0 bg-black/15" 
                                  style={{ width: `${act.avance_real}%` }}
                               />
                                <span className="relative z-10 text-[8px] font-extrabold text-white leading-none font-mono">
                                  {act.avance_real}%
                                </span>
                              </div>
                            )}

                            {/* Indicador de Línea si la tarea está atrasada */}
                            {act.atraso_dias > 0 && (
                              <div 
                                className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-rose-500 animate-ping"
                                style={{ left: `${pEndPlan}%` }}
                                title={`Actividad atrasada por ${act.atraso_dias} días`}
                              />
                            )}

                          </div>
                        )}

                        {/* Línea vertical de Fecha Control (hoy) */}
                        {(() => {
                          const pRef = getPercentPosition(referenceDate);
                          if (pRef > 0 && pRef < 100) {
                            return (
                              <div 
                                className="absolute top-0 bottom-0 w-0.5 bg-rose-500/80 z-20 pointer-events-none"
                                style={{ left: `${pRef}%` }}
                              >
                                <div className="absolute top-0 -translate-x-1/2 bg-rose-500 text-white text-[7px] font-black py-0.5 px-1 rounded-sm tracking-tighter shadow-sm">
                                  CONTROL
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}

                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-16 text-center text-[#94A3B8] bg-[#0A0C10]/20">
                  <p className="text-xs font-semibold">No hay actividades cargadas o coincidentes con los filtros.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
