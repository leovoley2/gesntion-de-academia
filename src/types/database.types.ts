// ============================================================
// Tipos de la base de datos.
//
// Estos son tipos provisionales escritos a mano para arrancar.
// Regenéralos desde tu proyecto real con:
//   npx supabase gen types typescript --project-id <TU_ID> > src/types/database.types.ts
// ============================================================

export type RolUsuario = 'administrador' | 'entrenador' | 'alumno';
export type TipoSede = 'paga' | 'gratis';
export type NivelClase = 'principiante' | 'intermedio' | 'avanzado';
export type TipoMembresia = 'mensual' | 'paquete_clases' | 'personalizado';
export type EstadoMembresia = 'activa' | 'vencida' | 'congelada' | 'pendiente';
export type EstadoAsistencia = 'asistio' | 'falta' | 'tardanza' | 'justificado';
export type MetodoPago = 'Yape' | 'Plin' | 'Transferencia' | 'Efectivo';
export type EstadoPago = 'pendiente' | 'aprobado';
export type EstadoReserva = 'pendiente' | 'confirmada' | 'cancelada' | 'realizada';
export type TipoDisponibilidad = 'academia' | 'personalizada';
export type ModalidadPersonalizada = 'individual' | 'duo' | 'grupo3' | 'grupo4';

export type Plan = {
  id: string;
  nombre: string;
  descripcion: string | null;
  frecuencia_semanal: number;
  clases_mensuales: number;
  precio_mensual: number;
  activo: boolean;
  orden: number;
}

export type TarifaEntrenador = {
  id: string;
  entrenador_id: string;
  modalidad: ModalidadPersonalizada;
  precio_por_atleta: number;
}

export type Perfil = {
  id: string;
  nombre_completo: string;
  telefono: string | null;
  rol: RolUsuario;
  fecha_registro: string;
  tarifa_personalizada: number;
}

export type SedeCancha = {
  id: string;
  nombre: string;
  tipo: TipoSede;
  tarifa_hora: number;
}

export type HorarioClase = {
  id: string;
  sede_id: string;
  entrenador_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  nivel: NivelClase;
}

export type MatriculaMembresia = {
  id: string;
  alumno_id: string;
  tipo_membresia: TipoMembresia;
  estado: EstadoMembresia;
  clases_totales: number;
  clases_disponibles: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  plan_id: string | null;
}

export type ControlAsistencia = {
  id: string;
  horario_clase_id: string;
  alumno_id: string;
  fecha: string;
  estado: EstadoAsistencia;
}

export type Pago = {
  id: string;
  alumno_id: string;
  monto: number;
  moneda: string;
  concepto: string;
  metodo_pago: MetodoPago;
  estado: EstadoPago;
  comprobante_url: string | null;
  fecha_pago: string;
  matricula_id: string | null;
}

export type DisponibilidadEntrenador = {
  id: string;
  entrenador_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  habilitado: boolean;
  motivo_bloqueo: string | null;
  tipo: TipoDisponibilidad;
}

export type InscripcionClase = {
  id: string;
  horario_clase_id: string;
  alumno_id: string;
  fecha_inscripcion: string;
  matricula_id: string | null;
}

export type ClaseReserva = {
  id: string;
  alumno_id: string;
  entrenador_id: string;
  sede_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: EstadoReserva;
  creada_en: string;
  modalidad: ModalidadPersonalizada;
}

// Tipo genérico mínimo para que createClient<Database> compile.
// Sustitúyelo por el esquema autogenerado cuando conectes Supabase.
type Tabla<R> = { Row: R; Insert: Partial<R>; Update: Partial<R>; Relationships: [] };

export interface Database {
  public: {
    Tables: {
      perfiles: Tabla<Perfil>;
      sedes_canchas: Tabla<SedeCancha>;
      horarios_clases: Tabla<HorarioClase>;
      matriculas_membresias: Tabla<MatriculaMembresia>;
      control_asistencia: Tabla<ControlAsistencia>;
      pagos: Tabla<Pago>;
      disponibilidad_entrenador: Tabla<DisponibilidadEntrenador>;
      clases_personalizadas_reservas: Tabla<ClaseReserva>;
      inscripciones_clase: Tabla<InscripcionClase>;
      planes: Tabla<Plan>;
      tarifas_entrenador: Tabla<TarifaEntrenador>;
    };
    Views: Record<string, never>;
    Functions: {
      mi_rol: { Args: Record<string, never>; Returns: RolUsuario };
      aprobar_ingreso: {
        Args: { p_matricula_id: string; p_pago_id?: string | null };
        Returns: undefined;
      };
      rechazar_ingreso: { Args: { p_matricula_id: string }; Returns: undefined };
      renovar_membresia: {
        Args: { p_matricula_id: string; p_pago_id?: string | null };
        Returns: undefined;
      };
      actualizar_vencimientos: { Args: Record<string, never>; Returns: number };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
