'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const STOP = new Set(['DE', 'LA', 'EL', 'Y', 'CON', 'EN', 'DEL', 'LOS', 'LAS', 'AL', 'UD', 'UDS', 'UN', 'UNA', 'GR', 'KG', 'A', 'E', 'O']);

function tokens(s: string) {
  return new Set(
    s
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOP.has(t))
  );
}

function sim(a: string, b: string) {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  ta.forEach((t) => {
    if (tb.has(t)) inter++;
  });
  return inter / Math.min(ta.size, tb.size);
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function mesLabel(fecha: string) {
  if (!fecha) return '—';
  const p = fecha.split('/');
  if (p.length !== 3) return fecha;
  return `${MESES[parseInt(p[1], 10) - 1]} ${p[2]}`;
}

const eur = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' €';
const eur2 = (n: number) => n.toFixed(2) + ' €';

const QUAD_LABEL: any = {
  estrella: '🌟 Estrella',
  caballo: '🐴 Caballo',
  puzzle: '🧩 Puzzle',
  perro: '🐕 Perro',
};

export default function InformesPage() {
  const router = useRouter();
  const [menus, setMenus] = useState<any[]>([]);
  const [menuSel, setMenuSel] = useState('all');
  const [imports, setImports] = useState<any[]>([]);
  const [periodSel, setPeriodSel] = useState('all');
  const [platosBase, setPlatosBase] = useState<any[]>([]);
  const [lineas, setLineas] = useState<any[]>([]);
  const [importsRel, setImportsRel] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [mRes, iRes] = await Promise.all([
        supabase.from('menus').select('*').order('created_at', { ascending: false }),
        supabase.from('ventas_imports').select('*').order('created_at', { ascending: false }),
      ]);
      setMenus(mRes.data || []);
      setImports(iRes.data || []);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const rel = (menuSel === 'all' ? imports : imports.filter((i) => i.menu_id === menuSel))
        .slice()
        .sort((a, b) => String(a.fecha_desde || '').localeCompare(String(b.fecha_desde || '')));
      setImportsRel(rel);
      setPeriodSel((prev) => (prev !== 'all' && !rel.some((r) => r.id === prev) ? 'all' : prev));

      const ids = rel.map((i) => i.id);
      if (ids.length === 0) {
        setPlatosBase([]);
        setLineas([]);
        setLoading(false);
        return;
      }

      const [plRes, recRes, linRes, mpRes] = await Promise.all([
        supabase.from('platos').select('*'),
        supabase.from('recetas').select('id, coste_total'),
        supabase.from('ventas_lineas').select('import_id, nombre_articulo, unidades').in('import_id', ids),
        menuSel === 'all'
          ? Promise.resolve({ data: null })
          : supabase.from('menus_platos').select('plato_id').eq('menu_id', menuSel),
      ]);

      let platos = (plRes.data || [])
        .map((p: any) => ({
          plato: p,
          receta: (recRes.data || []).find((r: any) => r.id === p.receta_id) || null,
        }))
        .filter((x: any) => x.receta);

      if (menuSel !== 'all') {
        const pids = new Set((mpRes.data || []).map((x: any) => x.plato_id));
        platos = platos.filter((x: any) => pids.has(x.plato.id));
      }

      setPlatosBase(platos);
      setLineas(linRes.data || []);
      setLoading(false);
    })();
  }, [menuSel, imports]);

  function matchDe(importId: string) {
    const mapa = new Map<string, number>();
    lineas
      .filter((l) => l.import_id === importId)
      .forEach((l) => {
        mapa.set(l.nombre_articulo, (mapa.get(l.nombre_articulo) || 0) + Number(l.unidades || 0));
      });
    const nombres = Array.from(mapa.keys());

    return platosBase.map(({ plato, receta }: any) => {
      let mejor: { n: string; s: number } | null = null;
      for (const n of nombres) {
        const s = sim(plato.nombre, n);
        if (s >= 0.6 && (!mejor || s > mejor.s)) mejor = { n, s };
      }
      const uds = mejor ? mapa.get(mejor.n) || 0 : 0;
      const precio = Number(plato.precio_venta || 0);
      const coste = Number(receta.coste_total || 0);
      return {
        id: plato.id,
        nombre: plato.nombre,
        nombreTpv: mejor?.n || '',
        matched: !!mejor,
        precio,
        coste,
        uds,
        margenUd: precio - coste,
        fc: precio > 0 ? (coste / precio) * 100 : 0,
      };
    });
  }

  function filasAnalisis() {
    if (periodSel !== 'all') return matchDe(periodSel).filter((x) => x.matched && x.uds > 0);

    const acc = new Map<string, any>();
    for (const imp of importsRel) {
      for (const r of matchDe(imp.id)) {
        const a = acc.get(r.id) || { ...r, uds: 0 };
        a.uds += r.uds;
        a.matched = a.matched || r.matched;
        a.nombreTpv = a.nombreTpv || r.nombreTpv;
        acc.set(r.id, a);
      }
    }
    return Array.from(acc.values()).filter((x) => x.matched && x.uds > 0);
  }

  const filas = filasAnalisis().map((x) => ({
    ...x,
    ventas: x.uds * x.precio,
    costeReal: x.uds * x.coste,
    margenTotal: x.uds * (x.precio - x.coste),
  }));

  const mediaUds = filas.length ? filas.reduce((s, x) => s + x.uds, 0) / filas.length : 0;
  const umbUds = mediaUds * 0.7;
  const mediaMarg = filas.length ? filas.reduce((s, x) => s + x.margenUd, 0) / filas.length : 0;

  // ============ REGLA F&B: estrella exige FC ≤ 30% ============
  const conQuad = filas.map((x) => ({
    ...x,
    cuadrante:
      x.uds >= umbUds && x.margenUd >= mediaMarg && x.fc <= 30
        ? 'estrella'
        : x.uds >= umbUds
        ? 'caballo'
        : x.margenUd >= mediaMarg
        ? 'puzzle'
        : 'perro',
  }));

  const kpi = {
    ventas: filas.reduce((s, x) => s + x.ventas, 0),
    coste: filas.reduce((s, x) => s + x.costeReal, 0),
    uds: filas.reduce((s, x) => s + x.uds, 0),
  };
  const margen = kpi.ventas - kpi.coste;
  const fc = kpi.ventas > 0 ? (kpi.coste / kpi.ventas) * 100 : 0;

  const topMargen = [...conQuad].sort((a, b) => b.margenTotal - a.margenTotal).slice(0, 5);
  const topUds = [...conQuad].sort((a, b) => b.uds - a.uds).slice(0, 5);
  const bottom = [...conQuad].sort((a, b) => a.margenTotal - b.margenTotal).slice(0, 3);

  const medidas: any[] = [];
  let potencial = 0;

  conQuad.filter((x) => x.cuadrante === 'caballo').forEach((x) => {
    const pObj = x.coste + mediaMarg;
    if (pObj > x.precio) {
      const extra = (pObj - x.precio) * x.uds;
      potencial += extra;
      medidas.push({ emoji: '💶', color: 'text-blue-700 bg-blue-50 border-blue-200', texto: `Subir ${x.nombre} de ${eur2(x.precio)} a ${pObj.toFixed(2)} € (igualar margen medio)`, impacto: `+${eur(extra)}` });
    }
  });
  conQuad.filter((x) => x.cuadrante === 'puzzle').forEach((x) => {
    medidas.push({ emoji: '📢', color: 'text-amber-700 bg-amber-50 border-amber-200', texto: `Potenciar ${x.nombre}: deja ${eur2(x.margenUd)}/ud pero solo ${x.uds} uds → reposicionar en carta y sugerir en sala`, impacto: `hasta +${eur(x.margenUd * Math.max(0, mediaUds - x.uds))}` });
  });
  conQuad.filter((x) => x.cuadrante === 'perro').forEach((x) => {
    medidas.push({ emoji: '🗑️', color: 'text-red-700 bg-red-50 border-red-200', texto: `Decidir sobre ${x.nombre}: ${x.uds} uds y ${eur2(x.margenUd)}/ud → rediseñar, rebautizar o eliminar`, impacto: 'libera carta' });
  });
  conQuad.filter((x) => x.cuadrante === 'estrella').forEach((x) => {
    medidas.push({ emoji: '💎', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', texto: `Proteger ${x.nombre}: no tocar precio ni receta, garantizar stock`, impacto: `${eur(x.margenTotal)} en juego` });
  });

  const porPeriodo = importsRel.map((imp) => ({ imp, rows: matchDe(imp.id) }));
  const topEst = [...filas].sort((a, b) => b.uds - a.uds).slice(0, 6);

  const etiquetaPeriodo =
    periodSel === 'all'
      ? 'Todos los periodos'
      : mesLabel(imports.find((i) => i.id === periodSel)?.fecha_desde || '');

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => router.push('/ventas')}
            className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition"
          >
            <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold tracking-tight">📊 Informes de Menu Engineering</h1>
            <p className="text-sm text-slate-500">Estrategia por menú y periodo</p>
          </div>
          <select
            value={menuSel}
            onChange={(e) => setMenuSel(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">Todos los menús</option>
            {menus.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
          <select
            value={periodSel}
            onChange={(e) => setPeriodSel(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">📅 Todos los periodos</option>
            {importsRel.map((i) => (
              <option key={i.id} value={i.id}>
                {mesLabel(i.fecha_desde || '')}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600"></div>
          </div>
        ) : importsRel.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <p className="text-4xl mb-3">📥</p>
            <p className="font-semibold text-slate-700">Sin cierres importados para este menú</p>
            <p className="text-sm text-slate-500 mt-1">Sube reportes desde Menu Engineering para generar informes</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
                💰 Rentabilidad · {etiquetaPeriodo}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-blue-50 rounded-xl border border-blue-200 p-3 text-center">
                  <p className="text-[10px] text-blue-700 uppercase font-semibold">Ventas menú</p>
                  <p className="text-xl font-bold text-blue-700">{eur(kpi.ventas)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Unidades</p>
                  <p className="text-xl font-bold">{kpi.uds}</p>
                </div>
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Coste real</p>
                  <p className="text-xl font-bold">{eur(kpi.coste)}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3 text-center">
                  <p className="text-[10px] text-emerald-700 uppercase font-semibold">Margen</p>
                  <p className="text-xl font-bold text-emerald-700">{eur(margen)}</p>
                </div>
                <div className={`rounded-xl border-2 p-3 text-center ${fc <= 30 ? 'bg-emerald-50 border-emerald-300' : fc <= 35 ? 'bg-amber-50 border-amber-300' : 'bg-red-50 border-red-300'}`}>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Food Cost</p>
                  <p className={`text-xl font-bold ${fc <= 30 ? 'text-emerald-700' : fc <= 35 ? 'text-amber-700' : 'text-red-700'}`}>
                    {fc.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">🏆 Top 5 por margen</h2>
                <div className="space-y-2">
                  {topMargen.map((x, i) => (
                    <div key={x.id} className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{x.nombre}</p>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(x.margenTotal / (topMargen[0]?.margenTotal || 1)) * 100}%` }}></div>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-emerald-700 shrink-0">{eur(x.margenTotal)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">🔥 Top 5 más vendidos</h2>
                <div className="space-y-2">
                  {topUds.map((x, i) => (
                    <div key={x.id} className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {x.nombre} <span className="text-[10px] text-slate-400">{QUAD_LABEL[x.cuadrante]}</span>
                        </p>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(x.uds / (topUds[0]?.uds || 1)) * 100}%` }}></div>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-blue-700 shrink-0">{x.uds} uds</p>
                    </div>
                  ))}
                </div>
                {bottom.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-2">⚠️ Cola del menú</p>
                    {bottom.map((x) => (
                      <p key={x.id} className="text-xs text-slate-600">
                        {x.nombre} · {x.uds} uds · {eur(x.margenTotal)} · {QUAD_LABEL[x.cuadrante]}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">🎯 Matriz · {etiquetaPeriodo}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(['estrella', 'caballo', 'puzzle', 'perro'] as const).map((q) => {
                  const del = conQuad.filter((x) => x.cuadrante === q);
                  return (
                    <div key={q} className="bg-slate-50 rounded-xl border border-slate-200 p-3 text-center">
                      <p className="text-sm font-bold">{QUAD_LABEL[q]}</p>
                      <p className="text-2xl font-bold mt-1">{del.length}</p>
                      <p className="text-[10px] text-slate-500 truncate">{del.map((x) => x.nombre).join(' · ') || '—'}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-900 p-6">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">📋 Medidas a tomar</h2>
                {potencial > 0 && (
                  <span className="ml-auto px-3 py-1.5 bg-emerald-600 text-white rounded-full text-xs font-bold">
                    Potencial: +{eur(potencial)}/periodo
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {medidas.map((m, i) => (
                  <div key={i} className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 ${m.color}`}>
                    <span className="text-lg">{m.emoji}</span>
                    <p className="flex-1 text-sm font-medium">{m.texto}</p>
                    <p className="text-xs font-bold shrink-0">{m.impacto}</p>
                  </div>
                ))}
                {medidas.length === 0 && <p className="text-sm text-slate-400">Sin medidas para este filtro.</p>}
              </div>
            </div>

            {importsRel.length >= 2 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 overflow-x-auto">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">📅 Evolución por meses (unidades vendidas)</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-200">
                      <th className="py-2 pr-3">Plato</th>
                      {porPeriodo.map(({ imp }) => (
                        <th key={imp.id} className={`py-2 px-3 text-right ${periodSel === imp.id ? 'text-blue-700' : ''}`}>
                          {mesLabel(imp.fecha_desde || '')}
                        </th>
                      ))}
                      <th className="py-2 pl-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topEst.map((x) => {
                      const total = x.uds;
                      return (
                        <tr key={x.id} className="border-b border-slate-100 last:border-0">
                          <td className="py-2 pr-3 font-semibold">{x.nombre}</td>
                          {porPeriodo.map(({ imp, rows }) => {
                            const r = rows.find((y) => y.id === x.id);
                            return (
                              <td key={imp.id} className={`py-2 px-3 text-right font-semibold ${periodSel === imp.id ? 'text-blue-700' : 'text-slate-700'}`}>
                                {r?.matched ? r.uds : '—'}
                              </td>
                            );
                          })}
                          <td className="py-2 pl-3 text-right font-bold text-slate-900">{total}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="text-[11px] text-slate-400 mt-3">
                  Importa un cierre cada mes y esta tabla mostrará la estacionalidad: qué platos suben en verano, cuáles caen en invierno.
                </p>
              </div>
            ) : (
              <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 text-sm text-slate-500">
                📅 Con un solo periodo importado aún no hay evolución. Importa el cierre de agosto y verás la comparativa mes a mes.
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
