'use client';

import { useEffect, useState, useRef } from 'react';
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

interface PlatoME {
  id: string;
  nombre: string;
  nombreTpv: string;
  categoria: string;
  precio: number;
  coste: number;
  margen: number;
  foodCost: number;
  unidades: number;
  popular: boolean;
  rentable: boolean;
  cuadrante: 'estrella' | 'caballo' | 'puzzle' | 'perro';
}

const QUADS = {
  estrella: {
    emoji: '🌟',
    titulo: 'Estrellas',
    accion: 'PROTEGER: no tocar precio ni receta. Máxima visibilidad en carta y en el servicio.',
    color: 'border-emerald-300 bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  caballo: {
    emoji: '🐴',
    titulo: 'Caballos de batalla',
    accion: 'SUBIR PRECIO progresivamente o renegociar coste: venden solas pero dejan poco margen.',
    color: 'border-blue-300 bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  puzzle: {
    emoji: '🧩',
    titulo: 'Puzzles',
    accion: 'POTENCIAR: dejan buen margen pero no salen. Reposicionar en carta, sugerir en sala.',
    color: 'border-amber-300 bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  perro: {
    emoji: '🐕',
    titulo: 'Perros',
    accion: 'DECIDIR: ni venden ni dejan dinero. Rediseñar, rebautizar o eliminar del menú.',
    color: 'border-red-300 bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
};

export default function MenuEngineeringPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [menus, setMenus] = useState<any[]>([]);
  const [menuSel, setMenuSel] = useState<string>('');
  const [imports, setImports] = useState<any[]>([]);
  const [importSel, setImportSel] = useState<string>('');
  const [items, setItems] = useState<PlatoME[]>([]);
  const [sinMatch, setSinMatch] = useState<PlatoME[]>([]);
  const [sinReceta, setSinReceta] = useState<any[]>([]);
  const [umbUds, setUmbUds] = useState(0);
  const [mediaMargen, setMediaMargen] = useState(0);

  const [file, setFile] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const [mRes, iRes] = await Promise.all([
        supabase.from('menus').select('*').order('created_at', { ascending: false }),
        supabase.from('ventas_imports').select('*').order('created_at', { ascending: false }),
      ]);
      setMenus(mRes.data || []);
      setImports(iRes.data || []);
      if (mRes.data && mRes.data.length > 0) setMenuSel(mRes.data[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!menuSel) return;
    const delMenu = imports.filter((i) => i.menu_id === menuSel);
    setImportSel(delMenu[0]?.id || '');
    setResultado(null);
    setError('');
    // eslint-disable-next-line
  }, [menuSel]);

  useEffect(() => {
    if (menuSel) calcular();
    // eslint-disable-next-line
  }, [menuSel, importSel]);

  async function calcular() {
    if (!importSel) {
      setItems([]);
      setSinMatch([]);
      setSinReceta([]);
      return;
    }

    const [mpRes, plRes, recRes, linRes] = await Promise.all([
      supabase.from('menus_platos').select('plato_id').eq('menu_id', menuSel),
      supabase.from('platos').select('*'),
      supabase.from('recetas').select('id, coste_total'),
      supabase.from('ventas_lineas').select('nombre_articulo, unidades').eq('import_id', importSel),
    ]);

    const platoIds = new Set((mpRes.data || []).map((x: any) => x.plato_id));

    const ventasMap = new Map<string, number>();
    (linRes.data || []).forEach((l: any) => {
      ventasMap.set(l.nombre_articulo, (ventasMap.get(l.nombre_articulo) || 0) + Number(l.unidades || 0));
    });
    const nombresVentas = Array.from(ventasMap.keys());

    const conDatos: PlatoME[] = [];
    const sinM: PlatoME[] = [];
    const sinR: any[] = [];

    (plRes.data || [])
      .filter((p: any) => platoIds.has(p.id))
      .forEach((p: any) => {
        const receta = (recRes.data || []).find((r: any) => r.id === p.receta_id);
        if (!receta) {
          sinR.push(p);
          return;
        }

        // Auto-emparejado por similitud de nombre
        let mejor: { n: string; s: number } | null = null;
        for (const n of nombresVentas) {
          const s = sim(p.nombre, n);
          if (s >= 0.6 && (!mejor || s > mejor.s)) mejor = { n, s };
        }

        const precio = Number(p.precio_venta || 0);
        const coste = Number(receta.coste_total || 0);
        const base: PlatoME = {
          id: p.id,
          nombre: p.nombre,
          nombreTpv: mejor?.n || '',
          categoria: p.categoria || '',
          precio,
          coste,
          margen: precio - coste,
          foodCost: precio > 0 ? (coste / precio) * 100 : 0,
          unidades: mejor ? ventasMap.get(mejor.n) || 0 : 0,
          popular: false,
          rentable: false,
          cuadrante: 'perro',
        };

        if (mejor) conDatos.push(base);
        else sinM.push(base);
      });

    if (conDatos.length > 0) {
      const mediaUds = conDatos.reduce((s, i) => s + i.unidades, 0) / conDatos.length;
      const umb = mediaUds * 0.7;
      const mediaMarg = conDatos.reduce((s, i) => s + i.margen, 0) / conDatos.length;

      conDatos.forEach((i) => {
        i.popular = i.unidades >= umb;
        i.rentable = i.margen >= mediaMarg;
        i.cuadrante =
          i.popular && i.rentable ? 'estrella' : i.popular ? 'caballo' : i.rentable ? 'puzzle' : 'perro';
      });

      setUmbUds(umb);
      setMediaMargen(mediaMarg);
    }

    setItems(conDatos.sort((a, b) => b.margen * b.unidades - a.margen * a.unidades));
    setSinMatch(sinM);
    setSinReceta(sinR);
  }

  async function subir() {
    if (!file || !menuSel) return;
    setSubiendo(true);
    setError('');
    setResultado(null);

    try {
      const fd = new FormData();
      fd.append('archivo', file);
      fd.append('menu_id', menuSel);

      const res = await fetch('/api/ventas/importar', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al procesar');

      setResultado(data);
      const { data: iRes } = await supabase
        .from('ventas_imports')
        .select('*')
        .order('created_at', { ascending: false });
      setImports(iRes || []);
      setImportSel(data.import_id);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubiendo(false);
    }
  }

  function sugerencia(i: PlatoME): string {
    const precioObj = i.coste > 0 ? i.coste / 0.3 : 0;
    switch (i.cuadrante) {
      case 'estrella':
        return `💎 Proteger: mantener PVP ${eur(i.precio)} y garantizar stock. Motor de beneficio (${eur(i.margen * i.unidades)} totales).`;
      case 'caballo':
        return `💶 Subir PVP a ${precioObj.toFixed(2)} € (FC objetivo 30%) o renegociar coste. Vende ${i.unidades} uds pero deja ${eur(i.margen)}/ud.`;
      case 'puzzle':
        return `📢 Margen sólido de ${eur(i.margen)}/ud pero solo ${i.unidades} uds. Reposicionar en carta, foto destacada, sugerir en sala.`;
      case 'perro':
        return i.foodCost > 35
          ? `🛠️ FC ${i.foodCost.toFixed(0)}% alto y ${i.unidades} uds: rediseñar receta o ajustar precio antes de eliminar.`
          : `🗑️ ${i.unidades} uds y margen ${eur(i.margen)}/ud: valorar eliminar o rebautizar el plato.`;
    }
  }

  const menuActivo = menus.find((m) => m.id === menuSel);
  const importsDelMenu = imports.filter((i) => i.menu_id === menuSel);
  const importActivo = imports.find((i) => i.id === importSel);

  const maxUds = Math.max(...items.map((i) => i.unidades), 1);
  const maxMargen = Math.max(...items.map((i) => i.margen), 1);
  const pct = (v: number, max: number) => Math.min(95, Math.max(5, (v / max) * 100));
  const eur = (n: number) => n.toFixed(2) + ' €';

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
            <h1 className="text-xl font-bold tracking-tight">🎯 Menu Engineering</h1>
            <p className="text-sm text-slate-500">Elige menú → sube cierre TPV → matriz y sugerencias</p>
          </div>
          <select
            value={menuSel}
            onChange={(e) => setMenuSel(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white font-semibold focus:ring-2 focus:ring-orange-500 outline-none"
          >
            {menus.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* CIERRE TPV */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-amber-200 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <p className="font-bold text-slate-900">📥 Cierre del TPV de "{menuActivo?.nombre || '—'}"</p>
              <p className="text-xs text-slate-500">XLS · XLSX · CSV · TXT · PDF — se guarda por periodo y el emparejado plato↔artículo es automático</p>
            </div>
            {importsDelMenu.length > 0 && (
              <select
                value={importSel}
                onChange={(e) => setImportSel(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
              >
                {importsDelMenu.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.fecha_desde || ''} – {i.fecha_hasta || ''} · {Number(i.total_base || 0).toLocaleString('es-ES', { maximumFractionDigits: 0 })} €
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".xls,.xlsx,.csv,.txt,.pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="flex-1 border-2 border-dashed border-slate-300 rounded-xl p-4 text-center text-sm font-semibold text-slate-700 hover:border-amber-400 hover:bg-amber-50/40 transition"
            >
              {file ? `📄 ${file.name}` : 'Selecciona el reporte de ventas'}
            </button>
            <button
              onClick={subir}
              disabled={!file || subiendo}
              className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-bold text-sm hover:from-amber-700 hover:to-orange-700 disabled:from-slate-300 disabled:to-slate-300 transition flex items-center justify-center gap-2"
            >
              {subiendo ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Importando...
                </>
              ) : (
                <>🚀 Importar</>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
              ❌ {error}
            </div>
          )}

          {resultado && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-[10px] text-slate-500 uppercase">Artículos</p>
                <p className="font-bold">{resultado.lineas_count}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-2">
                <p className="text-[10px] text-blue-700 uppercase">Ventas</p>
                <p className="font-bold text-blue-700">
                  {Number(resultado.totales.base).toLocaleString('es-ES', { maximumFractionDigits: 0 })} €
                </p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-2">
                <p className="text-[10px] text-emerald-700 uppercase">Margen</p>
                <p className="font-bold text-emerald-700">
                  {Number(resultado.totales.margen).toLocaleString('es-ES', { maximumFractionDigits: 0 })} €
                </p>
              </div>
            </div>
          )}
        </div>

        {/* MATRIZ */}
        {!importSel ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <p className="text-4xl mb-3">📥</p>
            <p className="font-semibold text-slate-700">Este menú aún no tiene cierres importados</p>
            <p className="text-sm text-slate-500 mt-1">Sube el primer reporte del TPV para calcular la matriz</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-semibold">Umbral popularidad</p>
                <p className="text-2xl font-bold mt-1">{umbUds.toFixed(0)} uds</p>
                <p className="text-[11px] text-slate-400">70% de la media vendida en este periodo</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-semibold">Umbral rentabilidad</p>
                <p className="text-2xl font-bold mt-1">{eur(mediaMargen)}</p>
                <p className="text-[11px] text-slate-400">margen medio real por plato (escandallo vivo)</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
                📈 Matriz (X = unidades · Y = margen real) · {importActivo?.fecha_desde || ''} – {importActivo?.fecha_hasta || ''}
              </h2>
              <div className="relative h-96 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                <div className="absolute top-0 bottom-0 border-l-2 border-dashed border-slate-400" style={{ left: `${pct(umbUds, maxUds)}%` }}></div>
                <div className="absolute left-0 right-0 border-t-2 border-dashed border-slate-400" style={{ bottom: `${pct(mediaMargen, maxMargen)}%` }}></div>

                <span className="absolute top-2 right-3 text-xs font-bold text-amber-600">🧩 PUZZLE</span>
                <span className="absolute top-2 left-3 text-xs font-bold text-red-500">🐕 PERRO</span>
                <span className="absolute bottom-2 right-3 text-xs font-bold text-emerald-600">🌟 ESTRELLA</span>
                <span className="absolute bottom-2 left-3 text-xs font-bold text-blue-600">🐴 CABALLO</span>

                {items.map((i) => (
                  <div
                    key={i.id}
                    title={`${i.nombre} ↔ ${i.nombreTpv} · ${i.unidades} uds · margen ${i.margen.toFixed(2)} €`}
                    className={`absolute w-5 h-5 rounded-full ${QUADS[i.cuadrante].dot} border-2 border-white shadow cursor-pointer hover:scale-150 transition-transform`}
                    style={{
                      left: `calc(${pct(i.unidades, maxUds)}% - 10px)`,
                      bottom: `calc(${pct(i.margen, maxMargen)}% - 10px)`,
                    }}
                  ></div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(Object.keys(QUADS) as Array<keyof typeof QUADS>).map((q) => {
                const cfg = QUADS[q];
                const delQuad = items.filter((i) => i.cuadrante === q);
                return (
                  <div key={q} className={`rounded-2xl border-2 p-5 ${cfg.color}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{cfg.emoji}</span>
                      <h3 className={`font-bold ${cfg.text}`}>{cfg.titulo}</h3>
                      <span className="ml-auto text-sm font-bold text-slate-500">{delQuad.length}</span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium mb-3">{cfg.accion}</p>
                    {delQuad.length === 0 ? (
                      <p className="text-xs text-slate-400">Sin platos en este cuadrante</p>
                    ) : (
                      <div className="space-y-2">
                        {delQuad.map((i) => (
                          <div key={i.id} className="bg-white rounded-xl px-3 py-2 shadow-sm">
                            <div className="flex justify-between items-center">
                              <p className="font-semibold text-sm text-slate-800">{i.nombre}</p>
                              <p className={`text-sm font-bold ${cfg.text}`}>
                                {(i.margen * i.unidades).toLocaleString('es-ES', { maximumFractionDigits: 0 })} €
                              </p>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              ↔ {i.nombreTpv} · {i.unidades} uds · margen {eur(i.margen)} · FC{' '}
                              <span className={i.foodCost > 35 ? 'text-red-600 font-bold' : ''}>{i.foodCost.toFixed(0)}%</span> · PVP {eur(i.precio)}
                            </p>
                            <p className={`text-[11px] mt-1 font-semibold ${cfg.text}`}>{sugerencia(i)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {(sinMatch.length > 0 || sinReceta.length > 0) && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-sm text-amber-800 space-y-1">
                {sinMatch.map((p) => (
                  <p key={p.id}>
                    ⚠️ <strong>{p.nombre}</strong>: sin artículo equivalente en este cierre (¿no se vende en este outlet?).
                  </p>
                ))}
                {sinReceta.map((p: any) => (
                  <p key={p.id}>
                    ⚠️ <strong>{p.nombre}</strong>: sin receta vinculada → sin coste real.
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
