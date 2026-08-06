'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

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
  estado: string;
  merma_porcentaje: number;
  coste_real: number;
  observaciones: string | null;
}

interface Material {
  id: string;
  ingrediente_nombre: string;
  cantidad_teorica: number;
  cantidad_real: number;
  unidad: string;
  coste_unitario: number;
  coste_total: number;
}

interface Lote {
  lote_numero: string;
  estado: string;
  cantidad_total: number;
  cantidad_consumida: number;
  alergen_info: any;
}

interface MovStock {
  id: string;
  producto_nombre: string;
  cantidad_disponible: number;
  cantidad_inicial: number;
  unidad_medida: string;
  ubicacion: string;
  fecha_caducidad: string;
  lote_numero: string;
  movimiento_tipo: string;
}

const ESTADOS_CONFIG: Record<string, { label: string; emoji: string; bg: string; text: string; border: string }> = {
  planificada: { label: 'Planificada', emoji: '🟡', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  en_proceso: { label: 'En proceso', emoji: '🔵', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  terminada: { label: 'Terminada', emoji: '🟢', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  cancelada: { label: 'Cancelada', emoji: '🔴', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

function formatearFecha(f: string, conHora = false) {
  return new Date(f).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(conHora ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

function diasHastaCaducidad(f: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const cad = new Date(f);
  cad.setHours(0, 0, 0, 0);
  return Math.ceil((cad.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

function formatearCantidad(c: number, unidad: string) {
  if (unidad === 'gr' && c >= 1000) return `${(c / 1000).toFixed(2)} kg`;
  if (unidad === 'ml' && c >= 1000) return `${(c / 1000).toFixed(2)} L`;
  return `${c} ${unidad}`;
}

// =====================================================
// ETIQUETA IMPRIMIBLE (se renderiza en pantalla y en print)
// =====================================================
function Etiqueta({
  prod,
  lote,
  config,
}: {
  prod: Produccion;
  lote: Lote | null;
  config: any;
}) {
  const ancho = config?.ancho_mm || 50;
  const alto = config?.alto_mm || 30;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
    prod.lote_numero
  )}`;

  const alergenosActivos = lote?.alergen_info
    ? Object.entries(lote.alergen_info)
        .filter(([, v]) => v === true)
        .map(([k]) => k)
    : [];

  return (
    <div
      className="bg-white border-2 border-black text-black p-2 flex flex-col justify-between"
      style={{ width: `${ancho}mm`, minHeight: `${alto}mm` }}
    >
      <div>
        <div className="font-bold text-[11px] leading-tight uppercase truncate">
          {prod.nombre}
        </div>
        <div className="text-[9px] font-mono mt-0.5">Lote: {prod.lote_numero}</div>
      </div>

      <div className="flex items-center gap-2 mt-1">
        {(config?.incluir_qr !== false) && (
          <img src={qrUrl} alt="QR" className="w-14 h-14 shrink-0" />
        )}
        <div className="text-[9px] leading-snug flex-1">
          <div>Cant: {prod.cantidad_producida} {prod.unidad_medida}</div>
          <div>Prod: {formatearFecha(prod.fecha_produccion)}</div>
          <div className="font-bold">Cad: {formatearFecha(prod.fecha_caducidad)}</div>
          {(config?.incluir_responsable && prod.responsable_nombre) && (
            <div>Resp: {prod.responsable_nombre}</div>
          )}
          {(config?.incluir_ubicacion && prod.ubicacion_almacen) && (
            <div>{prod.ubicacion_almacen}</div>
          )}
          {(config?.incluir_alergenos !== false && alergenosActivos.length > 0) && (
            <div className="font-semibold">Alérg: {alergenosActivos.join(', ')}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FichaProduccionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [produccion, setProduccion] = useState<Produccion | null>(null);
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [lote, setLote] = useState<Lote | null>(null);
  const [stock, setStock] = useState<MovStock[]>([]);
  const [configEtiqueta, setConfigEtiqueta] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function cargarTodo() {
    setLoading(true);

    const { data: prod } = await supabase
      .from('producciones')
      .select('*')
      .eq('id_produccion', id)
      .single();

    setProduccion(prod);

    if (prod) {
      const [mats, lt, stk, cfg] = await Promise.all([
        supabase
          .from('produccion_materiales')
          .select('*')
          .eq('produccion_id', id)
          .order('ingrediente_nombre'),
        supabase.from('lotes').select('*').eq('produccion_id', id).single(),
        supabase.from('stock_producciones').select('*').eq('produccion_id', id),
        supabase.from('etiquetas_config').select('*').eq('es_default', true).single(),
      ]);

      setMateriales(mats || []);
      setLote(lt);
      setStock(stk || []);
      setConfigEtiqueta(cfg);
    }

    setLoading(false);
  }

  async function cambiarEstado(nuevo: string) {
    const { error } = await supabase
      .from('producciones')
      .update({ estado: nuevo })
      .eq('id_produccion', id);

    if (error) {
      alert(`Error: ${error.message}`);
      return;
    }

    // Si pasa a terminada y no hay entrada de stock, la creamos
    if (nuevo === 'terminada' && produccion) {
      const { data: existente } = await supabase
        .from('stock_producciones')
        .select('id')
        .eq('produccion_id', id)
        .eq('movimiento_tipo', 'entrada');

      if (!existente || existente.length === 0) {
        await supabase.from('stock_producciones').insert({
          produccion_id: id,
          producto_nombre: produccion.nombre,
          cantidad_disponible: produccion.cantidad_producida,
          cantidad_inicial: produccion.cantidad_producida,
          unidad_medida: produccion.unidad_medida,
          ubicacion: produccion.ubicacion_almacen || 'GENERAL',
          fecha_entrada: produccion.fecha_produccion,
          fecha_caducidad: produccion.fecha_caducidad,
          lote_numero: produccion.lote_numero,
          movimiento_tipo: 'entrada',
          responsable_movimiento: produccion.responsable_nombre,
          observaciones: 'Entrada automática al terminar producción',
        });
      }
    }

    cargarTodo();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-200 border-t-orange-600 mb-3"></div>
          <p className="text-slate-600 font-medium">Cargando ficha...</p>
        </div>
      </div>
    );
  }

  if (!produccion) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 font-medium mb-4">Producción no encontrada</p>
          <button
            onClick={() => router.push('/producciones')}
            className="px-6 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium text-sm"
          >
            Volver a producciones
          </button>
        </div>
      </div>
    );
  }

  const config = ESTADOS_CONFIG[produccion.estado] || ESTADOS_CONFIG.planificada;
  const dias = diasHastaCaducidad(produccion.fecha_caducidad);
  const totalMateriales = materiales.reduce((s, m) => s + (m.coste_total || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* ============ HEADER (no se imprime) ============ */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm print:hidden">
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
                  {produccion.nombre}
                </h1>
                <p className="text-sm text-slate-500 font-mono">{produccion.lote_numero}</p>
              </div>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${config.text} ${config.bg} border ${config.border}`}>
                {config.emoji} {config.label}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {produccion.estado === 'planificada' && (
                <button
                  onClick={() => cambiarEstado('en_proceso')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all text-sm"
                >
                  🔵 Iniciar producción
                </button>
              )}
              {produccion.estado === 'en_proceso' && (
                <button
                  onClick={() => cambiarEstado('terminada')}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-all text-sm"
                >
                  🟢 Terminar producción
                </button>
              )}
              {produccion.estado !== 'cancelada' && produccion.estado !== 'terminada' && (
                <button
                  onClick={() => cambiarEstado('cancelada')}
                  className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 font-medium transition-all text-sm"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium transition-all text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimir etiqueta
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ============ COLUMNA IZQUIERDA (2/3) ============ */}
          <div className="lg:col-span-2 space-y-6">
            {/* DATOS GENERALES */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-5">
                📋 Datos de producción
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Cantidad</p>
                  <p className="text-lg font-bold text-slate-900">
                    {produccion.cantidad_producida} {produccion.unidad_medida}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Producido</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatearFecha(produccion.fecha_produccion, true)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Caducidad</p>
                  <p className={`text-sm font-semibold ${dias < 0 ? 'text-red-600' : dias <= 3 ? 'text-orange-600' : 'text-slate-900'}`}>
                    {formatearFecha(produccion.fecha_caducidad)}
                    <span className="ml-1 text-xs">
                      {dias < 0 ? '· CADUCADO' : `· ${dias} días`}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Ubicación</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {produccion.ubicacion_almacen || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Responsable</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {produccion.responsable_nombre || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Merma</p>
                  <p className="text-sm font-semibold text-orange-700">
                    {produccion.merma_porcentaje}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Coste real</p>
                  <p className="text-lg font-bold text-emerald-700">
                    {(produccion.coste_real || 0).toFixed(2)} €
                  </p>
                </div>
              </div>
              {produccion.observaciones && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">Observaciones</p>
                  <p className="text-sm text-slate-700">{produccion.observaciones}</p>
                </div>
              )}
            </div>

            {/* DESPIECE / MATERIALES */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-5">
                🧮 Despiece ({materiales.length} ingredientes)
              </h2>

              {materiales.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">
                  Sin materiales registrados (producción sin receta o despiece manual pendiente)
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <th className="pb-2 pr-4">Ingrediente</th>
                        <th className="pb-2 pr-4 text-right">Cant. teórica</th>
                        <th className="pb-2 pr-4 text-right">Cant. real</th>
                        <th className="pb-2 pr-4 text-right">Coste ud.</th>
                        <th className="pb-2 text-right">Coste total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materiales.map((m) => (
                        <tr key={m.id} className="border-b border-slate-100 last:border-0">
                          <td className="py-2.5 pr-4 font-medium text-slate-800">{m.ingrediente_nombre}</td>
                          <td className="py-2.5 pr-4 text-right text-slate-600">
                            {formatearCantidad(m.cantidad_teorica, m.unidad)}
                          </td>
                          <td className="py-2.5 pr-4 text-right text-slate-600">
                            {formatearCantidad(m.cantidad_real, m.unidad)}
                          </td>
                          <td className="py-2.5 pr-4 text-right text-slate-600">
                            {m.coste_unitario.toFixed(4)} €
                          </td>
                          <td className="py-2.5 text-right font-semibold text-slate-900">
                            {(m.coste_total || 0).toFixed(2)} €
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200">
                        <td colSpan={4} className="pt-3 text-right font-bold text-slate-700">
                          TOTAL DESPIECE:
                        </td>
                        <td className="pt-3 text-right font-bold text-emerald-700 text-base">
                          {totalMateriales.toFixed(2)} €
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* STOCK */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-5">
                📦 Stock del lote
              </h2>
              {stock.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">
                  Sin movimientos de stock. Al terminar la producción se generará la entrada automáticamente.
                </p>
              ) : (
                <div className="space-y-3">
                  {stock.map((s) => (
                    <div key={s.id} className="flex justify-between items-center bg-slate-50 rounded-lg px-4 py-3 text-sm">
                      <div>
                        <span className="font-semibold text-slate-800 capitalize">{s.movimiento_tipo}</span>
                        <span className="text-slate-500 ml-2">{s.ubicacion}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900">
                          {s.cantidad_disponible} / {s.cantidad_inicial} {s.unidad_medida}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ============ COLUMNA DERECHA (1/3) ============ */}
          <div className="space-y-6">
            {/* ETIQUETA */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-5">
                🏷️ Etiqueta de trazabilidad
              </h2>
              <div className="flex justify-center">
                <Etiqueta prod={produccion} lote={lote} config={configEtiqueta} />
              </div>
              <button
                onClick={() => window.print()}
                className="mt-5 w-full px-4 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium transition-all text-sm"
              >
                🖨️ Imprimir etiqueta
              </button>
            </div>

            {/* TRAZABILIDAD */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-5">
                🔍 Trazabilidad del lote
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Lote:</span>
                  <span className="font-mono font-semibold text-slate-900">{produccion.lote_numero}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Estado lote:</span>
                  <span className="font-semibold text-slate-900 capitalize">{lote?.estado || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cantidad total:</span>
                  <span className="font-semibold text-slate-900">{lote?.cantidad_total ?? produccion.cantidad_producida}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Consumida:</span>
                  <span className="font-semibold text-slate-900">{lote?.cantidad_consumida ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Disponible:</span>
                  <span className="font-bold text-emerald-700">
                    {(lote?.cantidad_total ?? produccion.cantidad_producida) - (lote?.cantidad_consumida ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ============ VERSIÓN DE IMPRESIÓN (solo etiqueta) ============ */}
      <div className="hidden print:block p-4">
        <Etiqueta prod={produccion} lote={lote} config={configEtiqueta} />
      </div>
    </div>
  );
}
