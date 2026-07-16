/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Actividad, TipoRegistro, Disciplina, Etapa, Responsable, Critica, Prioridad, EstadoActividad } from './types';

// Opciones de configuración
export const DISCIPLINAS: Disciplina[] = [
  'GENERAL',
  'PROCESOS',
  'MECÁNICA',
  'PIPING',
  'ELECTRICIDAD',
  'INSTRUMENTACIÓN',
  'CIVIL',
  'HVAC',
  'P.MANAGEMENT',
  'Otra'
];

export const ETAPAS: Etapa[] = [
  'GENERAL',
  'ING. BÁSICA',
  'ING. DETALLE',
  'PROCURA',
  'CONSTRUCCIÓN'
];

export const RESPONSABLES: Responsable[] = [
  'Pablo Martinez',
  'Camila Blanco',
  'Roberto Fueyo',
  'Juan Aciar',
  'Carlos Lorelli',
  'Lorena Fiorotto',
  'Otro'
];

export const TIPOS_REGISTRO: TipoRegistro[] = ['Título', 'Tarea', 'Subtarea', 'Hito'];
export const PRIORIDADES: Prioridad[] = ['Alta', 'Media', 'Baja'];
export const ESTADOS: EstadoActividad[] = ['No Iniciada', 'En Curso', 'Pausada', 'Completada', 'Cancelada'];

/**
 * Calcula la diferencia en días entre dos fechas (inclusive)
 */
export function calculateDaysBetween(startStr: string, endStr: string): number {
  if (!startStr || !endStr) return 0;
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  
  // Resetear horas para cálculo puro de días
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const diffTime = end.getTime() - start.getTime();
  if (diffTime < 0) return 0;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Calcula el atraso en días según las especificaciones del usuario
 */
export function calculateAtraso(
  estado: EstadoActividad,
  finPlanificado: string,
  finReal?: string,
  referenceDateStr: string = '2026-07-16'
): number {
  if (!finPlanificado) return 0;
  
  const planDate = new Date(finPlanificado);
  planDate.setHours(0,0,0,0);
  
  if (estado === 'Completada') {
    if (finReal) {
      const realDate = new Date(finReal);
      realDate.setHours(0,0,0,0);
      const diff = realDate.getTime() - planDate.getTime();
      return diff > 0 ? Math.floor(diff / (1000 * 60 * 60 * 24)) : 0;
    }
    return 0;
  }

  // Si no está completada
  const refDate = new Date(referenceDateStr);
  refDate.setHours(0,0,0,0);
  
  if (refDate.getTime() > planDate.getTime()) {
    const diff = refDate.getTime() - planDate.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
  
  return 0;
}

/**
 * Calcula el avance planificado automático según fecha de referencia
 */
export function calculateAvancePlanificado(
  inicioPlanificado: string,
  finPlanificado: string,
  referenceDateStr: string = '2026-07-16'
): number {
  if (!inicioPlanificado || !finPlanificado) return 0;
  
  const refDate = new Date(referenceDateStr);
  refDate.setHours(0,0,0,0);
  const iniDate = new Date(inicioPlanificado);
  iniDate.setHours(0,0,0,0);
  const finDate = new Date(finPlanificado);
  finDate.setHours(0,0,0,0);
  
  const tRef = refDate.getTime();
  const tIni = iniDate.getTime();
  const tFin = finDate.getTime();
  
  if (isNaN(tIni) || isNaN(tFin)) return 0;
  if (tRef < tIni) return 0;
  if (tRef > tFin) return 100;
  
  const total = tFin - tIni;
  if (total <= 0) return 100;
  
  const elapsed = tRef - tIni;
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

/**
 * Recalcula pesos relativos en base a valor de tareas
 */
export function updateCalculatedFields(actividades: Actividad[], referenceDateStr: string = '2026-07-16'): Actividad[] {
  // Primero sumamos el valor total de las tareas de tipo Tarea, Subtarea, Hito (o todas las que tengan valor)
  const totalValor = actividades.reduce((sum, act) => sum + (act.valor_tarea || 0), 0);
  
  return actividades.map(act => {
    // 1. Calcular duración planificada
    const duracion_planificada = calculateDaysBetween(act.inicio_planificado, act.fin_planificado);
    
    // 2. Calcular duración real (si existe inicio_real y fin_real)
    const duracion_real = act.inicio_real && act.fin_real 
      ? calculateDaysBetween(act.inicio_real, act.fin_real) 
      : undefined;
      
    // 3. Calcular atraso
    const atraso_dias = calculateAtraso(act.estado, act.fin_planificado, act.fin_real, referenceDateStr);
    
    // 4. Peso relativo (Avance % Valor)
    const avance_porcentaje_valor = totalValor > 0 
      ? parseFloat(((act.valor_tarea || 0) / totalValor * 100).toFixed(2)) 
      : 0;
      
    // 5. Avance planificado automático si está habilitado (o si se fuerza la recalculación)
    const avance_planificado = calculateAvancePlanificado(act.inicio_planificado, act.fin_planificado, referenceDateStr);
    
    // 6. Avance real sugerencias según estado
    let avance_real = act.avance_real;
    if (act.estado === 'No Iniciada') {
      avance_real = 0;
    } else if (act.estado === 'Completada') {
      avance_real = 100;
    }

    return {
      ...act,
      duracion_planificada,
      duracion_real,
      atraso_dias,
      avance_porcentaje_valor,
      avance_planificado,
      avance_real
    };
  });
}

// Datos iniciales de prueba para ingeniería y construcción
export const INITIAL_ACTIVITIES_RAW: Omit<Actividad, 'duracion_planificada' | 'duracion_real' | 'atraso_dias' | 'avance_porcentaje_valor' | 'avance_planificado'>[] = [
  {
    id: 1,
    wbs: '1',
    tipo_registro: 'Título',
    tarea: '1. INGENIERÍA BÁSICA',
    disciplina: 'GENERAL',
    etapa: 'ING. BÁSICA',
    responsable: 'Pablo Martinez',
    critica: 'No',
    prioridad: 'Alta',
    estado: 'Completada',
    inicio_planificado: '2026-05-01',
    fin_planificado: '2026-05-25',
    inicio_real: '2026-05-01',
    fin_real: '2026-05-24',
    valor_tarea: 0,
    entregables: 'No',
    observaciones: 'Fase inicial de aprobación conceptual aprobada.',
    avance_real: 100
  },
  {
    id: 2,
    wbs: '1.1',
    tipo_registro: 'Tarea',
    tarea: 'Diseño de Diagramas de Flujo de Procesos (PFD)',
    disciplina: 'PROCESOS',
    etapa: 'ING. BÁSICA',
    responsable: 'Camila Blanco',
    critica: 'Sí',
    prioridad: 'Alta',
    estado: 'Completada',
    inicio_planificado: '2026-05-01',
    fin_planificado: '2026-05-15',
    inicio_real: '2026-05-01',
    fin_real: '2026-05-12',
    valor_tarea: 1500,
    entregables: 'Sí',
    observaciones: 'Entregable aprobado por cliente sin comentarios.',
    avance_real: 100
  },
  {
    id: 3,
    wbs: '1.2',
    tipo_registro: 'Subtarea',
    tarea: 'Cálculo de Balance de Masa y Energía',
    disciplina: 'PROCESOS',
    etapa: 'ING. BÁSICA',
    responsable: 'Camila Blanco',
    critica: 'No',
    prioridad: 'Media',
    estado: 'Completada',
    inicio_planificado: '2026-05-12',
    fin_planificado: '2026-05-22',
    inicio_real: '2026-05-12',
    fin_real: '2026-05-22',
    valor_tarea: 800,
    entregables: 'Sí',
    observaciones: 'Simulación en Hysys completada.',
    avance_real: 100
  },
  {
    id: 4,
    wbs: '1.3',
    tipo_registro: 'Hito',
    tarea: 'Hito: Aprobación de Filosofía de Operación',
    disciplina: 'GENERAL',
    etapa: 'ING. BÁSICA',
    responsable: 'Roberto Fueyo',
    critica: 'Sí',
    prioridad: 'Alta',
    estado: 'Completada',
    inicio_planificado: '2026-05-25',
    fin_planificado: '2026-05-25',
    inicio_real: '2026-05-24',
    fin_real: '2026-05-24',
    valor_tarea: 0,
    entregables: 'Sí',
    observaciones: 'Minuta firmada por el director del proyecto.',
    avance_real: 100
  },
  {
    id: 5,
    wbs: '2',
    tipo_registro: 'Título',
    tarea: '2. INGENIERÍA DE DETALLE',
    disciplina: 'GENERAL',
    etapa: 'ING. DETALLE',
    responsable: 'Pablo Martinez',
    critica: 'Sí',
    prioridad: 'Alta',
    estado: 'En Curso',
    inicio_planificado: '2026-06-01',
    fin_planificado: '2026-07-31',
    inicio_real: '2026-06-01',
    valor_tarea: 0,
    entregables: 'No',
    observaciones: 'Ingeniería de detalle en pleno desarrollo interdisciplinario.',
    avance_real: 65
  },
  {
    id: 6,
    wbs: '2.1',
    tipo_registro: 'Tarea',
    tarea: 'Modelado 3D Civil / Estructuras de Soporte',
    disciplina: 'CIVIL',
    etapa: 'ING. DETALLE',
    responsable: 'Juan Aciar',
    critica: 'No',
    prioridad: 'Alta',
    estado: 'Completada',
    inicio_planificado: '2026-06-01',
    fin_planificado: '2026-06-28',
    inicio_real: '2026-06-01',
    fin_real: '2026-06-26',
    valor_tarea: 2500,
    entregables: 'Sí',
    observaciones: 'Modelo congelado para emisión de planos.',
    avance_real: 100
  },
  {
    id: 7,
    wbs: '2.2',
    tipo_registro: 'Tarea',
    tarea: 'Diseño e Isométricos de Cañerías (Piping)',
    disciplina: 'PIPING',
    etapa: 'ING. DETALLE',
    responsable: 'Carlos Lorelli',
    critica: 'Sí',
    prioridad: 'Alta',
    estado: 'En Curso',
    inicio_planificado: '2026-06-10',
    fin_planificado: '2026-07-20',
    inicio_real: '2026-06-12',
    valor_tarea: 3500,
    entregables: 'Sí',
    observaciones: 'Esfuerzos concentrados en el área de bombas. Retraso por comentarios de procesos.',
    avance_real: 65
  },
  {
    id: 8,
    wbs: '2.3',
    tipo_registro: 'Tarea',
    tarea: 'Planos de Fuerza Motriz y Canalizaciones Eléctricas',
    disciplina: 'ELECTRICIDAD',
    etapa: 'ING. DETALLE',
    responsable: 'Lorena Fiorotto',
    critica: 'No',
    prioridad: 'Media',
    estado: 'En Curso',
    inicio_planificado: '2026-06-15',
    fin_planificado: '2026-07-15',
    inicio_real: '2026-06-15',
    valor_tarea: 1800,
    entregables: 'Sí',
    observaciones: 'Se está trabajando horas extras para compensar un desfase menor.',
    avance_real: 85
  },
  {
    id: 9,
    wbs: '2.3.1',
    tipo_registro: 'Subtarea',
    tarea: 'Revisión Cruzada Eléctrica - Civil',
    disciplina: 'GENERAL',
    etapa: 'ING. DETALLE',
    responsable: 'Lorena Fiorotto',
    critica: 'No',
    prioridad: 'Baja',
    estado: 'Completada',
    inicio_planificado: '2026-06-20',
    fin_planificado: '2026-07-05',
    inicio_real: '2026-06-20',
    fin_real: '2026-07-04',
    valor_tarea: 600,
    entregables: 'No',
    observaciones: 'Interferencias resueltas satisfactoriamente.',
    avance_real: 100
  },
  {
    id: 10,
    wbs: '2.4',
    tipo_registro: 'Tarea',
    tarea: 'Especificaciones Técnicas de Instrumentos y Lazos de Control',
    disciplina: 'INSTRUMENTACIÓN',
    etapa: 'ING. DETALLE',
    responsable: 'Roberto Fueyo',
    critica: 'Sí',
    prioridad: 'Alta',
    estado: 'En Curso',
    inicio_planificado: '2026-07-01',
    fin_planificado: '2026-07-28',
    inicio_real: '2026-07-02',
    valor_tarea: 2200,
    entregables: 'Sí',
    observaciones: 'Avance alineado con el plan. Hojas de datos en revisión.',
    avance_real: 40
  },
  {
    id: 11,
    wbs: '3',
    tipo_registro: 'Título',
    tarea: '3. PROCURA (ADQUISICIONES)',
    disciplina: 'GENERAL',
    etapa: 'PROCURA',
    responsable: 'Roberto Fueyo',
    critica: 'No',
    prioridad: 'Alta',
    estado: 'No Iniciada',
    inicio_planificado: '2026-07-10',
    fin_planificado: '2026-09-15',
    valor_tarea: 0,
    entregables: 'No',
    observaciones: 'En preparación de pliegos de licitación.',
    avance_real: 0
  },
  {
    id: 12,
    wbs: '3.1',
    tipo_registro: 'Tarea',
    tarea: 'Licitación de Recipiente de Presión Principal',
    disciplina: 'MECÁNICA',
    etapa: 'PROCURA',
    responsable: 'Roberto Fueyo',
    critica: 'Sí',
    prioridad: 'Alta',
    estado: 'Pausada',
    inicio_planificado: '2026-07-10',
    fin_planificado: '2026-08-20',
    inicio_real: '2026-07-10',
    valor_tarea: 4500,
    entregables: 'Sí',
    observaciones: 'Suspendida temporalmente por redefinición de volumen por parte de Procesos.',
    avance_real: 10
  },
  {
    id: 13,
    wbs: '3.2',
    tipo_registro: 'Tarea',
    tarea: 'Adquisición de Tuberías y Válvulas Críticas',
    disciplina: 'PIPING',
    etapa: 'PROCURA',
    responsable: 'Carlos Lorelli',
    critica: 'No',
    prioridad: 'Alta',
    estado: 'No Iniciada',
    inicio_planificado: '2026-08-01',
    fin_planificado: '2026-09-10',
    valor_tarea: 3000,
    entregables: 'No',
    observaciones: 'Esperando el listado definitivo de materiales (MTO).',
    avance_real: 0
  },
  {
    id: 14,
    wbs: '4',
    tipo_registro: 'Título',
    tarea: '4. CONSTRUCCIÓN Y MONTAJE',
    disciplina: 'GENERAL',
    etapa: 'CONSTRUCCIÓN',
    responsable: 'Juan Aciar',
    critica: 'Sí',
    prioridad: 'Alta',
    estado: 'No Iniciada',
    inicio_planificado: '2026-09-01',
    fin_planificado: '2026-12-30',
    valor_tarea: 0,
    entregables: 'No',
    observaciones: 'Fase de terreno programada para iniciar en Septiembre.',
    avance_real: 0
  },
  {
    id: 15,
    wbs: '4.1',
    tipo_registro: 'Tarea',
    tarea: 'Movimiento de Suelos y Excavaciones',
    disciplina: 'CIVIL',
    etapa: 'CONSTRUCCIÓN',
    responsable: 'Juan Aciar',
    critica: 'Sí',
    prioridad: 'Alta',
    estado: 'No Iniciada',
    inicio_planificado: '2026-09-01',
    fin_planificado: '2026-10-15',
    valor_tarea: 8500,
    entregables: 'No',
    observaciones: 'Subcontrato adjudicado.',
    avance_real: 0
  },
  {
    id: 16,
    wbs: '4.2',
    tipo_registro: 'Tarea',
    tarea: 'Hormigonado de Fundaciones de Equipos',
    disciplina: 'CIVIL',
    etapa: 'CONSTRUCCIÓN',
    responsable: 'Juan Aciar',
    critica: 'Sí',
    prioridad: 'Alta',
    estado: 'No Iniciada',
    inicio_planificado: '2026-10-10',
    fin_planificado: '2026-11-20',
    valor_tarea: 7000,
    entregables: 'Sí',
    observaciones: 'Secuenciado inmediatamente después de excavaciones.',
    avance_real: 0
  },
  {
    id: 17,
    wbs: '4.3',
    tipo_registro: 'Tarea',
    tarea: 'Montaje Mecánico de Estructuras y Equipos',
    disciplina: 'MECÁNICA',
    etapa: 'CONSTRUCCIÓN',
    responsable: 'Pablo Martinez',
    critica: 'No',
    prioridad: 'Media',
    estado: 'No Iniciada',
    inicio_planificado: '2026-11-15',
    fin_planificado: '2026-12-20',
    valor_tarea: 6000,
    entregables: 'No',
    observaciones: 'Grúas principales ya reservadas.',
    avance_real: 0
  },
  {
    id: 18,
    wbs: '4.4',
    tipo_registro: 'Hito',
    tarea: 'Hito: Finalización Física y Recepción de Obra',
    disciplina: 'GENERAL',
    etapa: 'CONSTRUCCIÓN',
    responsable: 'Pablo Martinez',
    critica: 'Sí',
    prioridad: 'Alta',
    estado: 'No Iniciada',
    inicio_planificado: '2026-12-30',
    fin_planificado: '2026-12-30',
    valor_tarea: 0,
    entregables: 'Sí',
    observaciones: 'Trámite de habilitación municipal y entrega oficial.',
    avance_real: 0
  }
];

export function getInitialActivities(referenceDateStr: string = '2026-07-16'): Actividad[] {
  // Mapeamos los datos raw convirtiéndolos a Actividad completa
  const completeActivities: Actividad[] = INITIAL_ACTIVITIES_RAW.map(act => {
    return {
      ...act,
      duracion_planificada: 0,
      atraso_dias: 0,
      avance_porcentaje_valor: 0,
      avance_planificado: 0,
    } as Actividad;
  });
  
  return updateCalculatedFields(completeActivities, referenceDateStr);
}

/**
 * Genera la curva de progreso acumulado del proyecto en el tiempo (Curva S)
 */
export function generateProgressCurve(actividades: Actividad[], referenceDateStr: string = '2026-07-16'): { fecha: string, Planificado: number, Real: number | null }[] {
  if (actividades.length === 0) return [];
  
  // Encontrar rango total de fechas
  const dates = actividades.flatMap(a => [
    a.inicio_planificado ? new Date(a.inicio_planificado).getTime() : null,
    a.fin_planificado ? new Date(a.fin_planificado).getTime() : null,
    a.inicio_real ? new Date(a.inicio_real).getTime() : null,
    a.fin_real ? new Date(a.fin_real).getTime() : null
  ]).filter((d): d is number => d !== null && !isNaN(d));
  
  if (dates.length === 0) return [];
  
  const minTime = Math.min(...dates);
  const maxTime = Math.max(...dates);
  const refTime = new Date(referenceDateStr).getTime();
  
  // Generar 12 puntos equitativos en el tiempo para graficar la curva
  const points: number[] = [];
  const step = (maxTime - minTime) / 11;
  for (let i = 0; i <= 11; i++) {
    points.push(minTime + step * i);
  }
  
  const totalValor = actividades.reduce((sum, act) => sum + (act.valor_tarea || 0), 0);
  
  return points.map(t => {
    const d = new Date(t);
    // Formato YYYY-MM-DD para usar con calculadoras
    const dateStr = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: '2-digit' });
    
    let sumPlanProgressWeighted = 0;
    let sumRealProgressWeighted = 0;
    let sumWeights = 0;
    
    let sumPlanProgressSimple = 0;
    let sumRealProgressSimple = 0;
    
    actividades.forEach(act => {
      const weight = act.valor_tarea || 0;
      
      // 1. Avance planificado en el tiempo t
      const planProg = calculateAvancePlanificado(act.inicio_planificado, act.fin_planificado, dateStr);
      
      // 2. Avance real en el tiempo t
      let realProg = 0;
      const actIniReal = act.inicio_real ? new Date(act.inicio_real).getTime() : null;
      const actFinReal = act.fin_real ? new Date(act.fin_real).getTime() : null;
      const actIniPlan = new Date(act.inicio_planificado).getTime();
      
      if (t >= refTime) {
        // En el futuro o presente, mostrar el avance real actual
        realProg = act.avance_real || 0;
      } else {
        // En el pasado
        if (act.estado === 'Completada') {
          if (actFinReal && t >= actFinReal) {
            realProg = 100;
          } else if (actIniReal && t >= actIniReal && actFinReal && actFinReal > actIniReal) {
            realProg = Math.round((100 * (t - actIniReal)) / (actFinReal - actIniReal));
          } else if (actIniReal && t < actIniReal) {
            realProg = 0;
          } else {
            // Fallback si no tiene fechas reales anotadas
            const actFinPlan = new Date(act.fin_planificado).getTime();
            if (t >= actFinPlan) realProg = 100;
            else if (t >= actIniPlan && actFinPlan > actIniPlan) {
              realProg = Math.round((100 * (t - actIniPlan)) / (actFinPlan - actIniPlan));
            } else realProg = 0;
          }
        } else if (act.estado === 'En Curso' || act.estado === 'Pausada') {
          if (actIniReal && t >= actIniReal) {
            const elapsed = t - actIniReal;
            const totalRef = refTime - actIniReal;
            if (totalRef > 0) {
              realProg = Math.round((act.avance_real * elapsed) / totalRef);
            } else {
              realProg = act.avance_real;
            }
          } else {
            realProg = 0;
          }
        } else {
          realProg = 0;
        }
      }
      
      realProg = Math.min(100, Math.max(0, realProg));
      
      if (totalValor > 0) {
        sumPlanProgressWeighted += planProg * weight;
        sumRealProgressWeighted += realProg * weight;
        sumWeights += weight;
      }
      
      sumPlanProgressSimple += planProg;
      sumRealProgressSimple += realProg;
    });
    
    const planFinal = totalValor > 0 && sumWeights > 0
      ? Math.round(sumPlanProgressWeighted / sumWeights)
      : Math.round(sumPlanProgressSimple / actividades.length);
      
    // Para el avance real acumulado, recortamos la curva real en la fecha de referencia (para que no grafique en el futuro)
    const isFuture = t > refTime + (24 * 60 * 60 * 1000); // Dar holgura de un día
    const realFinal = isFuture ? null : (
      totalValor > 0 && sumWeights > 0
        ? Math.round(sumRealProgressWeighted / sumWeights)
        : Math.round(sumRealProgressSimple / actividades.length)
    );
    
    return {
      fecha: label,
      Planificado: planFinal,
      Real: realFinal
    };
  });
}
