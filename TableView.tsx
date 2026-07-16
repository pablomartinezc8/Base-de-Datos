/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TipoRegistro = 'Título' | 'Tarea' | 'Subtarea' | 'Hito';

export type Disciplina =
  | 'GENERAL'
  | 'PROCESOS'
  | 'MECÁNICA'
  | 'PIPING'
  | 'ELECTRICIDAD'
  | 'INSTRUMENTACIÓN'
  | 'CIVIL'
  | 'HVAC'
  | 'P.MANAGEMENT'
  | 'Otra';

export type Etapa =
  | 'GENERAL'
  | 'ING. BÁSICA'
  | 'ING. DETALLE'
  | 'PROCURA'
  | 'CONSTRUCCIÓN';

export type Responsable =
  | 'Pablo Martinez'
  | 'Camila Blanco'
  | 'Roberto Fueyo'
  | 'Juan Aciar'
  | 'Carlos Lorelli'
  | 'Lorena Fiorotto'
  | 'Otro';

export type Critica = 'Sí' | 'No';

export type Prioridad = 'Alta' | 'Media' | 'Baja';

export type EstadoActividad =
  | 'No Iniciada'
  | 'En Curso'
  | 'Pausada'
  | 'Completada'
  | 'Cancelada';

export type EntregablesOption = 'Sí' | 'No';

export interface Actividad {
  id: number;
  wbs: string;
  tipo_registro: TipoRegistro;
  tarea: string;
  disciplina: Disciplina | string;
  etapa: Etapa | string;
  responsable: Responsable | string;
  critica: Critica;
  prioridad: Prioridad;
  estado: EstadoActividad;
  inicio_planificado: string; // YYYY-MM-DD
  fin_planificado: string; // YYYY-MM-DD
  duracion_planificada: number; // calculated automatically
  inicio_real?: string; // YYYY-MM-DD (can be empty)
  fin_real?: string; // YYYY-MM-DD (can be empty)
  duracion_real?: number; // calculated automatically (if both exist)
  atraso_dias: number; // calculated automatically
  valor_tarea: number; // numeric value/weight
  avance_porcentaje_valor: number; // calculated automatically: (valor_tarea / total_valor) * 100
  entregables: EntregablesOption;
  observaciones: string;
  avance_planificado: number; // 0 to 100
  avance_real: number; // 0 to 100
  created_at?: string;
  updated_at?: string;
}

export type ViewSection =
  | 'dashboard'
  | 'tabla'
  | 'formulario'
  | 'cronograma'
  | 'configuracion';
