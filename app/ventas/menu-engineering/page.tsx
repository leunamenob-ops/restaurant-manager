'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

interface PlatoME {
  id: string;
  nombre: string;
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
    accion: 'SUBIR PRECIO progresivamente (+0,50/1€) o renegociar coste: venden solas pero dejan poco margen.',
    color: 'border-blue-300 bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  puzzle: {
    emoji: '🧩',
    titulo: 'Puzzles',
    accion: 'POTENCIAR: dejan buen margen pero no salen. Reposicionar en carta, sugerir en sala, promocionar.',
    color: 'border-amber-300 bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  perro: {
    emoji: '🐕',
    titulo: 'Perros',
    accion: 'DECIDIR: ni venden ni dejan dinero. Rediseñar la receta, rebautizar o eliminar del menú.',
    color: 'border-red-300 bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
};

export default function MenuEngineeringPage() {
  const router = useRouter();
  const [imports, setImports] = useState<any[]>([]);
  const [importSel, setImportSel] = useState<string>('');
  const [items, setItems] = useState<PlatoME[]>([]);
  const [sinVentas, setSinVentas] = useState<PlatoME[]>([]);
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [umbUds, setUmbUds] = useState(0);
  const [mediaMargen, setMediaMargen] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('ventas_imports')
        .select('*')
        .order('created_at', { ascending: false });
      setImports(data || []);
      if (data && data.length > 0) setImportSel(data[0].id);
    })();
  }, []);

  useEffect(() => {
    if (importSel) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importSel]);

  async function cargar() {
    setLoading(true);

    const [plRes, recRes, linRes, alRes] = await Promise.all([
      supabase.from('platos').select('*'),
      supabase.from('recetas').select('id, coste_total'),
      supabase.from('ventas_lineas').select('nombre_articulo, unidades').eq('import_id', importSel),
      supabase.from('platos_tpv').select('plato_id, nombre_tpv'),
    ]);

    const ventasMap = new Map<string, number>();
    (linRes.data || []).forEach((l: any) => {
      ventasMap.set(
        l.nombre_articulo,
        (ventasMap.get(l.nombre_articulo) || 0) + Number(l.unidades || 0)
      );
    });

    const aliasMap = new Map<string, string[]>();
    (alRes.data || []).forEach((a: any) => {
      const arr = aliasMap.get(a.plato_id) || [];
      arr.push(a.nombre_tpv);
      aliasMap.set(a.plato_id, arr);
    });

    const conDatos: PlatoME[] = [];
    const sinV: PlatoME[] = [];
    const pend: any[] = [];

    (plRes.data || []).forEach((p: any) => {
      const receta = (recRes.data || []).find((r: any) => r.id === p.receta_id);

      if (!receta) {
        pend.push(p);
        return;
      }

      const nombres = aliasMap.get(p.id) || (p.nombre_tpv ? [p.nombre_tpv] : []);
      const unidades = nombres.reduce((s, n) => s + (ventasMap.get(n) || 0), 0);

      const precio = Number(p.precio_venta || 0);
      const coste = Number(receta.coste_total || 0);
      const base: PlatoME = {
        id: p.id,
        nombre: p.nombre,
        categoria: p.categoria || '',
        precio,
        coste,
        margen: precio - coste,
        foodCost: precio > 0 ? (coste / precio) * 100 : 0,
        unidades,
        popular: false,
        rentable: false,
        cuadrante: 'perro',
      };

      if (unidades > 0) conDatos.push(base);
      else sinV.push(base);
    });

    if (conDatos.length > 0) {
      const mediaUds = conDatos.reduce((s, i) => s + i.unidades, 0) / conDatos.length;
      const umb = mediaUds * 0.7;
      const mediaMarg = conDatos.reduce((s, i) => s + i.margen, 0) / conDatos.length;

      conDatos.forEach((i) => {
        i.popular = i.unidades >= umb;
        i.rentable = i.margen >= mediaMarg;
        i.cuadrante =
          i.popular && i.rentable
            ? 'estrella'
            : i.popular
            ? 'caballo'
            : i.rentable
            ? 'puzzle'
            : 'perro';
      });

      setUmbUds(umb);
      setMediaMargen(mediaMarg);
    }

    setItems(conDatos.sort((a, b) => b.margen * b.unidades - a.margen * a.unidades));
    setSinVentas(sinV);
    setPendientes(pend);
    setLoading(false);
  }

  const importActivo = imports.find((i) => i.id === importSel);
  const maxUds = Math.max(...items.map((i) => i.unidades), 1);
  const maxMargen = Math.max(...items.map((i) => i.margen), 1);
  const pct = (v: number, max: number) => Math.min(95, Math.max(5, (v / max) * 100));
  const eur = (n: number) => n.toFixed(2) + ' €';

  function sugerencia(i: PlatoME): string {
    const precioObj = i.coste > 0 ? i.coste / 0.3 : 0;
    switch (i.cuadrante) {
      case 'estrella':
        return `💎 Proteger: mantener PVP ${eur(i.precio)} y garantizar stock. Motor de beneficio (${eur(i.margen * i.unidades)} totales).`;
      case 'caballo':
        return `💶 Subir PVP a ${precioObj.toFixed(2)} € (FC objetivo 30%) o renegociar coste. Vende ${i.unidades} uds pero deja solo ${eur(i.margen)}/ud.`;
      case 'puzzle':
        return `📢 Margen sólido de ${eur(i.margen)}/ud pero solo ${i.unidades} uds. Reposicionar en carta, foto destacada, sugerir en sala.`;
      case 'perro':
        return i.foodCost > 35
          ? `🛠️ FC ${i.foodCost.toFixed(0)}% alto y ${i.unidades} uds: rediseñar receta o ajustar precio antes de eliminar.`
          : `🗑️ ${i.unidades} uds y margen ${eur(i.margen)}/ud: valorar eliminar o rebautizar el plato.`;
    }
  }

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
            <p className="text-sm text-slate-500 truncate">
              {importActivo
                ? `${importActivo.punto_venta || importActivo.nombre_archivo} · ${importActivo.fecha_desde || ''} – ${importActivo.fecha_hasta || ''}`
                : 'Popularidad TPV × Rentabilidad de escandallo'}
            </p>
          </div>
          <select
            value={importSel}
            onChange={(e) => setImportSel(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white font-semibold focus:ring-2 focus:ring-orange-500 outline-none"
          >
            {imports.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nombre_archivo}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-200 border-t-orange-600"></div>
          </div>
        ) : (
          <>
            {/* Umbrales */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-semibold">Umbral popularidad</p>
                <p className="text-2xl font-bold mt-1">{umbUds.toFixed(0)} uds</p>
                <p className="text-[11px] text-slate-400">70% de la media vendida en este outlet</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-semibold">Umbral rentabilidad</p>
                <p className="text-2xl font-bold mt-1">{eur(mediaMargen)}</p>
                <p className="text-[11px] text-slate-400">margen medio real por plato</p>
              </div>
            </div>

            {/* MATRIZ */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
                📈 Matriz (X = unidades vendidas · Y = margen real por plato)
              </h2>
              <div className="relative h-96 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 border-l-2 border-dashed border-slate-400"
                  style={{ left: `${pct(umbUds, maxUds)}%` }}
                ></div>
                <div
                  className="absolute left-0 right-0 border-t-2 border-dashed border-slate-400"
                  style={{ bottom: `${pct(mediaMargen, maxMargen)}%` }}
                ></div>

                <span className="absolute top-2 right-3 text-xs font-bold text-amber-600">🧩 PUZZLE</span>
                <span className="absolute top-2 left-3 text-xs font-bold text-red-500">🐕 PERRO</span>
                <span className="absolute bottom-2 right-3 text-xs font-bold text-emerald-600">🌟 ESTRELLA</span>
                <span className="absolute bottom-2 left-3 text-xs font-bold text-blue-600">🐴 CABALLO</span>

                {items.map((i) => (
                  <div
                    key={i.id}
                    title={`${i.nombre} · ${i.unidades} uds · margen ${i.margen.toFixed(2)} € · FC ${i.foodCost.toFixed(0)}%`}
                    className={`absolute w-5 h-5 rounded-full ${QUADS[i.cuadrante].dot} border-2 border-white shadow cursor-pointer hover:scale-150 transition-transform`}
                    style={{
                      left: `calc(${pct(i.unidades, maxUds)}% - 10px)`,
                      bottom: `calc(${pct(i.margen, maxMargen)}% - 10px)`,
                    }}
                  ></div>
                ))}
              </div>
            </div>

            {/* PLAN DE ACCIÓN CON SUGERENCIAS POR PLATO */}
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
                              {i.unidades} uds · margen {eur(i.margen)} · FC{' '}
                              <span className={i.foodCost > 35 ? 'text-red-600 font-bold' : ''}>
                                {i.foodCost.toFixed(0)}%
                              </span>{' '}
                              · PVP {eur(i.precio)}
                            </p>
                            <p className={`text-[11px] mt-1 font-semibold ${cfg.text}`}>
                              {sugerencia(i)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Avisos */}
            {(sinVentas.length > 0 || pendientes.length > 0) && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-sm text-amber-800 space-y-1">
                {sinVentas.map((p) => (
                  <p key={p.id}>
                    ⚠️ <strong>{p.nombre}</strong>: sin ventas en este reporte (¿no se vende en este outlet o falta mapeo TPV).
                  </p>
                ))}
                {pendientes.map((p: any) => (
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
