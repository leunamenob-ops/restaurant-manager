'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

interface Produccion {
  id_produccion: string;
  nombre: string;
  fecha_produccion: string;
  fecha_caducidad: string;
  cantidad_producida: number;
  unidad_medida: string;
  lote_numero: string;
  estado: string;
}

interface StockAgrupado {
  producto: string;
  total_disponible: number;
  unidad: string;
  lotes: any[];
  caducidad_proxima: string | null;
  dias_proximos: number | null;
}

interface Alerta {
  id: string;
  producto_nombre: string;
  cantidad_disponible: number;
  unidad_medida: string;
  fecha_caducidad: string;
  lote_numero: string;
  dias_hasta_caducidad: number;
  prioridad: 'caducado' | 'critico' | 'urgente' | 'atencion' | 'ok';
}

type Vista = 'calendario' | 'alertas' | 'stock';

const PRIORIDAD_CONFIG = {
  caducado: { label: 'CADUCADO', emoji: '🚨', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
  critico: { label: 'CRÍTICO', emoji: '🔴', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  urgente: { label: 'URGENTE', emoji: '🟠', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  atencion: { label: 'ATENCIÓN', emoji: '🟡', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  ok: { label: 'OK', emoji: '🟢', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
};

const ESTADO_CONFIG: Record<string, { label: string; color: string }> = {
  planificada: { label: 'Planificada', color: 'bg-amber-500' },
  en_proceso: { label: 'En proceso', color: 'bg-blue-500' },
  terminada: { label: 'Terminada', color: 'bg-emerald-500' },
  cancelada: { label: 'Cancelada', color: 'bg-red-400' },
};

export default function InventarioPage() {
  const router = useRouter();
  const [vista, setVista] = useState<Vista>('calendario');
  const [loading, setLoading] = useState(true);

  const [producciones, setProducciones] = useState<Produccion[]>([]);
  const [stockMap, setStockMap] = useState<Map<string, StockAgrupado>>(new Map());
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [calendario, setCalendario] = useState<Produccion[]>([]);

  // Calendario
  const [mesActual, setMesActual] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setLoading(true);
    try {
      const res = await fetch('/api/producciones/inventario');
      const data = await res.json();
      if (data.ok) {
        setProducciones(data.data.producciones);
        setStockMap(new Map(Object.entries(data.data.stock)));
        setAlertas(data.data.alertas_caducidad);
        setCalendario(data.data.calendario);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  // =====================================================
  // CALENDARIO
  // =====================================================
  const primerDiaMes = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1);
  const ultimoDiaMes = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0);
  const diasMes = ultimoDiaMes.getDate();
  const primerDiaSemana = primerDiaMes.getDay(); // 0=domingo
  const inicioCalendario = new Date(primerDiaMes);
  inicioCalendario.setDate(inicioCalendario.getDate() - ((primerDiaSemana + 6) % 7)); // lunes

  const diasCalendario: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(inicioCalendario);
    d.setDate(inicioCalendario.getDate() + i);
    diasCalendario.push(d);
  }

  function produccionesDelDia(fecha: Date) {
    return calendario.filter((p) => {
      const d = new Date(p.fecha_produccion);
      return (
        d.getFullYear() === fecha.getFullYear() &&
        d.getMonth() === fecha.getMonth() &&
        d.getDate() === fecha.getDate()
      );
    });
  }

  function esHoy(fecha: Date) {
    const h = new Date();
    return (
      fecha.getFullYear() === h.getFullYear() &&
      fecha.getMonth() === h.getMonth() &&
      fecha.getDate() === h.getDate()
    );
  }

  function esMesActual(fecha: Date) {
    return fecha.getMonth() === mesActual.getMonth();
  }

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  function cambiarMes(delta: number) {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + delta, 1));
  }

  // =====================================================
  // ALERTAS contadores
  // =====================================================
  const alertasCriticas = alertas.filter(
    (a) => a.prioridad === 'caducado' || a.prioridad === 'critico'
  ).length;
  const alertasUrgentes = alertas.filter((a) => a.prioridad === 'urgente').length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/producciones')}
                className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-all"
              >
                <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Inventario de Producciones
                </h1>
                <p className="text-sm text-slate-500">
                  Mise en place · Caducidades · Planificación
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={cargar}
                disabled={loading}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-all text-sm"
              >
                🔄 Actualizar
              </button>
              <button
                onClick={() => router.push('/producciones/nueva')}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-all text-sm flex items-center gap-2"
              >
                ➕ Nueva producción
              </button>
            </div>
          </div>

          {/* TABS */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setVista('calendario')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                vista === 'calendario'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              📅 Calendario
            </button>
            <button
              onClick={() => setVista('alertas')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 relative ${
                vista === 'alertas'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              🚨 Alertas
              {alertasCriticas > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {alertasCriticas}
                </span>
              )}
            </button>
            <button
              onClick={() => setVista('stock')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                vista === 'stock'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              📦 Stock ({stockMap.size})
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-200 border-t-orange-600 mb-3"></div>
            <p className="text-slate-600 font-medium">Cargando inventario...</p>
          </div>
        ) : (
          <>
            {/* ============ VISTA CALENDARIO ============ */}
            {vista === 'calendario' && (
              <div className="space-y-6">
                {/* Stats rápidas */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                      Próximas 24h
                    </p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {calendario.filter((p) => {
                        const f = new Date(p.fecha_produccion);
                        const ahora = new Date();
                        const diff = (f.getTime() - ahora.getTime()) / (1000 * 60 * 60);
                        return diff >= 0 && diff <= 24;
                      }).length}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">producciones</p>
                  </div>
                  <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
                    <p className="text-xs text-amber-700 uppercase tracking-wider font-semibold">
                      Esta semana
                    </p>
                    <p className="text-2xl font-bold text-amber-700 mt-1">
                      {calendario.filter((p) => {
                        const f = new Date(p.fecha_produccion);
                        const ahora = new Date();
                        const finSem = new Date(ahora);
                        finSem.setDate(ahora.getDate() + 7);
                        return f >= ahora && f <= finSem;
                      }).length}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">planificadas</p>
                  </div>
                  <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-sm">
                    <p className="text-xs text-emerald-700 uppercase tracking-wider font-semibold">
                      Productos en stock
                    </p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">{stockMap.size}</p>
                    <p className="text-xs text-slate-400 mt-1">productos distintos</p>
                  </div>
                  <div className={`rounded-xl border p-4 shadow-sm ${
                    alertasCriticas > 0 ? 'bg-red-50 border-red-300' : 'bg-white border-slate-200'
                  }`}>
                    <p className={`text-xs uppercase tracking-wider font-semibold ${
                      alertasCriticas > 0 ? 'text-red-700' : 'text-slate-500'
                    }`}>
                      Alertas activas
                    </p>
                    <p className={`text-2xl font-bold mt-1 ${
                      alertasCriticas > 0 ? 'text-red-700' : 'text-slate-400'
                    }`}>
                      {alertasCriticas + alertasUrgentes}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {alertasCriticas} críticas · {alertasUrgentes} urgentes
                    </p>
                  </div>
                </div>

                {/* Calendario mensual */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                    <button
                      onClick={() => cambiarMes(-1)}
                      className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center"
                    >
                      ‹
                    </button>
                    <h2 className="text-lg font-bold">
                      {meses[mesActual.getMonth()]} {mesActual.getFullYear()}
                    </h2>
                    <button
                      onClick={() => cambiarMes(1)}
                      className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center"
                    >
                      ›
                    </button>
                  </div>

                  <div className="grid grid-cols-7 text-center border-b border-slate-200 bg-slate-50">
                    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
                      <div key={d} className="py-2 text-xs font-semibold text-slate-600 uppercase">
                        {d}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7">
                    {diasCalendario.map((fecha, idx) => {
                      const prods = produccionesDelDia(fecha);
                      const hoy = esHoy(fecha);
                      const enMes = esMesActual(fecha);

                      return (
                        <div
                          key={idx}
                          className={`min-h-[100px] border-b border-r border-slate-100 p-1.5 ${
                            enMes ? 'bg-white' : 'bg-slate-50'
                          } ${hoy ? 'ring-2 ring-orange-500 ring-inset' : ''}`}
                        >
                          <div className={`text-xs font-semibold mb-1 ${
                            enMes ? 'text-slate-700' : 'text-slate-300'
                          } ${hoy ? 'text-orange-600' : ''}`}>
                            {fecha.getDate()}
                          </div>
                          <div className="space-y-1">
                            {prods.slice(0, 3).map((p) => {
                              const cfg = ESTADO_CONFIG[p.estado] || ESTADO_CONFIG.planificada;
                              return (
                                <button
                                  key={p.id_produccion}
                                  onClick={() => router.push(`/producciones/${p.id_produccion}`)}
                                  className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded ${cfg.color} text-white font-medium truncate hover:opacity-90 transition`}
                                  title={`${p.nombre} · ${p.cantidad_producida} ${p.unidad_medida}`}
                                >
                                  {p.nombre}
                                </button>
                              );
                            })}
                            {prods.length > 3 && (
                              <p className="text-[10px] text-slate-400 px-1">
                                +{prods.length - 3} más
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Leyenda */}
                  <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-3 text-xs">
                    {Object.entries(ESTADO_CONFIG).map(([k, v]) => (
                      <span key={k} className="flex items-center gap-1.5">
                        <span className={`w-3 h-3 rounded ${v.color}`}></span>
                        {v.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Timeline próximas producciones */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
                    ⏱️ Próximas 7 días
                  </h3>
                  <div className="space-y-2">
                    {calendario
                      .filter((p) => {
                        const f = new Date(p.fecha_produccion);
                        const ahora = new Date();
                        const en7 = new Date(ahora);
                        en7.setDate(ahora.getDate() + 7);
                        return f >= ahora && f <= en7;
                      })
                      .sort((a, b) =>
                        new Date(a.fecha_produccion).getTime() - new Date(b.fecha_produccion).getTime()
                      )
                      .slice(0, 10)
                      .map((p) => {
                        const fecha = new Date(p.fecha_produccion);
                        const cfg = ESTADO_CONFIG[p.estado] || ESTADO_CONFIG.planificada;

                        return (
                          <button
                            key={p.id_produccion}
                            onClick={() => router.push(`/producciones/${p.id_produccion}`)}
                            className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition text-left"
                          >
                            <div className={`w-2 h-12 rounded-full ${cfg.color}`}></div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 text-sm truncate">{p.nombre}</p>
                              <p className="text-xs text-slate-500">
                                {p.cantidad_producida} {p.unidad_medida} · {cfg.label}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold text-slate-700">
                                {fecha.toLocaleDateString('es-ES', {
                                  weekday: 'short',
                                  day: '2-digit',
                                  month: 'short',
                                })}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {fecha.toLocaleTimeString('es-ES', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    {calendario.filter((p) => {
                      const f = new Date(p.fecha_produccion);
                      const ahora = new Date();
                      const en7 = new Date(ahora);
                      en7.setDate(ahora.getDate() + 7);
                      return f >= ahora && f <= en7;
                    }).length === 0 && (
                      <p className="text-center text-sm text-slate-400 py-6">
                        No hay producciones planificadas para los próximos 7 días
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ============ VISTA ALERTAS ============ */}
            {vista === 'alertas' && (
              <div className="space-y-6">
                {/* Banner crítico */}
                {alertasCriticas > 0 && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5 flex items-start gap-3">
                    <div className="text-3xl">🚨</div>
                    <div>
                      <p className="font-bold text-red-800">
                        {alertasCriticas} alerta{alertasCriticas > 1 ? 's' : ''} crítica{alertasCriticas > 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-red-700 mt-1">
                        Productos caducados o a punto de caducar. Revisa inmediatamente y retira del servicio.
                      </p>
                    </div>
                  </div>
                )}

                {/* Lista de alertas */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 bg-slate-900 text-white">
                    <h2 className="font-bold">Alertas por caducidad</h2>
                    <p className="text-xs text-slate-400 mt-1">
                      {alertas.length} lotes en stock · ordenados por urgencia
                    </p>
                  </div>
                  {alertas.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="text-5xl mb-3">✅</div>
                      <p className="text-slate-600 font-medium">Todo en orden</p>
                      <p className="text-sm text-slate-400 mt-1">Sin alertas de caducidad</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {alertas.map((a) => {
                        const cfg = PRIORIDAD_CONFIG[a.prioridad];
                        return (
                          <div
                            key={a.id}
                            className={`p-4 flex items-center gap-4 hover:bg-slate-50 transition ${
                              a.prioridad === 'caducado' || a.prioridad === 'critico' ? 'bg-red-50/50' : ''
                            }`}
                          >
                            <div className={`w-12 h-12 rounded-xl ${cfg.bg} ${cfg.border} border flex items-center justify-center text-xl`}>
                              {cfg.emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-slate-900">{a.producto_nombre}</p>
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${cfg.text} ${cfg.bg} border ${cfg.border}`}>
                                  {cfg.label}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1 font-mono">
                                Lote: {a.lote_numero}
                              </p>
                              <p className="text-xs text-slate-500">
                                Stock: <span className="font-semibold text-slate-700">{a.cantidad_disponible} {a.unidad_medida}</span>
                                {' · '}Caduca: {new Date(a.fecha_caducidad).toLocaleDateString('es-ES')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`text-xl font-bold ${
                                a.dias_hasta_caducidad < 0 ? 'text-red-600' :
                                a.dias_hasta_caducidad <= 1 ? 'text-red-600' :
                                a.dias_hasta_caducidad <= 3 ? 'text-orange-600' :
                                a.dias_hasta_caducidad <= 7 ? 'text-amber-600' : 'text-emerald-600'
                              }`}>
                                {a.dias_hasta_caducidad < 0
                                  ? `${Math.abs(a.dias_hasta_caducidad)}d`
                                  : a.dias_hasta_caducidad === 0
                                  ? 'HOY'
                                  : `${a.dias_hasta_caducidad}d`}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {a.dias_hasta_caducidad < 0 ? 'caducado' : 'restantes'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============ VISTA STOCK ============ */}
            {vista === 'stock' && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                  <div>
                    <h2 className="font-bold">Stock de producto terminado</h2>
                    <p className="text-xs text-slate-400 mt-1">
                      {stockMap.size} productos · {Array.from(stockMap.values()).reduce((s, v) => s + v.lotes.length, 0)} lotes activos
                    </p>
                  </div>
                </div>

                {stockMap.size === 0 ? (
                  <div className="p-12 text-center">
                    <div className="text-5xl mb-3">📦</div>
                    <p className="text-slate-600 font-medium">No hay stock de producto terminado</p>
                    <p className="text-sm text-slate-400 mt-1">
                      Termina una producción para ver el inventario
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {Array.from(stockMap.values())
                      .sort((a, b) => {
                        const da = a.dias_proximos ?? 999;
                        const db = b.dias_proximos ?? 999;
                        return da - db; // primero los que antes caducan
                      })
                      .map((s) => {
                        let urgencia = 'ok';
                        if (s.dias_proximos !== null) {
                          if (s.dias_proximos < 0) urgencia = 'caducado';
                          else if (s.dias_proximos <= 1) urgencia = 'critico';
                          else if (s.dias_proximos <= 3) urgencia = 'urgente';
                          else if (s.dias_proximos <= 7) urgencia = 'atencion';
                        }
                        const cfg = PRIORIDAD_CONFIG[urgencia as keyof typeof PRIORIDAD_CONFIG];

                        return (
                          <div key={s.producto} className="p-4 hover:bg-slate-50 transition">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-slate-900">{s.producto}</h3>
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${cfg.text} ${cfg.bg} border ${cfg.border}`}>
                                  {cfg.emoji} {cfg.label}
                                </span>
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-bold text-slate-900">
                                  {s.total_disponible.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                                </p>
                                <p className="text-xs text-slate-500">{s.unidad}</p>
                              </div>
                            </div>

                            <div className="space-y-1 mt-3">
                              {s.lotes
                                .sort((a, b) =>
                                  new Date(a.fecha_caducidad).getTime() - new Date(b.fecha_caducidad).getTime()
                                )
                                .map((l) => {
                                  const cad = new Date(l.fecha_caducidad);
                                  cad.setHours(0, 0, 0, 0);
                                  const hoy = new Date();
                                  hoy.setHours(0, 0, 0, 0);
                                  const dias = Math.ceil(
                                    (cad.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
                                  );

                                  return (
                                    <div
                                      key={l.id}
                                      className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-xs"
                                    >
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <span className="font-mono font-semibold text-slate-700 truncate">
                                          {l.lote_numero}
                                        </span>
                                        <span className="text-slate-400">·</span>
                                        <span className="text-slate-600">
                                          {Number(l.cantidad_disponible).toLocaleString('es-ES', { maximumFractionDigits: 2 })} {s.unidad}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-slate-500">
                                          {cad.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full font-bold ${
                                          dias < 0 ? 'bg-red-100 text-red-700' :
                                          dias <= 1 ? 'bg-red-100 text-red-700' :
                                          dias <= 3 ? 'bg-orange-100 text-orange-700' :
                                          dias <= 7 ? 'bg-amber-100 text-amber-700' :
                                          'bg-emerald-100 text-emerald-700'
                                        }`}>
                                          {dias < 0 ? `${Math.abs(dias)}d ⚠️` : `${dias}d`}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
