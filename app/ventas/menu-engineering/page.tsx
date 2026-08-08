'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

interface ItemME {
  nombre: string;
  categoria: string;
  unidades: number;
  margenUd: number;
  totalMargen: number;
  precioBase: number;
  precioCoste: number;
  popular: boolean;
  rentable: boolean;
  cuadrante: 'estrella' | 'caballo' | 'puzzle' | 'perro';
}

const QUADS = {
  estrella: {
    emoji: '🌟',
    titulo: 'Estrellas',
    desc: 'Alta popularidad + alto margen',
    accion: 'Mantener y destacar en carta. Son tu motor de beneficio.',
    color: 'border-emerald-300 bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  caballo: {
    emoji: '🐴',
    titulo: 'Caballos de batalla',
    desc: 'Alta popularidad + bajo margen',
    accion: 'Venden mucho pero dejan poco: revisar precio o reducir coste.',
    color: 'border-blue-300 bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  puzzle: {
    emoji: '🧩',
    titulo: 'Puzzles',
    desc: 'Baja popularidad + alto margen',
    accion: 'Dejan buen margen pero no salen: promocionar y reposicionar en carta.',
    color: 'border-amber-300 bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  perro: {
    emoji: '🐕',
    titulo: 'Perros',
    desc: 'Baja popularidad + bajo margen',
    accion: 'Candidatos a eliminar o rediseñar por completo.',
    color: 'border-red-300 bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
};

export default function MenuEngineeringPage() {
  const router = useRouter();
  const [items, setItems] = useState<ItemME[]>([]);
  const [loading, setLoading] = useState(true);
  const [umbUds, setUmbUds] = useState(0);
  const [mediaMargen, setMediaMargen] = useState(0);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    const { data } = await supabase
      .from('ventas_lineas')
      .select('nombre_articulo, categoria, unidades, total_margen, total_base, total_coste');

    // Agregar por artículo (por si hay varios meses importados)
    const map = new Map<string, any>();
    (data || []).forEach((l: any) => {
      const acc = map.get(l.nombre_articulo) || {
        nombre: l.nombre_articulo,
        categoria: l.categoria || '',
        unidades: 0,
        totalMargen: 0,
        totalBase: 0,
        totalCoste: 0,
      };
      acc.unidades += Number(l.unidades || 0);
      acc.totalMargen += Number(l.total_margen || 0);
      acc.totalBase += Number(l.total_base || 0);
      acc.totalCoste += Number(l.total_coste || 0);
      map.set(l.nombre_articulo, acc);
    });

    const agregados: ItemME[] = Array.from(map.values()).map((a) => ({
      ...a,
      margenUd: a.unidades > 0 ? a.totalMargen / a.unidades : 0,
      precioBase: a.unidades > 0 ? a.totalBase / a.unidades : 0,
      precioCoste: a.unidades > 0 ? a.totalCoste / a.unidades : 0,
      popular: false,
      rentable: false,
      cuadrante: 'perro' as const,
    }));

    if (agregados.length > 0) {
      const mediaUds = agregados.reduce((s, i) => s + i.unidades, 0) / agregados.length;
      const umb = mediaUds * 0.7; // Kasavana & Smith
      const mediaMarg = agregados.reduce((s, i) => s + i.margenUd, 0) / agregados.length;

      agregados.forEach((i) => {
        i.popular = i.unidades >= umb;
        i.rentable = i.margenUd >= mediaMarg;
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

    setItems(agregados.sort((a, b) => b.totalMargen - a.totalMargen));
    setLoading(false);
  }

  const maxUds = Math.max(...items.map((i) => i.unidades), 1);
  const maxMargen = Math.max(...items.map((i) => i.margenUd), 1);

  const pct = (v: number, max: number) => Math.min(96, Math.max(4, (v / max) * 100));

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/ventas')}
            className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition"
          >
            <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">🎯 Menu Engineering</h1>
            <p className="text-sm text-slate-500">
              Popularidad × Rentabilidad · método Kasavana & Smith
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-200 border-t-orange-600"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <p className="text-4xl mb-3">📊</p>
            <p className="font-semibold text-slate-700">Aún no hay ventas importadas</p>
            <p className="text-sm text-slate-500 mt-1">Importa un cierre del TPV en /ventas</p>
          </div>
        ) : (
          <>
            {/* Resumen de umbrales */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-semibold">Umbral popularidad</p>
                <p className="text-2xl font-bold mt-1">{umbUds.toFixed(0)} uds</p>
                <p className="text-[11px] text-slate-400">70% de la media vendida</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-semibold">Umbral rentabilidad</p>
                <p className="text-2xl font-bold mt-1">{mediaMargen.toFixed(2)} €</p>
                <p className="text-[11px] text-slate-400">margen medio por unidad</p>
              </div>
            </div>

            {/* MATRIZ VISUAL */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
                📈 Matriz (X = unidades · Y = margen/ud)
              </h2>
              <div className="relative h-96 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                {/* líneas de umbral */}
                <div
                  className="absolute top-0 bottom-0 border-l-2 border-dashed border-slate-400"
                  style={{ left: `${pct(umbUds, maxUds)}%` }}
                ></div>
                <div
                  className="absolute left-0 right-0 border-t-2 border-dashed border-slate-400"
                  style={{ bottom: `${pct(mediaMargen, maxMargen)}%` }}
                ></div>

                {/* etiquetas de cuadrantes */}
                <span className="absolute top-2 right-3 text-xs font-bold text-amber-600">🧩 PUZZLE</span>
                <span className="absolute top-2 left-3 text-xs font-bold text-red-500">🐕 PERRO</span>
                <span className="absolute bottom-2 right-3 text-xs font-bold text-emerald-600">🌟 ESTRELLA</span>
                <span className="absolute bottom-2 left-3 text-xs font-bold text-blue-600">🐴 CABALLO</span>

                {/* puntos */}
                {items.map((i) => (
                  <div
                    key={i.nombre}
                    title={`${i.nombre} · ${i.unidades} uds · ${i.margenUd.toFixed(2)} €/ud`}
                    className={`absolute w-4 h-4 rounded-full ${QUADS[i.cuadrante].dot} border-2 border-white shadow cursor-pointer hover:scale-150 transition-transform`}
                    style={{
                      left: `calc(${pct(i.unidades, maxUds)}% - 8px)`,
                      bottom: `calc(${pct(i.margenUd, maxMargen)}% - 8px)`,
                    }}
                  ></div>
                ))}
              </div>
            </div>

            {/* LISTAS POR CUADRANTE */}
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
                    <p className="text-xs text-slate-600 mb-3">{cfg.accion}</p>

                    {delQuad.length === 0 ? (
                      <p className="text-xs text-slate-400">Sin artículos en este cuadrante</p>
                    ) : (
                      <div className="space-y-2">
                        {delQuad.map((i) => (
                          <div key={i.nombre} className="bg-white rounded-xl px-3 py-2 shadow-sm">
                            <div className="flex justify-between items-center">
                              <p className="font-semibold text-sm text-slate-800">{i.nombre}</p>
                              <p className={`text-sm font-bold ${cfg.text}`}>
                                {i.totalMargen.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €
                              </p>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {i.unidades} uds · {i.margenUd.toFixed(2)} €/ud · venta {i.precioBase.toFixed(2)} €
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}