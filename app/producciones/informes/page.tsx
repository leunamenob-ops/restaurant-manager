'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

interface ProdInforme {
  id_produccion: string;
  nombre: string;
  fecha_produccion: string;
  cantidad_producida: number;
  unidad_medida: string;
  coste_real: number;
  merma_porcentaje: number;
  estado: string;
  costeTeorico: number;
  desviacion: number;
  appcc: string | null;
}

export default function InformesPage() {
  const router = useRouter();

  const [desde, setDesde] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [hasta, setHasta] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  const [rows, setRows] = useState<ProdInforme[]>([]);
  const [topMerma, setTopMerma] = useState<any[]>([]);
  const [topProductos, setTopProductos] = useState<any[]>([]);

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function preset(dias: number | 'mes' | 'mesAnterior') {
    const hoy = new Date();
    let d: Date, h: Date;

    if (dias === 'mes') {
      d = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      h = hoy;
    } else if (dias === 'mesAnterior') {
      d = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      h = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    } else {
      d = new Date(hoy);
      d.setDate(hoy.getDate() - dias);
      h = hoy;
    }

    const ds = d.toISOString().slice(0, 10);
    const hs = h.toISOString().slice(0, 10);
    setDesde(ds);
    setHasta(hs);
    cargarConFechas(ds, hs);
  }

  async function cargar() {
    cargarConFechas(desde, hasta);
  }

  async function cargarConFechas(ds: string, hs: string) {
    setLoading(true);

    const desdeISO = new Date(ds + 'T00:00:00').toISOString();
    const hastaISO = new Date(hs + 'T23:59:59').toISOString();

    const { data: prods } = await supabase
      .from('producciones')
      .select('*')
      .gte('fecha_produccion', desdeISO)
      .lte('fecha_produccion', hastaISO)
      .order('fecha_produccion', { ascending: false });

    const lista = prods || [];
    const ids = lista.map((p: any) => p.id_produccion);

    let mats: any[] = [];
    let controles: any[] = [];

    if (ids.length > 0) {
      const [matsRes, contRes] = await Promise.all([
        supabase.from('produccion_materiales').select('*').in('produccion_id', ids),
        supabase
          .from('control_calidad_produccion')
          .select('produccion_id, resultado')
          .in('produccion_id', ids),
      ]);
      mats = matsRes.data || [];
      controles = contRes.data || [];
    }

    const controlMap = new Map<string, string>();
    controles.forEach((c: any) => controlMap.set(c.produccion_id, c.resultado));

    // Filas por producción
    const filas: ProdInforme[] = lista.map((p: any) => {
      const susMats = mats.filter((m) => m.produccion_id === p.id_produccion);
      const costeTeorico = susMats.reduce(
        (s, m) => s + Number(m.cantidad_teorica || 0) * Number(m.coste_unitario || 0),
        0
      );
      const costeReal = susMats.reduce((s, m) => s + Number(m.coste_total || 0), 0);

      return {
        id_produccion: p.id_produccion,
        nombre: p.nombre,
        fecha_produccion: p.fecha_produccion,
        cantidad_producida: p.cantidad_producida,
        unidad_medida: p.unidad_medida,
        coste_real: costeReal || Number(p.coste_real || 0),
        merma_porcentaje: Number(p.merma_porcentaje || 0),
        estado: p.estado,
        costeTeorico,
        desviacion: (costeReal || Number(p.coste_real || 0)) - costeTeorico,
        appcc: controlMap.get(p.id_produccion) || null,
      };
    });

    setRows(filas);

    // Top ingredientes por coste de merma
    const mermaMap = new Map<string, { extra: number; veces: number }>();
    mats.forEach((m: any) => {
      const extra =
        Number(m.coste_total || 0) -
        Number(m.cantidad_teorica || 0) * Number(m.coste_unitario || 0);
      if (extra > 0.001) {
        const actual = mermaMap.get(m.ingrediente_nombre) || { extra: 0, veces: 0 };
        actual.extra += extra;
        actual.veces += 1;
        mermaMap.set(m.ingrediente_nombre, actual);
      }
    });

    setTopMerma(
      Array.from(mermaMap.entries())
        .map(([nombre, d]) => ({ nombre, ...d }))
        .sort((a, b) => b.extra - a.extra)
        .slice(0, 5)
    );

    // Top productos por coste
    const prodMap = new Map<string, { coste: number; veces: number }>();
    filas.forEach((f) => {
      const actual = prodMap.get(f.nombre) || { coste: 0, veces: 0 };
      actual.coste += f.coste_real;
      actual.veces += 1;
      prodMap.set(f.nombre, actual);
    });

    setTopProductos(
      Array.from(prodMap.entries())
        .map(([nombre, d]) => ({ nombre, ...d }))
        .sort((a, b) => b.coste - a.coste)
        .slice(0, 5)
    );

    setLoading(false);
  }

  // KPIs
  const totalReal = rows.reduce((s, r) => s + r.coste_real, 0);
  const totalTeorico = rows.reduce((s, r) => s + r.costeTeorico, 0);
  const desviacionTotal = totalReal - totalTeorico;
  const mermaMedia =
    rows.length > 0 ? rows.reduce((s, r) => s + r.merma_porcentaje, 0) / rows.length : 0;
  const conAppcc = rows.filter((r) => r.appcc);
  const pctConforme =
    conAppcc.length > 0
      ? (conAppcc.filter((r) => r.appcc === 'conforme').length / conAppcc.length) * 100
      : null;

  const maxProducto = topProductos.length > 0 ? topProductos[0].coste : 1;

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
                  📊 Informes de Producción
                </h1>
                <p className="text-sm text-slate-500">
                  Costes, mermas y calidad del periodo
                </p>
              </div>
            </div>
          </div>

          {/* Filtros de periodo */}
          <div className="flex flex-wrap items-end gap-3 mt-4">
            <div className="flex gap-2">
              <button onClick={() => preset(7)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition">
                7 días
              </button>
              <button onClick={() => preset('mes')} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition">
                Este mes
              </button>
              <button onClick={() => preset('mesAnterior')} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition">
                Mes anterior
              </button>
            </div>
            <div className="flex items-end gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Desde</label>
                <input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Hasta</label>
                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <button
                onClick={cargar}
                className="px-4 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-bold hover:bg-orange-700 transition"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-200 border-t-orange-600 mb-3"></div>
            <p className="text-slate-600 font-medium">Calculando informe...</p>
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Producciones</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{rows.length}</p>
              </div>
              <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-sm">
                <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">Coste real</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{totalReal.toFixed(2)} €</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Coste teórico</p>
                <p className="text-2xl font-bold text-slate-700 mt-1">{totalTeorico.toFixed(2)} €</p>
              </div>
              <div className={`rounded-xl border p-4 shadow-sm ${desviacionTotal > 0.01 ? 'bg-red-50 border-red-300' : 'bg-white border-slate-200'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${desviacionTotal > 0.01 ? 'text-red-700' : 'text-slate-500'}`}>
                  Desviación
                </p>
                <p className={`text-2xl font-bold mt-1 ${desviacionTotal > 0.01 ? 'text-red-700' : 'text-emerald-600'}`}>
                  {desviacionTotal > 0 ? '+' : ''}{desviacionTotal.toFixed(2)} €
                </p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Merma media</p>
                <p className={`text-2xl font-bold mt-1 ${mermaMedia > 5 ? 'text-red-600' : 'text-orange-600'}`}>
                  {mermaMedia.toFixed(1)}%
                </p>
                {pctConforme !== null && (
                  <p className="text-[11px] text-teal-700 mt-1">
                    🧪 APPCC: {pctConforme.toFixed(0)}% conforme
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* TOP PRODUCTOS POR COSTE */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-5">
                  💰 Top productos por coste
                </h2>
                {topProductos.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">Sin datos en el periodo</p>
                ) : (
                  <div className="space-y-3">
                    {topProductos.map((p) => (
                      <div key={p.nombre}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-800">
                            {p.nombre} <span className="text-slate-400">×{p.veces}</span>
                          </span>
                          <span className="font-bold text-slate-900">{p.coste.toFixed(2)} €</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                            style={{ width: `${(p.coste / maxProducto) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* TOP MERMA POR INGREDIENTE */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-5">
                  🗑️ Dónde pierdes dinero (merma por ingrediente)
                </h2>
                {topMerma.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">
                    ✅ Sin mermas relevantes en el periodo
                  </p>
                ) : (
                  <div className="space-y-2">
                    {topMerma.map((m, i) => (
                      <div key={m.nombre} className="flex justify-between items-center bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">
                        <span className="font-semibold text-slate-800">
                          {i + 1}. {m.nombre}
                          <span className="text-slate-400 text-xs ml-2">({m.veces} producciones)</span>
                        </span>
                        <span className="font-bold text-red-700">+{m.extra.toFixed(2)} €</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* HISTÓRICO */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-slate-900 text-white">
                <h2 className="font-bold">Histórico del periodo</h2>
                <p className="text-xs text-slate-400 mt-1">{rows.length} producciones</p>
              </div>
              {rows.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-10">
                  No hay producciones en el periodo seleccionado
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50">
                        <th className="px-6 py-2.5">Fecha</th>
                        <th className="px-3 py-2.5">Producto</th>
                        <th className="px-3 py-2.5 text-right">Cant.</th>
                        <th className="px-3 py-2.5 text-right">Teórico</th>
                        <th className="px-3 py-2.5 text-right">Real</th>
                        <th className="px-3 py-2.5 text-right">Desv.</th>
                        <th className="px-3 py-2.5 text-right">Merma</th>
                        <th className="px-3 py-2.5 text-center">APPCC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr
                          key={r.id_produccion}
                          onClick={() => router.push(`/producciones/${r.id_produccion}`)}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition"
                        >
                          <td className="px-6 py-2.5 text-slate-600">
                            {new Date(r.fecha_produccion).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                            })}
                          </td>
                          <td className="px-3 py-2.5 font-semibold text-slate-800">{r.nombre}</td>
                          <td className="px-3 py-2.5 text-right text-slate-600">
                            {r.cantidad_producida} {r.unidad_medida}
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-600">{r.costeTeorico.toFixed(2)} €</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-slate-900">{r.coste_real.toFixed(2)} €</td>
                          <td className={`px-3 py-2.5 text-right font-semibold ${r.desviacion > 0.01 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {r.desviacion > 0 ? '+' : ''}{r.desviacion.toFixed(2)} €
                          </td>
                          <td className={`px-3 py-2.5 text-right font-semibold ${r.merma_porcentaje > 5 ? 'text-red-600' : 'text-orange-600'}`}>
                            {r.merma_porcentaje}%
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {r.appcc === null ? (
                              <span className="text-slate-300">—</span>
                            ) : r.appcc === 'conforme' ? (
                              <span className="text-emerald-600 font-bold">✅</span>
                            ) : (
                              <span className="text-red-600 font-bold">🚫</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
