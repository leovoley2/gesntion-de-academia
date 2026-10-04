import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Loader2, Users, ShieldCheck, Pencil, Trash2, X, Check } from 'lucide-react';
import {
  listarPerfiles,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  type NuevoUsuario,
  type DatosEdicion,
} from '../api/usuarios.api';
import type { Perfil, RolUsuario } from '../../../types/database.types';
import { useAuth } from '../../../context/AuthContext';
import { Badge } from '../../../components/ui/Badge';
import { CargarMas } from '../../../components/ui/CargarMas';
import { usePaginado } from '../../../lib/paginacion';

const ROLES: RolUsuario[] = ['alumno', 'entrenador', 'administrador'];

const COLOR_ROL: Record<RolUsuario, 'verde' | 'ambar' | 'gris'> = {
  administrador: 'ambar',
  entrenador: 'verde',
  alumno: 'gris',
};

const VACIO: NuevoUsuario = {
  nombre_completo: '',
  email: '',
  password: '',
  telefono: '',
  rol: 'alumno',
};

export function GestionUsuariosPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<NuevoUsuario>(VACIO);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const {
    items: perfiles,
    total,
    isLoading,
    hayMas,
    cargandoMas,
    cargarMas,
  } = usePaginado(['perfiles'], listarPerfiles);

  const crear = useMutation({
    mutationFn: crearUsuario,
    onSuccess: () => {
      setMensaje('Usuario creado correctamente.');
      setForm(VACIO);
      qc.invalidateQueries({ queryKey: ['perfiles'] });
    },
    onError: (e: Error) => setMensaje(`Error: ${e.message}`),
  });

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setMensaje(null);
    crear.mutate(form);
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6 p-4 pb-24">
      {/* Formulario de alta */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
          <UserPlus className="h-5 w-5 text-brand-600" /> Nuevo usuario
        </h2>

        <form onSubmit={enviar} className="space-y-3">
          <input
            placeholder="Nombre completo"
            value={form.nombre_completo}
            onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
            required
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400"
          />
          <input
            type="email"
            inputMode="email"
            placeholder="Correo"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400"
          />
          <input
            type="tel"
            inputMode="tel"
            placeholder="Teléfono (opcional)"
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400"
          />
          <input
            type="text"
            placeholder="Contraseña inicial (mín. 8)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={8}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400"
          />
          <select
            value={form.rol}
            onChange={(e) => setForm({ ...form, rol: e.target.value as RolUsuario })}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm capitalize outline-none focus:border-brand-400"
          >
            {ROLES.map((r) => (
              <option key={r} value={r} className="capitalize">
                {r}
              </option>
            ))}
          </select>

          {mensaje && (
            <p className={`text-sm ${mensaje.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {mensaje}
            </p>
          )}

          <button
            type="submit"
            disabled={crear.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white active:scale-95 disabled:opacity-60"
          >
            {crear.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Crear usuario
          </button>
        </form>
      </section>

      {/* Lista de usuarios */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
          <Users className="h-5 w-5 text-brand-600" /> Usuarios
          {perfiles && <span className="text-sm font-normal text-slate-400">({total})</span>}
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <ul className="space-y-2">
            {perfiles?.map((p) => (
              <FilaUsuario key={p.id} perfil={p} />
            ))}
          </ul>
        )}
        {perfiles && (
          <CargarMas
            hayMas={hayMas}
            cargando={cargandoMas}
            onClick={cargarMas}
            mostrados={perfiles.length}
            total={total}
          />
        )}

        <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-400">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Crear y eliminar usuarios pasa por Edge Functions seguras que verifican que seas admin.
        </p>
      </section>
    </div>
  );
}

function FilaUsuario({ perfil }: { perfil: Perfil }) {
  const qc = useQueryClient();
  const { session } = useAuth();
  const esYo = session?.user.id === perfil.id;
  const [editando, setEditando] = useState(false);
  const [datos, setDatos] = useState<DatosEdicion>({
    nombre_completo: perfil.nombre_completo,
    telefono: perfil.telefono,
    rol: perfil.rol,
  });

  const guardar = useMutation({
    mutationFn: () => actualizarUsuario(perfil.id, datos),
    onSuccess: () => {
      setEditando(false);
      qc.invalidateQueries({ queryKey: ['perfiles'] });
    },
    onError: (e: Error) => alert(e.message),
  });

  const borrar = useMutation({
    mutationFn: () => eliminarUsuario(perfil.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['perfiles'] }),
    onError: (e: Error) => alert(e.message),
  });

  if (editando) {
    return (
      <li className="space-y-2 rounded-2xl border border-brand-200 bg-white p-3 shadow-sm">
        <input
          value={datos.nombre_completo}
          onChange={(e) => setDatos({ ...datos, nombre_completo: e.target.value })}
          placeholder="Nombre completo"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
        <input
          value={datos.telefono ?? ''}
          onChange={(e) => setDatos({ ...datos, telefono: e.target.value || null })}
          placeholder="Teléfono"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
        />
        <select
          value={datos.rol}
          onChange={(e) => setDatos({ ...datos, rol: e.target.value as RolUsuario })}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm capitalize outline-none focus:border-brand-400"
        >
          {ROLES.map((r) => (
            <option key={r} value={r} className="capitalize">{r}</option>
          ))}
        </select>
        {datos.rol === 'entrenador' && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Las tarifas de clases personalizadas se gestionan en{' '}
            <span className="font-semibold text-brand-600">Tarifas personalizadas</span> (por modalidad).
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => guardar.mutate()}
            disabled={guardar.isPending}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white active:scale-95 disabled:opacity-60"
          >
            {guardar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Guardar
          </button>
          <button
            onClick={() => setEditando(false)}
            className="rounded-lg border border-slate-200 px-4 text-sm text-slate-600 active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-800">
          {perfil.nombre_completo} {esYo && <span className="text-xs text-slate-400">(tú)</span>}
        </p>
        <p className="text-xs text-slate-400">{perfil.telefono || 'sin teléfono'}</p>
      </div>
      <div className="flex items-center gap-1">
        <Badge variante={COLOR_ROL[perfil.rol]}>{perfil.rol}</Badge>
        <button
          onClick={() => setEditando(true)}
          className="rounded-lg p-2 text-slate-500 active:bg-slate-100"
          aria-label="Editar"
        >
          <Pencil className="h-4 w-4" />
        </button>
        {!esYo && (
          <button
            onClick={() => {
              if (confirm(`¿Eliminar a "${perfil.nombre_completo}"? Se borrarán también sus datos.`))
                borrar.mutate();
            }}
            disabled={borrar.isPending}
            className="rounded-lg p-2 text-red-500 active:bg-red-50 disabled:opacity-50"
            aria-label="Eliminar"
          >
            {borrar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        )}
      </div>
    </li>
  );
}
