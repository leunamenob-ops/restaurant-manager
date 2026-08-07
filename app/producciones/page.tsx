'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

interface Receta {
  id: string;
  nombre: string;
  porciones: number;
  produccion_gramos: string | null;
}

interface LineaPreview {
  nombre: string;
  cantidad: number;
  unidad: string;
  coste: number;
}

const UNIDADES = ['kg', 'gr', 'litros', 'ml', 'unidades', 'porciones'];

const UBICACIONES_SUGERIDAS = [
  'Nevera 0-4°C',
  'Congelador -18°C',
  'Cámara frigorífica',
  'Almacén seco',
  'Abatidor',
];

// =====================================================
// FACTOR DE ESCALA (corregido) — misma lógica que la API
// =====================================================
function calcularFactor(
  cantidad: number,
  unidad: string,
  gramosReceta: number,
  porciones: number
) {
  const u = (unidad || '').toLowerCase();

  // Unidades de peso/volumen → escala por gramos
  if (gramosReceta > 0) {
    if (u.includes('kg') || u.includes('kilo')) return (cantidad * 1000) / gramosReceta;
    if (u.includes('gramo') || u === 'g' || u === 'gr') return cantidad / gramosReceta;
    if (u.includes('litro') || u === 'l') return (cantidad * 1000) / gramosReceta;
    if (u === 'ml') return cantidad / gramosReceta;
  }

  // Unidades/porciones → escala por tandas de la receta
  if (porciones > 0) return cantidad / porciones;
  return cantidad; // 1 unidad = 1 tanda completa de la receta
}

// Días sugeridos de caducidad según ubicación
function caducidadSugerida(ubicacion: string): number | null {
  const u = ubicacion.toLowerCase();
  if (u.includes('congel') || u.includes('-18')) return 90;
  if (u.includes('nevera') || u.includes('frigor') || u.includes('4°')) return 3;
  if (u.includes('seco')) return 30;
  return null;
}

export default function NuevaProduccionPage() {
  const router = useRouter();

  const [subRecetas, setSubRecetas] = useState<Receta[]>([]);
  const [guardando, setGuardando] = useState(false);

  // Campos del formulario
  const [nombre, setNombre] = useState('');
  const [subRecetaId, setSubRecetaId] = useState('');
  const [cantidad, setCantidad] = useState<number>(0);
  const [unidad, setUnidad] = useState('kg');
  const [fechaProduccion, setFechaProduccion] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [fechaCaducidad, setFechaCaducidad] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [responsable, setResponsable] = useState('');
  const [merma, setMerma] = useState<number>(0);
  const [observaciones, setObservaciones] = useState('');

  // Preview del despiece
  const [lineasPreview, setLineasPreview] = useState<LineaPreview[]>([]);
  const [factor, setFactor] = useState(1);
  const [costeEstimado, setCosteEstimado] = useState(0);
  const [cargandoPreview, setCargandoPreview] = useState(false);

  useEffect(() => {
    cargarSubRecetas();
  }, []);

  async function cargarSubRecetas() {
    const { data } = await supabase
      .from('recetas')
      .select('id, nombre, porciones, produccion_gramos')
      .eq('tipo', 'sub_receta')
      .order('nombre');

    setSubRecetas(data || []);
  }

  // Preview del despiece en vivo
  useEffect(() => {
    cargarPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subRecetaId, cantidad, unidad]);

  async function cargarPreview() {
    if (!subRecetaId || !cantidad || cantidad <= 0) {
      setLineasPreview([]);
      setFactor(1);
      setCosteEstimado(0);
      return;
    }

    setCargandoPreview(true);

    const { data: receta } = await supabase
      .from('recetas')
      .select('id, nombre, porciones, produccion_gramos')
      .eq('id', subRecetaId)
      .single();

    if (!receta) {
      setCargandoPreview(false);
      return;
    }

    const { data: lineas } = await supabase
      .from('receta_detalle')
      .select('*')
      .or(`receta_id.eq.${receta.id},subreceta_id.eq.${receta.id}`);

    const validas = (lineas || []).filter((l: any) =>
      /^[0-9a-fA-F-]{36}$/.test(String(l.ingrediente_id || ''))
    );

    const ids = Array.from(new Set(validas.map((l: any) => l.ingrediente_id)));

    const nombres: Record<string, string> = {};
    if (ids.length > 0) {
      const { data: ings } = await supabase
        .from('ingredientes')
        .select('id, nombre')
        .in('id', ids);

      (ings || []).forEach((i: any) => {
        nombres[i.id] = i.nombre;
      });
    }

    const gramosReceta =
      parseFloat(String(receta.produccion_gramos || '').replace(',', '.')) || 0;
    const f = calcularFactor(
      cantidad,
      unidad,
      gramosReceta,
      Number(receta.porciones || 0)
    );

    const rows: LineaPreview[] = validas.map((l: any) => ({
      nombre: nombres[l.ingrediente_id] || 'Ingrediente',
      cantidad: Number(l.cantidad_necesaria || 0) * f,
      unidad: l.unidad || 'ud',
      coste: Number(l.coste_linea || 0) * f,
    }));

    setFactor(f);
    setLineasPreview(rows);
    setCosteEstimado(rows.reduce((s, r) => s + r.coste, 0));
    setCargandoPreview(false);
  }

  // Autocompletar caducidad sugerida al elegir ubicación
  function onUbicacionChange(valor: string) {
    setUbicacion(valor);
    if (!fechaCaducidad) {
      const dias = caducidadSugerida(valor);
      if (dias) {
        const d = new Date();
        d.setDate(d.getDate() + dias);
        setFechaCaducidad(d.toISOString().slice(0, 10));
      }
    }
  }

  async function crearProduccion(e: React.FormEvent) {
    e.preventDefault();

    if (!nombre || !fechaCaducidad || !cantidad || cantidad <= 0) {
      alert('Completa al menos: nombre, cantidad y fecha de caducidad.');
      return;
    }

    setGuardando(true);

    try {
      const res = await fetch('/api/producciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          sub_receta_id: subRecetaId || null,
          cantidad_producida: cantidad,
          unidad_medida: unidad,
          fecha_produccion: new Date(fechaProduccion + 'T08:00:00').toISOString(),
          fecha_caducidad: new Date(fechaCaducidad + 'T12:00:00').toISOString(),
          ubicacion_almacen: ubicacion || null,
          responsable_nombre: responsable || null,
          merma_porcentaje: merma,
          observaciones: observaciones || null,
          estado: 'planificada',
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        alert(`Error: ${data.error}`);
        setGuardando(false);
        return;
      }

      alert(
        `✅ Producción creada correctamente\nLote: ${data.lote_numero}\nFactor: ×${data.factor_aplicado}\nMateriales: ${data.materiales_generados}\nAñadidos al carrito: ${data.carrito_lineas}`
      );
      router.push('/producciones');
    } catch (error: any) {
      alert(`Error de conexión: ${error.message}`);
      setGuardando(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-amber-600 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">+</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Nueva Producción
                </h1>
                <p className="text-sm text-slate-500">
                  Planifica y calcula el despiece automáticamente
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/producciones')}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-all text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={crearProduccion}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* COLUMNA IZQUIERDA: FORMULARIO */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-5">
                  📋 Datos de la producción
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Nombre de la producción *
                    </label>
                    <input
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej: Salsa de tomate lote semanal"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Sub-receta base
                    </label>
                    <select
                      value={subRecetaId}
                      onChange={(e) => setSubRecetaId(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition bg-white text-slate-700"
                    >
                      <option value="">— Sin receta (despiece manual) —</option>
                      {subRecetas.map((r) => (
                        <option key={r.id} value={r.id}>
                          🥘 {r.nombre}
                          {r.produccion_gramos ? ` (${parseFloat(r.produccion_gramos)}g base)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Cantidad a producir *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={cantidad || ''}
                      onChange={(e) => setCantidad(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Unidad
                    </label>
                    <select
                      value={unidad}
                      onChange={(e) => setUnidad(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition bg-white text-slate-700"
                    >
                      {UNIDADES.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Fecha de producción
                    </label>
                    <input
                      type="date"
                      value={fechaProduccion}
                      onChange={(e) => setFechaProduccion(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Fecha de caducidad *
                    </label>
                    <input
                      type="date"
                      value={fechaCaducidad}
                      onChange={(e) => setFechaCaducidad(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Ubicación de almacén
                    </label>
                    <input
                      type="text"
                      list="ubicaciones"
                      value={ubicacion}
                      onChange={(e) => onUbicacionChange(e.target.value)}
                      placeholder="Ej: Nevera 0-4°C"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
                    />
                    <datalist id="ubicaciones">
                      {UBICACIONES_SUGERIDAS.map((u) => (
                        <option key={u} value={u} />
                      ))}
                    </datalist>
                    <p className="text-[11px] text-slate-400 mt-1">
                      💡 Al elegir ubicación se sugiere caducidad (nevera 3d, congelador 90d, seco 30d)
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Responsable
                    </label>
                    <input
                      type="text"
                      value={responsable}
                      onChange={(e) => setResponsable(e.target.value)}
                      placeholder="Ej: Chef Juan"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Merma prevista (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={merma || ''}
                      onChange={(e) => setMerma(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Observaciones
                    </label>
                    <textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      rows={3}
                      placeholder="Notas internas de la producción..."
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA: DESPIECE EN VIVO */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-24">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-5">
                  🧮 Despiece automático
                </h2>

                {!subRecetaId ? (
                  <div className="text-center py-8 text-slate-400">
                    <div className="text-4xl mb-3">🥘</div>
                    <p className="text-sm">
                      Selecciona una sub-receta para ver los ingredientes necesarios
                    </p>
                  </div>
                ) : cargandoPreview ? (
                  <div className="py-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-orange-200 border-t-orange-600 mb-2"></div>
                    <p className="text-xs text-slate-500">Calculando despiece...</p>
                  </div>
                ) : lineasPreview.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <p className="text-sm">
                      Esta receta no tiene ingredientes cargados o falta la cantidad
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                      <span className="text-xs text-slate-500">Factor de escala:</span>
                      <span className="px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-xs font-bold">
                        ×{factor.toFixed(2)}
                      </span>
                    </div>

                    <div className="space-y-2.5 mb-5 max-h-72 overflow-y-auto pr-1">
                      {lineasPreview.map((l, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center text-xs bg-slate-50 rounded-lg px-3 py-2"
                        >
                          <span className="text-slate-700 font-medium truncate mr-2">
                            {l.nombre}
                          </span>
                          <span className="text-slate-900 font-bold whitespace-nowrap">
                            {l.cantidad >= 1000 && l.unidad === 'gr'
                              ? `${(l.cantidad / 1000).toFixed(2)} kg`
                              : `${l.cantidad.toFixed(2)} ${l.unidad}`}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                      <span className="text-sm font-semibold text-slate-700">
                        Coste estimado:
                      </span>
                      <span className="text-lg font-bold text-emerald-700">
                        {costeEstimado.toFixed(2)} €
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* BOTÓN CREAR */}
          <div className="mt-8 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push('/producciones')}
              className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-all shadow-sm text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-8 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-all shadow-sm hover:shadow-md text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {guardando ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white"></div>
                  Creando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Crear Producción
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
