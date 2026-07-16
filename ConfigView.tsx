/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  LineChart, 
  Line,
  ComposedChart
} from 'recharts';
import { 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  Activity, 
  Calendar, 
  FileText, 
  User, 
  ShieldAlert, 
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { Actividad } from '../types';
import { generateProgressCurve } from '../data';

interface DashboardViewProps {
  actividades: Actividad[];
  referenceDate: string;
  onNavigate: (section: 'dashboard' | 'tabla' | 'formulario' | 'cronograma' | 'configuracion') => void;
  setSelectedActivityId?: (id: number | null) => void;
}

export default function DashboardView({ 
  actividades, 
  referenceDate, 
  onNavigate,
  setSelectedActivityId 
}: DashboardViewProps) {
  const [diasVencimiento, setDiasVencimiento] = useState<number>(15);

  // --- CÁLCULOS KPI ---
  const kpis = useMemo(() => {
    const total = actividades.length;
    if (total === 0) {
      return {
        total: 0,
        completadas: 0,
        enCurso: 0,
        noIniciadas: 0,
        pausadas: 0,
        canceladas: 0,
        atrasadas: 0,
        pctCompletadas: 0,
        criticas: 0,
        conEntregables: 0,
        avancePlanificadoGeneral: 0,
        avanceRealGeneral: 0,
        desvio: 0,
      };
    }

    const completadas = actividades.filter(a => a.estado === 'Completada').length;
    const enCurso = actividades.filter(a => a.estado === 'En Curso').length;
    const noIniciadas = actividades.filter(a => a.estado === 'No Iniciada').length;
    const pausadas = actividades.filter(a => a.estado === 'Pausada').length;
    const canceladas = actividades.filter(a => a.estado === 'Cancelada').length;
    const criticas = actividades.filter(a => a.critica === 'Sí').length;
    const conEntregables = actividades.filter(a => a.entregables === 'Sí').length;

    // Actividades Atrasadas según requerimiento E:
    // Estado no es Completada, Fin Planificado < fecha actual, Avance Real < 100%
    const atrasadas = actividades.filter(a => {
      const isPast = a.fin_planificado && new Date(a.fin_planificado).getTime() < new Date(referenceDate).getTime();
      return a.estado !== 'Completada' && isPast && a.avance_real < 100;
    }).length;

    const pctCompletadas = Math.round((completadas / total) * 100);

    // Avance Planificado General (Ponderado por Valor de Tarea si existe, si no promedio simple)
    const totalValor = actividades.reduce((sum, a) => sum + (a.valor_tarea || 0), 0);
    
    let avancePlanificadoGeneral = 0;
    let avanceRealGeneral = 0;

    if (totalValor > 0) {
      const sumPlanWeighted = actividades.reduce((sum, a) => sum + ((a.avance_planificado || 0) * (a.valor_tarea || 0)), 0);
      const sumRealWeighted = actividades.reduce((sum, a) => sum + ((a.avance_real || 0) * (a.valor_tarea || 0)), 0);
      avancePlanificadoGeneral = Math.round(sumPlanWeighted / totalValor);
      avanceRealGeneral = Math.round(sumRealWeighted / totalValor);
    } else {
      const sumPlanSimple = actividades.reduce((sum, a) => sum + (a.avance_planificado || 0), 0);
      const sumRealSimple = actividades.reduce((sum, a) => sum + (a.avance_real || 0), 0);
      avancePlanificadoGeneral = Math.round(sumPlanSimple / total);
      avanceRealGeneral = Math.round(sumRealSimple / total);
    }

    const desvio = avanceRealGeneral - avancePlanificadoGeneral;

    return {
      total,
      completadas,
      enCurso,
      noIniciadas,
      pausadas,
      canceladas,
      atrasadas,
      pctCompletadas,
      criticas,
      conEntregables,
      avancePlanificadoGeneral,
      avanceRealGeneral,
      desvio,
    };
  }, [actividades, referenceDate]);

  // --- DATOS PARA GRÁFICOS ---

  // A. Estado de actividades (Pie/Dona)
  const chartDataEstado = useMemo(() => {
    const estados = ['No Iniciada', 'En Curso', 'Pausada', 'Completada', 'Cancelada'];
    const counts = estados.map(est => {
      const count = actividades.filter(a => a.estado === est).length;
      return {
        name: est,
        value: count,
        percentage: actividades.length > 0 ? Math.round((count / actividades.length) * 100) : 0
      };
    }).filter(item => item.value > 0);
    return counts;
  }, [actividades]);

  const COLORS_ESTADOS: { [key: string]: string } = {
    'No Iniciada': '#9ca3af', // Gris
    'En Curso': '#3b82f6',   // Azul
    'Pausada': '#f59e0b',    // Amarillo/Naranja
    'Completada': '#10b981', // Verde
    'Cancelada': '#ef4444'   // Rojo
  };

  // B. Actividades por responsable
  const chartDataResponsable = useMemo(() => {
    const respMap: { [key: string]: { total: number, completas: number } } = {};
    actividades.forEach(a => {
      const r = a.responsable || 'Sin Asignar';
      if (!respMap[r]) {
        respMap[r] = { total: 0, completas: 0 };
      }
      respMap[r].total += 1;
      if (a.estado === 'Completada') {
        respMap[r].completas += 1;
      }
    });

    return Object.entries(respMap).map(([name, data]) => ({
      name,
      'Total': data.total,
      'Completadas': data.completas,
    })).sort((a, b) => b.Total - a.Total);
  }, [actividades]);

  // C. Actividades por disciplina
  const chartDataDisciplina = useMemo(() => {
    const discMap: { [key: string]: number } = {};
    actividades.forEach(a => {
      const d = a.disciplina || 'GENERAL';
      discMap[d] = (discMap[d] || 0) + 1;
    });
    return Object.entries(discMap).map(([name, value]) => ({
      name,
      'Cantidad': value
    })).sort((a, b) => b.Cantidad - a.Cantidad);
  }, [actividades]);

  // D. Actividades por etapa
  const chartDataEtapa = useMemo(() => {
    const etapaMap: { [key: string]: number } = {};
    actividades.forEach(a => {
      const e = a.etapa || 'GENERAL';
      etapaMap[e] = (etapaMap[e] || 0) + 1;
    });
    return Object.entries(etapaMap).map(([name, value]) => ({
      name,
      'Cantidad': value
    }));
  }, [actividades]);

  // E. Actividades por prioridad
  const chartDataPrioridad = useMemo(() => {
    const priorities = ['Alta', 'Media', 'Baja'];
    return priorities.map(prio => ({
      name: prio,
      'Cantidad': actividades.filter(a => a.prioridad === prio).length
    }));
  }, [actividades]);

  // F. Avance Planificado vs Avance Real General (Bar)
  const chartDataAvanceComparativo = useMemo(() => {
    return [
      {
        name: 'Avance General %',
        'Planificado': kpis.avancePlanificadoGeneral,
        'Real': kpis.avanceRealGeneral
      }
    ];
  }, [kpis]);

  // G. Curva de progreso (S-Curve)
  const chartDataScurve = useMemo(() => {
    return generateProgressCurve(actividades, referenceDate);
  }, [actividades, referenceDate]);

  // H. Listado de actividades atrasadas
  const listadoAtrasadas = useMemo(() => {
    return actividades.filter(a => {
      const isPast = a.fin_planificado && new Date(a.fin_planificado).getTime() < new Date(referenceDate).getTime();
      return a.estado !== 'Completada' && isPast && a.avance_real < 100;
    }).map(a => ({
      id: a.id,
      wbs: a.wbs,
      tarea: a.tarea,
      responsable: a.responsable,
      fin_planificado: a.fin_planificado,
      atraso_dias: a.atraso_dias,
      estado: a.estado,
      avance_real: a.avance_real
    })).sort((a, b) => b.atraso_dias - a.atraso_dias);
  }, [actividades, referenceDate]);

  // I. Próximos vencimientos (dentro de los próximos X días)
  const listadoProximosVencimientos = useMemo(() => {
    const refTime = new Date(referenceDate).getTime();
    const limitTime = refTime + (diasVencimiento * 24 * 60 * 60 * 1000);

    return actividades.filter(a => {
      if (a.estado === 'Completada' || a.estado === 'Cancelada' || !a.fin_planificado) return false;
      const tFin = new Date(a.fin_planificado).getTime();
      return tFin >= refTime && tFin <= limitTime;
    }).map(a => {
      const tFin = new Date(a.fin_planificado).getTime();
      const diasRestantes = Math.ceil((tFin - refTime) / (1000 * 60 * 60 * 24));
      return {
        id: a.id,
        wbs: a.wbs,
        tarea: a.tarea,
        responsable: a.responsable,
        fin_planificado: a.fin_planificado,
        diasRestantes,
        estado: a.estado,
        prioridad: a.prioridad
      };
    }).sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, [actividades, referenceDate, diasVencimiento]);

  return (
    <div className="space-y-8 animate-fade-in" id="dashboard-view-container">
      {/* Encabezado del Dashboard */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-[#11141B] p-6 rounded-2xl border border-[#1E293B] shadow-sm gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#E2E8F0] tracking-tight flex items-center gap-2">
            <Activity className="text-blue-500 h-6 w-6" />
            Dashboard del Proyecto
          </h2>
          <p className="text-[#94A3B8] text-sm mt-1">
            Resumen en tiempo real y métricas de desempeño de ingeniería y construcción.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#0A0C10] border border-[#1E293B] py-2 px-4 rounded-xl text-xs md:text-sm text-[#E2E8F0] font-mono">
          <Calendar className="h-4 w-4 text-[#94A3B8]" />
          <span>Fecha Control: <strong className="text-blue-400">{new Date(referenceDate).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong></span>
        </div>
      </div>

      {/* TARJETAS KPI GRANDES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-grid">
        {/* Avance Real vs Planificado */}
        <div className="col-span-2 bg-radial from-[#1E293B]/70 to-[#11141B] text-white p-6 rounded-2xl border border-[#1E293B] shadow-md relative overflow-hidden flex flex-col justify-between min-h-[160px]" id="kpi-card-avances">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <TrendingUp className="h-40 w-40" />
          </div>
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Avance General</span>
            <span className={`text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1 ${
              kpis.desvio >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
            }`}>
              <ArrowUpRight className="h-3 w-3" />
              Desvío: {kpis.desvio > 0 ? '+' : ''}{kpis.desvio}%
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <div className="text-3xl md:text-4xl font-extrabold tracking-tight text-emerald-400">
                {kpis.avanceRealGeneral}%
              </div>
              <div className="text-xs text-[#94A3B8] mt-1">Avance Real Ponderado</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-extrabold tracking-tight text-blue-400">
                {kpis.avancePlanificadoGeneral}%
              </div>
              <div className="text-xs text-[#94A3B8] mt-1">Avance Planificado</div>
            </div>
          </div>
          
          {/* Barra de progreso de desvío */}
          <div className="w-full bg-[#0A0C10] h-2 rounded-full overflow-hidden mt-4">
            <div 
              className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
              style={{ width: `${kpis.avanceRealGeneral}%` }}
            />
          </div>
        </div>

        {/* Completadas / Estado */}
        <div className="bg-[#11141B] p-5 rounded-2xl border border-[#1E293B] shadow-sm flex flex-col justify-between min-h-[160px]" id="kpi-card-completas">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Completadas</span>
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-bold text-[#E2E8F0] tracking-tight">
              {kpis.completadas} <span className="text-[#94A3B8] text-sm font-normal">/ {kpis.total}</span>
            </div>
            <div className="text-xs text-[#94A3B8] mt-1">{kpis.pctCompletadas}% del total de actividades</div>
          </div>
          <div className="w-full bg-[#0A0C10] h-1.5 rounded-full overflow-hidden mt-2">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${kpis.pctCompletadas}%` }}
            />
          </div>
        </div>

        {/* Actividades Atrasadas */}
        <div className="bg-[#11141B] p-5 rounded-2xl border border-[#1E293B] shadow-sm flex flex-col justify-between min-h-[160px]" id="kpi-card-atrasadas">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">Atrasadas</span>
            <div className={`p-2 rounded-xl ${kpis.atrasadas > 0 ? 'bg-rose-500/15 text-rose-400 animate-pulse' : 'bg-[#0A0C10] text-[#94A3B8]'}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className={`text-2xl md:text-3xl font-bold tracking-tight ${kpis.atrasadas > 0 ? 'text-rose-400' : 'text-[#E2E8F0]'}`}>
              {kpis.atrasadas}
            </div>
            <div className="text-xs text-[#94A3B8] mt-1">Fuera de plazo planificado</div>
          </div>
          <div className="text-xs font-medium text-rose-400/80 mt-2">
            Requieren plan de acción inmediato
          </div>
        </div>
      </div>

      {/* METRICAS DE CONTEO RÁPIDO */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="quick-stats-grid">
        <div className="bg-[#11141B] p-4 rounded-xl border border-[#1E293B] shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-[#E2E8F0]">{kpis.enCurso}</div>
            <div className="text-xs text-[#94A3B8]">En Curso</div>
          </div>
        </div>

        <div className="bg-[#11141B] p-4 rounded-xl border border-[#1E293B] shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-[#0A0C10] text-[#94A3B8] rounded-lg">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-[#E2E8F0]">{kpis.noIniciadas}</div>
            <div className="text-xs text-[#94A3B8]">No Iniciadas</div>
          </div>
        </div>

        <div className="bg-[#11141B] p-4 rounded-xl border border-[#1E293B] shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-lg">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-[#E2E8F0]">{kpis.criticas}</div>
            <div className="text-xs text-[#94A3B8]">Ruta Crítica</div>
          </div>
        </div>

        <div className="bg-[#11141B] p-4 rounded-xl border border-[#1E293B] shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-bold text-[#E2E8F0]">{kpis.conEntregables}</div>
            <div className="text-xs text-[#94A3B8]">Con Entregables</div>
          </div>
        </div>
      </div>

      {/* SECCIÓN CURVA S - ANCHO COMPLETO */}
      <div className="bg-[#11141B] p-6 rounded-2xl border border-[#1E293B] shadow-sm space-y-4" id="chart-card-scurve">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#1E293B] pb-4 gap-2">
          <div>
            <h3 className="text-lg font-bold text-[#E2E8F0] tracking-tight flex items-center gap-2">
              <TrendingUp className="text-emerald-400 h-5 w-5" />
              Curva S de Progreso Acumulado
            </h3>
            <p className="text-xs text-[#94A3B8]">
              Evolución temporal del Avance Planificado vs. Avance Real acumulado ponderado.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-blue-400">
              <span className="w-3 h-3 bg-blue-500 rounded-full inline-block"></span>
              Planificado
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-3 h-3 bg-emerald-500 rounded-full inline-block"></span>
              Real (Corte en Fecha Control)
            </span>
          </div>
        </div>
        
        <div className="h-[300px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartDataScurve}
              margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
              <XAxis 
                dataKey="fecha" 
                stroke="#94A3B8" 
                fontSize={10} 
                tickLine={false}
              />
              <YAxis 
                stroke="#94A3B8" 
                fontSize={10} 
                tickLine={false} 
                domain={[0, 100]}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip 
                contentStyle={{ background: '#11141B', border: '1px solid #1E293B', borderRadius: '12px', color: '#E2E8F0', fontSize: '12px' }}
                formatter={(value: any) => [`${value}%`, 'Avance']}
              />
              <Line 
                type="monotone" 
                dataKey="Planificado" 
                stroke="#3b82f6" 
                strokeWidth={3} 
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="Real" 
                stroke="#10b981" 
                strokeWidth={3} 
                dot={{ r: 4 }} 
                activeDot={{ r: 6 }}
                connectNulls={false} // Corta la línea en fecha control
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* FILA DE GRÁFICOS INTERMEDIOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de dona: Estado de actividades */}
        <div className="bg-[#11141B] p-6 rounded-2xl border border-[#1E293B] shadow-sm flex flex-col justify-between h-[340px]" id="chart-card-estados">
          <div className="border-b border-[#1E293B] pb-3">
            <h4 className="text-sm font-bold text-[#E2E8F0] uppercase tracking-wider">Estado de Actividades</h4>
            <p className="text-xs text-[#94A3B8]">Distribución porcentual por estado operativo</p>
          </div>
          
          <div className="h-[180px] relative flex items-center justify-center">
            {chartDataEstado.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartDataEstado}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartDataEstado.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_ESTADOS[entry.name] || '#333'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props: any) => [`${value} act. (${props.payload.percentage}%)`, name]}
                    contentStyle={{ background: '#11141B', border: '1px solid #1E293B', borderRadius: '8px', color: '#E2E8F0', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-xs text-[#94A3B8] font-medium">No hay actividades cargadas</span>
            )}
            
            {/* Indicador de % en el centro de la dona */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-[#E2E8F0]">{kpis.total}</span>
              <span className="text-[10px] text-[#94A3B8] font-semibold uppercase">Total</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-center text-[10px] font-medium" id="pie-legend">
            {chartDataEstado.map((entry, index) => (
              <span key={index} className="flex items-center gap-1 bg-[#0A0C10]/50 px-2 py-1 rounded-md text-[#E2E8F0] border border-[#1E293B]/60">
                <span 
                  className="w-2.5 h-2.5 rounded-full inline-block" 
                  style={{ backgroundColor: COLORS_ESTADOS[entry.name] }}
                />
                {entry.name}: {entry.value}
              </span>
            ))}
          </div>
        </div>

        {/* Gráfico de Responsables */}
        <div className="bg-[#11141B] p-6 rounded-2xl border border-[#1E293B] shadow-sm flex flex-col justify-between h-[340px]" id="chart-card-responsables">
          <div className="border-b border-[#1E293B] pb-3">
            <h4 className="text-sm font-bold text-[#E2E8F0] uppercase tracking-wider">Por Responsable</h4>
            <p className="text-xs text-[#94A3B8]">Total asignado contra actividades completas</p>
          </div>
          
          <div className="h-[220px] pt-4">
            {chartDataResponsable.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartDataResponsable}
                  margin={{ top: 0, right: 10, left: -25, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#11141B', border: '1px solid #1E293B', borderRadius: '8px', color: '#E2E8F0', fontSize: '11px' }} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="Total" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="Completadas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#94A3B8]">No hay datos</div>
            )}
          </div>
        </div>

        {/* Gráfico comparativo de Avance General */}
        <div className="bg-[#11141B] p-6 rounded-2xl border border-[#1E293B] shadow-sm flex flex-col justify-between h-[340px]" id="chart-card-avance-comparativo">
          <div className="border-b border-[#1E293B] pb-3">
            <h4 className="text-sm font-bold text-[#E2E8F0] uppercase tracking-wider">Avance Planificado vs Real</h4>
            <p className="text-xs text-[#94A3B8]">Brecha porcentual ponderada del proyecto</p>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center justify-center h-full pt-4">
            <div className="flex flex-col items-center justify-center p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
              <span className="text-xs font-semibold text-blue-400 mb-1">Avance Planificado</span>
              <div className="text-4xl font-black text-blue-500 tracking-tight">{kpis.avancePlanificadoGeneral}%</div>
              <p className="text-[10px] text-[#94A3B8] mt-2 text-center">Curva planificada esperada</p>
            </div>

            <div className="flex flex-col items-center justify-center p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
              <span className="text-xs font-semibold text-emerald-400 mb-1">Avance Real</span>
              <div className="text-4xl font-black text-emerald-500 tracking-tight">{kpis.avanceRealGeneral}%</div>
              <p className="text-[10px] text-[#94A3B8] mt-2 text-center">Desempeño físico real</p>
            </div>
          </div>
          
          <div className="pt-2">
            <div className="flex justify-between text-xs font-semibold text-[#E2E8F0] mb-1">
              <span>Estado del Margen de Desvío</span>
              <span className={kpis.desvio >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {kpis.desvio >= 0 ? 'Al día o Adelantado' : 'Atrasado'}
              </span>
            </div>
            <div className="w-full bg-[#0A0C10] h-2.5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${kpis.desvio >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                style={{ width: `${Math.min(100, Math.max(0, 50 + (kpis.desvio * 2)))}%` }} // Gauge centrado en 50
              />
            </div>
            <div className="flex justify-between text-[9px] text-[#94A3B8] mt-1">
              <span>-25% Retraso</span>
              <span>En Línea (0%)</span>
              <span>+25% Adelanto</span>
            </div>
          </div>
        </div>
      </div>

      {/* FILA DE DISTRIBUCIÓN ADICIONAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Disciplina */}
        <div className="bg-[#11141B] p-5 rounded-xl border border-[#1E293B] shadow-sm flex flex-col h-[280px]">
          <h4 className="text-xs font-bold text-[#E2E8F0] uppercase tracking-wider mb-2">Actividades por Disciplina</h4>
          <div className="flex-1 h-[220px] pt-2">
            {chartDataDisciplina.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDataDisciplina} layout="vertical" margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1E293B" />
                  <XAxis type="number" stroke="#94A3B8" fontSize={9} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="#94A3B8" fontSize={8} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ background: '#11141B', border: '1px solid #1E293B', borderRadius: '8px', color: '#E2E8F0', fontSize: '10px' }} />
                  <Bar dataKey="Cantidad" fill="#6366f1" radius={[0, 3, 3, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#94A3B8]">Sin datos</div>
            )}
          </div>
        </div>

        {/* Etapa */}
        <div className="bg-[#11141B] p-5 rounded-xl border border-[#1E293B] shadow-sm flex flex-col h-[280px]">
          <h4 className="text-xs font-bold text-[#E2E8F0] uppercase tracking-wider mb-2">Actividades por Etapa</h4>
          <div className="flex-1 h-[220px] pt-2">
            {chartDataEtapa.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDataEtapa} margin={{ top: 0, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={8} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#11141B', border: '1px solid #1E293B', borderRadius: '8px', color: '#E2E8F0', fontSize: '10px' }} />
                  <Bar dataKey="Cantidad" fill="#06b6d4" radius={[3, 3, 0, 0]} barSize={15} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#94A3B8]">Sin datos</div>
            )}
          </div>
        </div>

        {/* Prioridad */}
        <div className="bg-[#11141B] p-5 rounded-xl border border-[#1E293B] shadow-sm flex flex-col h-[280px]">
          <h4 className="text-xs font-bold text-[#E2E8F0] uppercase tracking-wider mb-2">Actividades por Prioridad</h4>
          <div className="flex-1 h-[220px] pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataPrioridad} margin={{ top: 0, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#11141B', border: '1px solid #1E293B', borderRadius: '8px', color: '#E2E8F0', fontSize: '10px' }} />
                <Bar dataKey="Cantidad" fill="#f43f5e" radius={[3, 3, 0, 0]} barSize={20}>
                  {chartDataPrioridad.map((entry, index) => {
                    const colors = ['#ef4444', '#fb923c', '#38bdf8']; // Alta, Media, Baja
                    return <Cell key={`cell-${index}`} fill={colors[index]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECCIÓN ABAJO: TABLAS DE CONTROL DE ATRASOS Y VENCIMIENTOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actividades Atrasadas */}
        <div className="bg-[#11141B] p-6 rounded-2xl border border-[#1E293B] shadow-sm flex flex-col justify-between min-h-[350px]">
          <div>
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3 mb-4">
              <div>
                <h4 className="font-bold text-[#E2E8F0] text-sm tracking-tight flex items-center gap-2">
                  <AlertTriangle className="text-rose-400 h-4.5 w-4.5" />
                  Actividades con Atraso Detectado
                </h4>
                <p className="text-xs text-[#94A3B8] mt-0.5">Pendientes con fecha de fin planificada superada</p>
              </div>
              <span className="bg-rose-500/10 text-rose-400 font-bold text-xs px-2.5 py-1 rounded-full border border-rose-500/20">
                {listadoAtrasadas.length} Críticas
              </span>
            </div>

            {listadoAtrasadas.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#1E293B] text-[10px] text-[#94A3B8] uppercase font-semibold">
                      <th className="py-2">WBS</th>
                      <th className="py-2">Tarea</th>
                      <th className="py-2">Responsable</th>
                      <th className="py-2 text-right">Fin Plan.</th>
                      <th className="py-2 text-right text-rose-400">Atraso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]/50 text-xs">
                    {listadoAtrasadas.slice(0, 5).map(act => (
                      <tr 
                        key={act.id} 
                        className="hover:bg-[#1E293B]/40 cursor-pointer"
                        onClick={() => {
                          if (setSelectedActivityId) {
                            setSelectedActivityId(act.id);
                            onNavigate('formulario');
                          }
                        }}
                      >
                        <td className="py-2.5 font-mono font-bold text-blue-400">{act.wbs}</td>
                        <td className="py-2.5 font-medium text-[#E2E8F0] max-w-[150px] truncate" title={act.tarea}>
                          {act.tarea}
                        </td>
                        <td className="py-2.5 text-[#94A3B8]">{act.responsable}</td>
                        <td className="py-2.5 text-right text-[#94A3B8]">{act.fin_planificado}</td>
                        <td className="py-2.5 text-right font-bold text-rose-400 bg-rose-500/10 px-2 rounded">+{act.atraso_dias} d</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {listadoAtrasadas.length > 5 && (
                  <p className="text-[10px] text-center text-[#94A3B8] mt-3 font-medium">
                    Mostrando 5 de {listadoAtrasadas.length} actividades atrasadas. Haz clic en "Actividades" para filtrarlas todas.
                  </p>
                )}
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-[#94A3B8] text-center">
                <CheckCircle2 className="text-emerald-400 h-10 w-10 mb-2" />
                <p className="text-xs font-semibold text-[#E2E8F0]">¡Felicidades, sin atrasos vencidos!</p>
                <p className="text-[10px] text-[#94A3B8] mt-1">Todas las actividades en plazo o finalizadas.</p>
              </div>
            )}
          </div>
          
          <button 
            onClick={() => onNavigate('tabla')}
            className="w-full text-center py-2 bg-[#1E293B]/35 hover:bg-[#1E293B]/60 text-[#E2E8F0] text-xs font-bold rounded-xl border border-[#1E293B] transition-colors mt-4 cursor-pointer"
          >
            Ver planilla completa en Lista de Actividades
          </button>
        </div>

        {/* Próximos Vencimientos */}
        <div className="bg-[#11141B] p-6 rounded-2xl border border-[#1E293B] shadow-sm flex flex-col justify-between min-h-[350px]">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#1E293B] pb-3 mb-4 gap-2">
              <div>
                <h4 className="font-bold text-[#E2E8F0] text-sm tracking-tight flex items-center gap-2">
                  <Calendar className="text-blue-400 h-4.5 w-4.5" />
                  Próximos Vencimientos
                </h4>
                <p className="text-xs text-[#94A3B8] mt-0.5">Seguimiento preventivo de plazos límite</p>
              </div>
              <div className="flex items-center gap-1.5 bg-[#0A0C10] border border-[#1E293B] p-1 rounded-lg">
                {[7, 15, 30].map(d => (
                  <button
                    key={d}
                    onClick={() => setDiasVencimiento(d)}
                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                      diasVencimiento === d 
                        ? 'bg-[#1E293B] text-blue-400 shadow-xs border border-[#1E293B]' 
                        : 'text-[#94A3B8] hover:text-[#E2E8F0]'
                    }`}
                  >
                    {d} días
                  </button>
                ))}
              </div>
            </div>

            {listadoProximosVencimientos.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#1E293B] text-[10px] text-[#94A3B8] uppercase font-semibold">
                      <th className="py-2">WBS</th>
                      <th className="py-2">Tarea</th>
                      <th className="py-2 text-center">Prioridad</th>
                      <th className="py-2 text-right">Vence</th>
                      <th className="py-2 text-right">Plazo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]/50 text-xs">
                    {listadoProximosVencimientos.slice(0, 5).map(act => (
                      <tr 
                        key={act.id} 
                        className="hover:bg-[#1E293B]/40 cursor-pointer"
                        onClick={() => {
                          if (setSelectedActivityId) {
                            setSelectedActivityId(act.id);
                            onNavigate('formulario');
                          }
                        }}
                      >
                        <td className="py-2.5 font-mono font-bold text-blue-400">{act.wbs}</td>
                        <td className="py-2.5 font-medium text-[#E2E8F0] max-w-[150px] truncate" title={act.tarea}>
                          {act.tarea}
                        </td>
                        <td className="py-2.5 text-center">
                          <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded-md ${
                            act.prioridad === 'Alta' ? 'bg-red-500/10 text-rose-400' :
                            act.prioridad === 'Media' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-sky-500/10 text-sky-400'
                          }`}>
                            {act.prioridad}
                          </span>
                        </td>
                        <td className="py-2.5 text-right text-[#94A3B8]">{act.fin_planificado}</td>
                        <td className="py-2.5 text-right font-bold text-blue-400">
                          {act.diasRestantes === 0 ? 'Hoy' : `En ${act.diasRestantes} d`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {listadoProximosVencimientos.length > 5 && (
                  <p className="text-[10px] text-center text-[#94A3B8] mt-3 font-medium">
                    Mostrando los primeros 5 vencimientos próximos.
                  </p>
                )}
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-[#94A3B8] text-center">
                <CheckCircle2 className="text-blue-400 h-10 w-10 mb-2" />
                <p className="text-xs font-semibold text-[#E2E8F0]">Sin vencimientos cercanos</p>
                <p className="text-[10px] text-[#94A3B8] mt-1">No hay tareas programadas para vencer en {diasVencimiento} días.</p>
              </div>
            )}
          </div>

          <button 
            onClick={() => onNavigate('cronograma')}
            className="w-full text-center py-2 bg-[#1E293B]/35 hover:bg-[#1E293B]/60 text-[#E2E8F0] text-xs font-bold rounded-xl border border-[#1E293B] transition-colors mt-4 cursor-pointer"
          >
            Visualizar en Diagrama de Cronograma (Gantt)
          </button>
        </div>
      </div>
    </div>
  );
}
