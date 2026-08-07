'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

interface Produccion {
  id_produccion: string;
  nombre: string;
  fecha_produccion: string;
  fecha_caducidad: string;
  cantidad_producida: number;
  unidad_medida: string;
  lote_numero: string;
  responsable_nombre: string | null;
  ubicacion_almacen: string | null;
  estado: 'planificada' | 'en_proceso' | 'terminada' | 'cancelada';
  merma_porcentaje: number;
  coste_real: number;
  created_at: string;
}

interface StockDisp {
  id: string;
  producto_nombre: string;
  cantidad_disponible: number;
  unidad_medida: string;
  fecha_caducidad: string;
  lote_numero: string;
}

const ESTADOS_CONFIG = {
  planificada: {
    label: 'Planificada',
    emoji: '🟡',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  en_proceso: {
    label: 'En proceso',
    emoji: '🔵',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  terminada: {
    label: 'Terminada',
    emoji: '🟢',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  cancelada: {
    label: 'Cancelada',
    emoji: '🔴',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
  },
};

const DESTINOS_SUGERIDOS = [
  'Chiringuito Playa',
  'Restaurante Principal',
  'Bar Piscina',
  'Evento / Banquete',
  'Cocina Central',
];

export default function ProduccionesPage() {
  const router = useRouter();
  const [producciones, setProducciones] = useState<Produccion[]>([]);
  const [stockDisponible, setStockDisponible] = useState<StockDisp[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todas');
  const [filtroUbicacion, setFiltroUbicacion] = useState<string>('todas');
  const [filtroCaducidad, setFiltroCaducidad] = useState<string>('todas');

  // Modal de salida FIFO
  const [mostrarSalida, setMostrarSalida] = useState(false);
  const [productoSalida, setProductoSalida] = useState('');
  const [cantidadSalida, setCantidadSalida] = useState<number>(0);
  const [destinoSalida, setDestinoSalida] = useState('');
  const [responsableSalida, setResponsableSalida] = useState('');
  const [procesandoSalida, setProcesandoSalida] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);

    const [prodRes, stockRes] = await Promise.all([
      supabase.from('producciones').select('*').order('fecha_produccion', { ascending: false }),
      supabase
        .from('stock_producciones')
        .select('id, producto_nombre, cantidad_disponible, unidad_medida, fecha_caducidad, lote_numero')
        .eq('movimiento_tipo', 'entrada')
        .gt('cantidad_disponible', 0)
        .order('fecha_caducidad', { ascending: true }),
    ]);

    if (!prodRes.error) setProducciones(prodRes.data || []);
    if (!stockRes.error) setStockDisponible(stockRes.data || []);

    setLoading(false);
  }

  async function eliminarProduccion(id: string, nombre: string) {
    if (
      !confirm(
        `¿Estás seguro de eliminar "${nombre}"?\n\nEsta acción eliminará el lote y los materiales asociados y no se puede deshacer.`
      )
    )
      return;

    try {
      await supabase.from('produccion_materiales').delete().eq('produccion_id', id);
      await supabase.from('lotes').delete().eq('produccion_id', id);
      await supabase.from('stock_producciones').delete().eq('produccion_id', id);
      const { error } = await supabase.from('producciones').delete().eq('id_produccion', id);

      if (error) throw error;

      setTimeout(() => {
        alert('Producción eliminada correctamente');
        cargarDatos();
      }, 100);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }

  async function cambiarEstado(id: string, nuevoEstado: string) {
    const res = await fetch(`/api/producciones/${id}/estado`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        estado: nuevoEstado,
        usuario: 'Sistema Producciones',
      }),
    });

    const data = await res.json();

    if (!data.ok) {
      alert(`Error: ${data.error}`);
      return;
    }

    cargarDatos();
  }

  function diasHastaCaducidad(fechaCaducidad: string): number {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const cad = new Date(fechaCaducidad);
    cad.setHours(0, 0, 0, 0);
    return Math.ceil((cad.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  }

  function getUbicacionesUnicas(): string[] {
    const ubicaciones = producciones
      .map((p) => p.ubicacion_almacen)
      .filter((u): u is string => !!u);
    return Array.from(new Set(ubicaciones));
  }

  // ---------- SALIDA FIFO ----------

  const productosConStock = (() => {
    const mapa = new Map<string, { total: number; unidad: string }>();
    stockDisponible.forEach((s) => {
      const actual = mapa.get(s.producto_nombre) || { total: 0, unidad: s.unidad_medida };
      actual.total += Number(s.cantidad_disponible || 0);
      mapa.set(s.producto_nombre, actual);
    });
    return Array.from(mapa.entries()).map(([nombre, d]) => ({
      nombre,
      total: d.total,
      unidad: d.unidad,
    }));
  })();

  const lotesFifo = stockDisponible.filter((s) => s.producto_nombre === productoSalida);

  const previewFifo = (() => {
    let restante = cantidadSalida || 0;
    return lotesFifo.map((l) => {
      const tomar = Math.min(Number(l.cantidad_disponible || 0), Math.max(0, restante));
      restante -= tomar;
      return { ...l, tomar };
    });
  })();

  async function registrarSalida() {
    if (!productoSalida || !cantidadSalida || cantidadSalida <= 0) {
      alert('Selecciona producto y cantidad válida');
      return;
    }

    setProcesandoSalida(true);

    try {
      const res = await fetch('/api/stock-producciones/salida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_nombre: productoSalida,
          cantidad: cantidadSalida,
          destino: destinoSalida,
          responsable: responsableSalida,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        alert(`Error: ${data.error}`);
        setProcesandoSalida(false);
        return;
      }

      const detalle = (data.consumos || [])
        .map((c: any) => `• Lote ${c.lote}: ${c.cantidad}${c.agotado ? ' (agotado)' : ''}`)
        .join('\n');

      alert(`✅ Salida registrada (FIFO)\n\n${detalle}\n\nDestino: ${destinoSalida || 'servicio'}`);

      setMostrarSalida(false);
      setProductoSalida('');
      setCantidadSalida(0);
      setDestinoSalida('');
      cargarDatos();
    } catch (error: any) {
      alert(`Error de conexión: ${error.message}`);
    } finally {
      setProcesandoSalida(false);
    }
  }

  const produccionesFiltradas = producciones.filter((p) => {
    const coincideBusqueda =
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.lote_numero.toLowerCase().includes(busqueda.toLowerCase());

    const coincideEstado = filtroEstado === 'todas' || p.estado === filtroEstado;

    const coincideUbicacion =
      filtroUbicacion === 'todas' || p.ubicacion_almacen === filtroUbicacion;

    let coincideCaducidad = true;
    if (filtroCaducidad !== 'todas' && p.fecha_caducidad) {
      const dias = diasHastaCaducidad(p.fecha_caducidad);
      if (filtroCaducidad === 'caducadas') coincideCaducidad = dias < 0;
      else if (filtroCaducidad === 'proximas') coincideCaducidad = dias >= 0 && dias <= 3;
      else if (filtroCaducidad === 'atencion') coincideCaducidad = dias > 3 && dias <= 7;
      else if (filtroCaducidad === 'ok') coincideCaducidad = dias > 7;
    }

    return coincideBusqueda && coincideEstado && coincideUbicacion && coincideCaducidad;
  });

  const stats = {
    total: producciones.length,
    planificadas: producciones.filter((p) => p.estado === 'planificada').length,
    enProceso: producciones.filter((p) => p.estado === 'en_proceso').length,
    terminadas: producciones.filter((p) => p.estado === 'terminada').length,
    caducadas: producciones.filter(
      (p) => p.fecha_caducidad && diasHastaCaducidad(p.fecha_caducidad) < 0
    ).length,
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-amber-600 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Gestión de Producciones
                </h1>
                <p className="text-sm text-slate-500">
                  {produccionesFiltradas.length} de {producciones.length} producciones
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="/dashboard"
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-all text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Dashboard
              </a>
              <button
                onClick={() => setMostrarSalida(true)}
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-medium transition-all shadow-sm hover:shadow-md text-sm flex items-center gap-2"
              >
                🚚 Salida
              </button>
              <button
                onClick={() => router.push('/producciones/nueva')}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-all shadow-sm hover:shadow-md text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nueva Producción
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
              </div>
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <span className="text-lg">📋</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-700 font-semibold uppercase tracking-wider">Planificadas</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{stats.planificadas}</p>
              </div>
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <span className="text-lg">🟡</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-700 font-semibold uppercase tracking-wider">En proceso</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{stats.enProceso}</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <span className="text-lg">🔵</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">Terminadas</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.terminadas}</p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                <span className="text-lg">🟢</span>
              </div>
            </div>
          </div>

          <div className={`rounded-xl border p-4 shadow-sm col-span-2 md:col-span-1 ${
            stats.caducadas > 0 ? 'bg-red-50 border-red-300' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider ${
                  stats.caducadas > 0 ? 'text-red-700' : 'text-slate-500'
                }`}>
                  ⚠️ Caducadas
                </p>
                <p className={`text-2xl font-bold mt-1 ${
                  stats.caducadas > 0 ? 'text-red-700' : 'text-slate-400'
                }`}>
                  {stats.caducadas}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                stats.caducadas > 0 ? 'bg-red-100' : 'bg-slate-100'
              }`}>
                <span className="text-lg">🚨</span>
              </div>
            </div>
          </div>
        </div>

        {/* FILTROS */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Buscar
              </label>
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Nombre o lote..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Estado
              </label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition bg-white text-slate-700"
              >
                <option value="todas">Todos los estados</option>
                <option value="planificada">🟡 Planificadas</option>
                <option value="en_proceso">🔵 En proceso</option>
                <option value="terminada">🟢 Terminadas</option>
                <option value="cancelada">🔴 Canceladas</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Ubicación
              </label>
              <select
                value={filtroUbicacion}
                onChange={(e) => setFiltroUbicacion(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition bg-white text-slate-700"
              >
                <option value="todas">Todas las ubicaciones</option>
                {getUbicacionesUnicas().map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Caducidad
              </label>
              <select
                value={filtroCaducidad}
                onChange={(e) => setFiltroCaducidad(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition bg-white text-slate-700"
              >
                <option value="todas">Todas</option>
                <option value="caducadas">🔴 Caducadas</option>
                <option value="proximas">🟠 Próximas (0-3 días)</option>
                <option value="atencion">🟡 Atención (4-7 días)</option>
                <option value="ok">🟢 OK (&gt;7 días)</option>
              </select>
            </div>
          </div>
        </div>

        {/* GRID DE PRODUCCIONES */}
        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-200 border-t-orange-600 mb-3"></div>
            <p className="text-slate-600 font-medium">Cargando producciones...</p>
          </div>
        ) : produccionesFiltradas.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="flex flex-col items-center justify-center text-slate-400 mb-6">
              <svg
                className="w-16 h-16 mb-3 text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-slate-600 font-medium text-lg">No se encontraron producciones</p>
              <p className="text-sm text-slate-400 mt-1">Prueba ajustando los filtros o crea una nueva</p>
            </div>
            <button
              onClick={() => router.push('/producciones/nueva')}
              className="px-6 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-all shadow-sm"
            >
              Crear primera producción
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {produccionesFiltradas.map((prod) => {
              const config = ESTADOS_CONFIG[prod.estado];
              const dias = diasHastaCaducidad(prod.fecha_caducidad);

              let caducidadClass = 'text-slate-700';
              let caducidadLabel = '';
              if (dias < 0) {
                caducidadClass = 'text-red-700 bg-red-50 font-bold';
                caducidadLabel = 'CADUCADO';
              } else if (dias <= 3) {
                caducidadClass = 'text-orange-700 bg-orange-50 font-bold';
                caducidadLabel = 'URGENTE';
              } else if (dias <= 7) {
                caducidadClass = 'text-amber-700 bg-amber-50 font-semibold';
                caducidadLabel = 'Atención';
              }

              const fechaProd = new Date(prod.fecha_produccion).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              const fechaCad = new Date(prod.fecha_caducidad).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });

              return (
                <div
                  key={prod.id_produccion}
                  className="group bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
                >
                  <div className={`px-4 py-3 border-b ${config.border} ${config.bg} flex items-center justify-between`}>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${config.text} ${config.bg} border ${config.border} flex items-center gap-1`}>
                      <span>{config.emoji}</span>
                      {config.label}
                    </span>
                    <span className="text-xs text-slate-500 font-mono" title="Lote">
                      {prod.lote_numero}
                    </span>
                  </div>

                  <div className="p-4 flex flex-col flex-1">
                    <h3
                      className="font-bold text-slate-900 text-sm mb-3 line-clamp-2 min-h-[2.5rem]"
                      title={prod.nombre}
                    >
                      {prod.nombre}
                    </h3>

                    <div className="flex items-baseline gap-2 mb-4 pb-3 border-b border-slate-100">
                      <span className="text-2xl font-bold text-slate-900">
                        {prod.cantidad_producida}
                      </span>
                      <span className="text-sm text-slate-500 uppercase">{prod.unidad_medida}</span>
                    </div>

                    <div className="space-y-2 mb-4 flex-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Producido:
                        </span>
                        <span className="font-semibold text-slate-900">{fechaProd}</span>
                      </div>

                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Caduca:
                        </span>
                        <span className={`font-semibold px-1.5 py-0.5 rounded ${caducidadClass}`}>
                          {fechaCad} {caducidadLabel && `· ${caducidadLabel}`}
                        </span>
                      </div>

                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Coste real:</span>
                        <span className="font-semibold text-slate-900">
                          {(prod.coste_real || 0).toFixed(2)} €
                        </span>
                      </div>

                      {prod.merma_porcentaje > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Merma:</span>
                          <span className="font-semibold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded">
                            {prod.merma_porcentaje}%
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 mb-4 pb-4 border-t border-slate-100 pt-3">
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {prod.ubicacion_almacen || 'Sin ubicar'}
                      </span>
                      {prod.responsable_nombre && (
                        <span className="flex items-center gap-1.5" title={prod.responsable_nombre}>
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="truncate max-w-[100px]">{prod.responsable_nombre}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/producciones/${prod.id_produccion}`)}
                        className="flex-1 px-3 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all duration-300 text-xs font-medium flex items-center justify-center gap-1.5 group/btn"
                      >
                        <svg
                          className="w-4 h-4 transition-transform duration-300 group-hover/btn:scale-110"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        Ver Ficha
                      </button>
                      <button
                        onClick={() => {
                          const next =
                            prod.estado === 'planificada'
                              ? 'en_proceso'
                              : prod.estado === 'en_proceso'
                              ? 'terminada'
                              : 'planificada';
                          cambiarEstado(prod.id_produccion, next);
                        }}
                        className="px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all duration-300 text-xs font-medium flex items-center justify-center group/btn"
                        title="Cambiar estado"
                      >
                        <svg
                          className="w-4 h-4 transition-transform duration-300 group-hover/btn:scale-110"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => eliminarProduccion(prod.id_produccion, prod.nombre)}
                        className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-all duration-300 text-xs font-medium flex items-center justify-center group/btn"
                        title="Eliminar"
                      >
                        <svg
                          className="w-4 h-4 transition-transform duration-300 group-hover/btn:scale-110"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 pb-8 text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-all shadow-sm text-sm flex items-center gap-2 mx-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Volver al Dashboard
          </button>
        </div>
      </main>

      {/* ============ MODAL SALIDA FIFO ============ */}
      {mostrarSalida && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="bg-slate-900 text-white p-4 rounded-t-2xl flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">🚚 Salida de producto (FIFO)</h2>
              <button
                onClick={() => setMostrarSalida(false)}
                className="text-slate-400 hover:text-white w-8 h-8 rounded-full flex items-center justify-center transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {productosConStock.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">
                  No hay stock de producto terminado disponible. Termina una producción primero.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        Producto
                      </label>
                      <select
                        value={productoSalida}
                        onChange={(e) => {
                          setProductoSalida(e.target.value);
                          setCantidadSalida(0);
                        }}
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition bg-white text-slate-700"
                      >
                        <option value="">— Selecciona —</option>
                        {productosConStock.map((p) => (
                          <option key={p.nombre} value={p.nombre}>
                            {p.nombre} ({p.total} {p.unidad} disp.)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        Cantidad
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={cantidadSalida || ''}
                        onChange={(e) => setCantidadSalida(Number(e.target.value))}
                        placeholder="0"
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        Destino
                      </label>
                      <input
                        type="text"
                        list="destinos"
                        value={destinoSalida}
                        onChange={(e) => setDestinoSalida(e.target.value)}
                        placeholder="Ej: Chiringuito Playa"
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition"
                      />
                      <datalist id="destinos">
                        {DESTINOS_SUGERIDOS.map((d) => (
                          <option key={d} value={d} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        Responsable
                      </label>
                      <input
                        type="text"
                        value={responsableSalida}
                        onChange={(e) => setResponsableSalida(e.target.value)}
                        placeholder="Quién retira"
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition"
                      />
                    </div>
                  </div>

                  {/* PREVIEW FIFO */}
                  {productoSalida && cantidadSalida > 0 && (
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                        🔄 Consumirá (FIFO — primero el que antes caduca)
                      </h3>
                      <div className="space-y-2">
                        {previewFifo
                          .filter((l) => l.tomar > 0)
                          .map((l) => (
                            <div
                              key={l.id}
                              className="flex justify-between items-center bg-white rounded-lg px-3 py-2 text-xs border border-slate-200"
                            >
                              <div>
                                <span className="font-mono font-semibold text-slate-800">{l.lote_numero}</span>
                                <span className="text-slate-500 ml-2">
                                  cad. {new Date(l.fecha_caducidad).toLocaleDateString('es-ES')}
                                </span>
                              </div>
                              <span className="font-bold text-cyan-700">
                                −{l.tomar} {l.unidad_medida}
                                {l.tomar >= Number(l.cantidad_disponible) && (
                                  <span className="ml-1 text-red-600">(agota)</span>
                                )}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
              <button
                onClick={registrarSalida}
                disabled={procesandoSalida || !productoSalida || !cantidadSalida}
                className="w-full py-3 bg-cyan-600 text-white rounded-xl font-bold hover:bg-cyan-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {procesandoSalida ? 'Registrando...' : '✅ Confirmar salida FIFO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
