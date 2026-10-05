import type { DatosHorario } from '../api/horarios.api';
import type { NivelClase, SedeCancha } from '../../../types/database.types';

export const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const NIVELES: NivelClase[] = ['principiante', 'intermedio', 'avanzado'];

const SELECT =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-400';

/** Campos de una clase grupal: los usan "Nueva clase" y "Editar". */
export function CamposHorario({
  valor,
  onChange,
  sedes,
  entrenadores,
}: {
  valor: DatosHorario;
  onChange: (d: DatosHorario) => void;
  sedes: SedeCancha[] | undefined;
  entrenadores: { id: string; nombre_completo: string }[] | undefined;
}) {
  return (
    <>
      <select
        aria-label="Sede"
        value={valor.sede_id}
        onChange={(e) => onChange({ ...valor, sede_id: e.target.value })}
        className={SELECT}
      >
        <option value="">— Sede —</option>
        {sedes?.map((s) => (
          <option key={s.id} value={s.id}>{s.nombre}</option>
        ))}
      </select>

      <select
        aria-label="Entrenador"
        value={valor.entrenador_id}
        onChange={(e) => onChange({ ...valor, entrenador_id: e.target.value })}
        className={SELECT}
      >
        <option value="">— Entrenador —</option>
        {entrenadores?.map((en) => (
          <option key={en.id} value={en.id}>{en.nombre_completo}</option>
        ))}
      </select>

      <div className="flex gap-2">
        <select
          aria-label="Día"
          value={valor.dia_semana}
          onChange={(e) => onChange({ ...valor, dia_semana: Number(e.target.value) })}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-brand-400"
        >
          {DIAS.map((d, i) => (
            <option key={i} value={i}>{d}</option>
          ))}
        </select>
        <select
          aria-label="Nivel"
          value={valor.nivel}
          onChange={(e) => onChange({ ...valor, nivel: e.target.value as NivelClase })}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm capitalize outline-none focus:border-brand-400"
        >
          {NIVELES.map((n) => (
            <option key={n} value={n} className="capitalize">{n}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <label className="flex-1 text-xs text-slate-500">
          Inicio
          <input
            type="time"
            value={valor.hora_inicio}
            onChange={(e) => onChange({ ...valor, hora_inicio: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
          />
        </label>
        <label className="flex-1 text-xs text-slate-500">
          Fin
          <input
            type="time"
            value={valor.hora_fin}
            onChange={(e) => onChange({ ...valor, hora_fin: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
          />
        </label>
      </div>
    </>
  );
}
