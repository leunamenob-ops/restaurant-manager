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

interface EnvaseInfo {
  indice: number;
  total: number;
  formato: string;
}

const ESTADOS_CONFIG: Record<string, { label: string; emoji: string; bg: string; text: string; border: string }> = {
  planificada: { label: 'Planificada', emoji: '🟡', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  en_proceso: { label: 'En proceso', emoji: '🔵', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  terminada: { label: 'Terminada', emoji: '🟢', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  cancelada: { label: 'Cancelada', emoji: '🔴', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

const FORMATOS_ENVASE = [
  { valor: '5', label: '5 L / 5 kg' },
  { valor: '1', label: '1 L / 1 kg' },
  { valor: '0.5', label: '500 ml / 500 g' },
  { valor: '0.25', label: '250 ml / 250 g' },
  { valor: '0.1', label: '100 ml / 100 g' },
];

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
// ETIQUETA IMPRIMIBLE (con soporte de envase numerado)
// =====================================================
function Etiqueta({
  prod,
  lote,
  config,
  envase,
}: {
  prod: Produccion;
  lote: Lote | null;
  config: any;
  envase?: EnvaseInfo | null;
}) {
  const ancho = config?.ancho_mm || 50;
  const alto = config?.alto_mm || 30;

  const qrData = envase
    ? `https://kostsoftware.com/lote/${encodeURIComponent(prod.lote_numero)}?e=${envase.indice}`
    : `https://kostsoftware.com/lote/${encodeURIComponent(prod.lote_numero)}`;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(qrData)}`;

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
        {envase && (
          <div className="text-[10px] font-bold mt-0.5">
            🏷️ ENVASE {String(envase.indice).padStart(2, '0')}/
            {String(envase.total).padStart(2, '0')} · {envase.formato}
          </div>
        )}
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
  const [cambiandoEstado, setCambiandoEstado] = useState(false);

  // ---------- ENVASES / ETIQUETAS ----------
  const [formatoSel, setFormatoSel] = useState<string>('1');
  const [capacidadCustom, setCapacidadCustom] = useState<number>(1);
  const [numEnvasesManual, setNumEnvasesManual] = useState<number>(0);

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
      const [matsRes, ltRes, stkRes, cfgRes] = await Promise.all([
        supabase
          .from('produccion_materiales')
          .select('*')
          .eq('produccion_id', id)
          .order('ingrediente_nombre'),
        supabase.from('lotes').select('*').eq('produccion_id', id).single(),
        supabase.from('stock_producciones').select('*').eq('produccion_id', id),
        supabase.from('etiquetas_config').select('*').eq('es_default', true).single(),
      ]);

      setMateriales(matsRes.data || []);
      setLote(ltRes.data);
      setStock(stkRes.data || []);
      setConfigEtiqueta(cfgRes.data);
    }

    setLoading(false);
  }

  async function cambiarEstado(nuevo: string) {
    if (cambiandoEstado) return;
    setCambiandoEstado(true);

    try {
      const res = await fetch(`/api/producciones/${id}/estado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: nuevo,
          usuario: produccion?.responsable_nombre || 'Sistema Producciones',
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        alert(`Error: ${data.error}`);
        setCambiandoEstado(false);
        return;
      }

      let mensaje = `✅ Producción → ${data.estado}`;
      if (data.consumo_realizado && data.consumo?.length > 0) {
        const resumen = data.consumo
          .map((c: any) => `• ${c.ingrediente}: ${c.cantidad.toFixed(2)} ${c.unidad_compra}`)
          .join('\n');
        mensaje += `\n\nIngredientes consumidos:\n${resumen}`;
      }
      if (data.stock_terminado_creado) {
        mensaje += '\n\n📦 Entrada de stock de producto terminada generada';
      }

      alert(mensaje);
      cargarTodo();
    } catch (error: any) {
      alert(`Error de conexión: ${error.message}`);
    } finally {
      setCambiandoEstado(false);
    }
  }

  async function guardarCantidadReal(m: Material, valor: number) {
    if (isNaN(valor) || valor < 0) return;
    if (valor === m.cantidad_real) return;

    const { error } = await supabase
      .from('produccion_materiales')
      .update({ cantidad_real: valor })
      .eq('id', m.id);

    if (error) {
      alert(`Error: ${error.message}`);
      return;
    }

    const { data: mats } = await supabase
      .from('produccion_materiales')
      .select('coste_total, coste_unitario, cantidad_teorica')
      .eq('produccion_id', id);

    if (mats && mats.length > 0) {
      const costeReal = mats.reduce((s, x) => s + Number(x.coste_total || 0), 0);
      const costeTeo = mats.reduce(
        (s, x) => s + Number(x.cantidad_teorica || 0) * Number(x.coste_unitario || 0),
        0
      );
      const mermaGlobal = costeTeo > 0 ? ((costeReal - costeTeo) / costeTeo) * 100 : 0;

      await supabase
        .from('producciones')
        .update({
          coste_real: Math.round(costeReal * 100) / 100,
          merma_porcentaje: Math.round(Math.max(0, mermaGlobal) * 100) / 100,
        })
        .eq('id_produccion', id);
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
  const costeTeorico = materiales.reduce(
    (s, m) => s + Number(m.cantidad_teorica || 0) * Number(m.coste_unitario || 0),
    0
  );
  const desviacion = totalMateriales - costeTeorico;

  // ---------- CÁLCULO DE ENVASES ----------
  const capacidadEnvase =
    formatoSel === 'custom' ? (capacidadCustom > 0 ? capacidadCustom : 1) : Number(formatoSel);

  const envasesSugeridos = Math.max(
    1,
    Math.ceil(Number(produccion.cantidad_producida) / capacidadEnvase)
  );

  const numEnvases = Math.min(
    numEnvasesManual > 0 ? numEnvasesManual : envasesSugeridos,
    200
  );

  const formatoLabel = `${capacidadEnvase} ${produccion.unidad_medida}`;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* ============ HEADER ============ */}
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
                  disabled={cambiandoEstado}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🔵 Iniciar producción
                </button>
              )}
              {produccion.estado === 'en_proceso' && (
                <button
                  onClick={() => cambiarEstado('terminada')}
                  disabled={cambiandoEstado}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🟢 Terminar producción
                </button>
              )}
              {produccion.estado !== 'cancelada' && produccion.estado !== 'terminada' && (
                <button
                  onClick={() => cambiarEstado('cancelada')}
                  disabled={cambiandoEstado}
                  className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 font-medium transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium transition-all text-sm flex items-center gap-2"
              >
                🖨️ Imprimir {numEnvases} etiqueta{numEnvases > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ============ COLUMNA IZQUIERDA ============ */}
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
                  <p className="text-xs text-slate-500">Merma real</p>
                  <p className={`text-sm font-semibold ${produccion.merma_porcentaje > 5 ? 'text-red-600' : 'text-orange-700'}`}>
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

            {/* DESPIECE */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
                🧮 Despiece ({materiales.length} ingredientes)
              </h2>
              <p className="text-xs text-slate-400 mb-5">
                ✏️ Edita la <strong>cant. real</strong> al terminar la producción: el coste y la merma se recalculan solos.
              </p>

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
                        <th className="pb-2 pr-4 text-right">Merma</th>
                        <th className="pb-2 pr-4 text-right">Coste ud.</th>
                        <th className="pb-2 text-right">Coste total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materiales.map((m) => {
                        const mermaMat =
                          m.cantidad_teorica > 0
                            ? ((m.cantidad_real - m.cantidad_teorica) / m.cantidad_teorica) * 100
                            : 0;

                        return (
                          <tr key={m.id} className="border-b border-slate-100 last:border-0">
                            <td className="py-2.5 pr-4 font-medium text-slate-800">
                              {m.ingrediente_nombre}
                            </td>
                            <td className="py-2.5 pr-4 text-right text-slate-600">
                              {formatearCantidad(m.cantidad_teorica, m.unidad)}
                            </td>
                            <td className="py-2.5 pr-4 text-right">
                              <input
                                key={`${m.id}-${m.cantidad_real}`}
                                type="number"
                                step="0.01"
                                min="0"
                                defaultValue={m.cantidad_real}
                                onBlur={(e) => guardarCantidadReal(m, Number(e.target.value))}
                                className="w-24 px-2 py-1 border border-slate-300 rounded-lg text-right text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                              />
                            </td>
                            <td
                              className={`py-2.5 pr-4 text-right font-semibold ${
                                mermaMat <= 0
                                  ? 'text-emerald-600'
                                  : mermaMat <= 5
                                  ? 'text-amber-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {mermaMat > 0 ? '+' : ''}
                              {mermaMat.toFixed(1)}%
                            </td>
                            <td className="py-2.5 pr-4 text-right text-slate-600">
                              {m.coste_unitario.toFixed(4)} €
                            </td>
                            <td className="py-2.5 text-right font-semibold text-slate-900">
                              {(m.coste_total || 0).toFixed(2)} €
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200">
                        <td colSpan={5} className="pt-3 text-right font-bold text-slate-700">
                          TOTAL REAL:
                        </td>
                        <td className="pt-3 text-right font-bold text-emerald-700 text-base">
                          {totalMateriales.toFixed(2)} €
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={5} className="text-right text-xs text-slate-500 pt-1">
                          Coste teórico:
                        </td>
                        <td className="text-right text-xs font-semibold text-slate-700 pt-1">
                          {costeTeorico.toFixed(2)} €
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={5} className="text-right text-xs text-slate-500 pt-1">
                          Desviación por merma:
                        </td>
                        <td className={`text-right text-xs font-bold pt-1 ${desviacion > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {desviacion > 0 ? '+' : ''}
                          {desviacion.toFixed(2)} €
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

          {/* ============ COLUMNA DERECHA ============ */}
          <div className="space-y-6">
            {/* ETIQUETAS + ENVASES */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-5">
                🏷️ Etiquetas de trazabilidad
              </h2>

              {/* Vista previa (envase 1) */}
              <div className="flex justify-center">
                <Etiqueta
                  prod={produccion}
                  lote={lote}
                  config={configEtiqueta}
                  envase={{ indice: 1, total: numEnvases, formato: formatoLabel }}
                />
              </div>

              {/* Controles de envasado */}
              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Formato de envase
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={formatoSel}
                      onChange={(e) => {
                        setFormatoSel(e.target.value);
                        setNumEnvasesManual(0);
                      }}
                      className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition bg-white text-slate-700"
                    >
                      {FORMATOS_ENVASE.map((f) => (
                        <option key={f.valor} value={f.valor}>
                          {f.label}
                        </option>
                      ))}
                      <option value="custom">✏️ Personalizado</option>
                    </select>
                    {formatoSel === 'custom' && (
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={capacidadCustom || ''}
                        onChange={(e) => {
                          setCapacidadCustom(Number(e.target.value));
                          setNumEnvasesManual(0);
                        }}
                        placeholder="Cap."
                        className="w-24 px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Nº de envases / etiquetas
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={numEnvases}
                    onChange={(e) => setNumEnvasesManual(Number(e.target.value))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    💡 Tanda de {produccion.cantidad_producida} {produccion.unidad_medida} en envases de{' '}
                    {formatoLabel} → sugerido: <strong>{envasesSugeridos}</strong>
                  </p>
                </div>

                <button
                  onClick={() => window.print()}
                  className="w-full px-4 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium transition-all text-sm"
                >
                  🖨️ Imprimir {numEnvases} etiqueta{numEnvases > 1 ? 's' : ''}
                </button>
              </div>
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
                <div className="flex justify-between">
                  <span className="text-slate-500">Envases etiquetados:</span>
                  <span className="font-bold text-orange-700">{numEnvases}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ============ IMPRESIÓN: N ETIQUETAS NUMERADAS ============ */}
      <div className="hidden print:block p-4">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: numEnvases }).map((_, i) => (
            <div key={i} className="break-inside-avoid">
              <Etiqueta
                prod={produccion}
                lote={lote}
                config={configEtiqueta}
                envase={{ indice: i + 1, total: numEnvases, formato: formatoLabel }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
