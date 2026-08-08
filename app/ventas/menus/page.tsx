'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function MenusPage() {
  const router = useRouter();
  const [menus, setMenus] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [platos, setPlatos] = useState<any[]>([]);
  const [recetas, setRecetas] = useState<any[]>([]);
  const [tpvMap, setTpvMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nombre: '', descripcion: '', precio_fijo: '' });
  const [guardando, setGuardando] = useState(false);
  const [abierto, setAbierto] = useState<string | null>(null);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    const [mRes, mpRes, plRes, recRes, linRes] = await Promise.all([
      supabase.from('menus').select('*').order('created_at', { ascending: false }),
      supabase.from('menus_platos').select('*'),
      supabase.from('platos').select('*'),
      supabase.from('recetas').select('id, nombre, coste_total, precio_venta').order('nombre'),
      supabase.from('ventas_lineas').select('nombre_articulo, unidades'),
    ]);

    const mapa = new Map<string, number>();
    (linRes.data || []).forEach((l: any) => {
      mapa.set(l.nombre_articulo, (mapa.get(l.nombre_articulo) || 0) + Number(l.unidades || 0));
    });

    setMenus(mRes.data || []);
    setLinks(mpRes.data || []);
    setPlatos(plRes.data || []);
    setRecetas(recRes.data || []);
    setTpvMap(mapa);
    setLoading(false);
  }

  function recetaDe(plato: any) {
    return recetas.find((r) => r.id === plato.receta_id);
  }

  function platosDe(menuId: string) {
    return links
      .filter((l) => l.menu_id === menuId)
      .map((l) => {
        const plato = platos.find((p) => p.id === l.plato_id);
        return plato ? { link: l, plato, receta: recetaDe(plato) } : null;
      })
      .filter(Boolean) as any[];
  }

  function metricas(menu: any) {
    const sus = platosDe(menu.id);
    const coste = sus.reduce((s, x) => s + Number(x.receta?.coste_total || 0), 0);
    const sumaPlatos = sus.reduce((s, x) => s + Number(x.plato.precio_venta || 0), 0);
    const venta = menu.precio_fijo != null ? Number(menu.precio_fijo) : sumaPlatos;
    const margen = venta - coste;
    const fc = venta > 0 ? (coste / venta) * 100 : 0;
    return { coste, venta, margen, fc, n: sus.length };
  }

  function semaforo(fc: number) {
    if (fc <= 30) return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    if (fc <= 35) return 'bg-amber-100 text-amber-700 border-amber-300';
    return 'bg-red-100 text-red-700 border-red-300';
  }

  // Añadir receta al menú → crea el plato técnico si no existe
  async function addReceta(menuId: string, recetaId: string) {
    if (!recetaId) return;
    const rec = recetas.find((r) => r.id === recetaId);
    if (!rec) return;

    let platoId: string | null = null;

    const { data: existente } = await supabase
      .from('platos')
      .select('id')
      .eq('receta_id', recetaId)
      .maybeSingle();

    if (existente) {
      platoId = existente.id;
    } else {
      const { data: nuevo, error } = await supabase
        .from('platos')
        .insert({
          nombre: rec.nombre,
          categoria: 'Principal',
          precio_venta: rec.precio_venta != null ? Number(rec.precio_venta) : null,
          receta_id: recetaId,
        })
        .select()
        .single();

      if (error) {
        alert(`Error creando plato: ${error.message}`);
        return;
      }
      platoId = nuevo.id;
    }

    await supabase.from('menus_platos').insert({ menu_id: menuId, plato_id: platoId });
    cargar();
  }

  async function removePlato(linkId: string) {
    await supabase.from('menus_platos').delete().eq('id', linkId);
    cargar();
  }

  async function updatePrecio(platoId: string, valor: string) {
    await supabase
      .from('platos')
      .update({ precio_venta: valor === '' ? null : parseFloat(valor) })
      .eq('id', platoId);
    cargar();
  }

  async function updateTpv(platoId: string, nombreTpv: string) {
    await supabase
      .from('platos')
      .update({ nombre_tpv: nombreTpv || null })
      .eq('id', platoId);
    cargar();
  }

  async function crearMenu() {
    if (!form.nombre) {
      alert('El nombre es obligatorio');
      return;
    }
    setGuardando(true);
    const res = await supabase.from('menus').insert({
      nombre: form.nombre,
      descripcion: form.descripcion || null,
      precio_fijo: form.precio_fijo === '' ? null : parseFloat(form.precio_fijo),
    });
    setGuardando(false);
    if (res.error) {
      alert(`Error: ${res.error.message}`);
      return;
    }
    setModal(false);
    setForm({ nombre: '', descripcion: '', precio_fijo: '' });
    cargar();
  }

  async function deleteMenu(menu: any) {
    if (!confirm(`¿Eliminar el menú "${menu.nombre}"?`)) return;
    await supabase.from('menus').delete().eq('id', menu.id);
    cargar();
  }

  const eur = (n: number) => Number(n || 0).toFixed(2) + ' €';

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
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight">📋 Gestión de Menús</h1>
            <p className="text-sm text-slate-500">Crea menús y aliméntalos con tu base de Recetas</p>
          </div>
          <button
            onClick={() => setModal(true)}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition text-sm"
          >
            ➕ Nuevo menú
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-4">
        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-200 border-t-orange-600"></div>
          </div>
        ) : menus.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-semibold text-slate-700">Aún no hay menús</p>
            <p className="text-sm text-slate-500 mt-1">
              Crea tu primer menú (Carta Chiringuito, Menú del Día, Navidad...) y móntalo con recetas
            </p>
            <button
              onClick={() => setModal(true)}
              className="mt-5 px-6 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium text-sm"
            >
              ➕ Crear primer menú
            </button>
          </div>
        ) : (
          menus.map((m) => {
            const met = metricas(m);
            return (
              <div key={m.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Cabecera del menú */}
                <div className="p-5 flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <h2 className="font-bold text-lg text-slate-900">{m.nombre}</h2>
                    <p className="text-xs text-slate-500">
                      {m.descripcion || '—'} · {met.n} platos
                      {m.precio_fijo != null && (
                        <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-bold">
                          Precio cerrado {eur(Number(m.precio_fijo))}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-5 text-sm">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase">Coste</p>
                      <p className="font-bold text-slate-700">{eur(met.coste)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase">Venta</p>
                      <p className="font-bold text-blue-700">{eur(met.venta)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase">Margen</p>
                      <p className={`font-bold ${met.margen >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {eur(met.margen)}
                      </p>
                    </div>
                    <span className={`px-3 py-2 rounded-xl border-2 text-sm font-bold ${semaforo(met.fc)}`}>
                      FC {met.fc.toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setAbierto(abierto === m.id ? null : m.id)}
                      className="px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition"
                    >
                      {abierto === m.id ? 'Cerrar' : '🍽️ Montar menú'}
                    </button>
                    <button
                      onClick={() => deleteMenu(m)}
                      className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Montaje desde RECETAS */}
                {abierto === m.id && (
                  <div className="border-t border-slate-200 bg-slate-50 p-5 space-y-3">
                    {platosDe(m.id).map(({ link, plato, receta }: any) => (
                      <div key={link.id} className="bg-white rounded-xl px-4 py-3 border border-slate-200">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">
                              {receta?.nombre || plato.nombre}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Coste vivo {receta ? eur(receta.coste_total) : '—'} ·
                              {plato.nombre_tpv
                                ? ` TPV: ${plato.nombre_tpv} (${tpvMap.get(plato.nombre_tpv) || 0} uds)`
                                : ' sin mapeo TPV'}
                            </p>
                          </div>

                          <div className="w-24">
                            <label className="block text-[9px] text-slate-400 uppercase">PVP €</label>
                            <input
                              type="number"
                              step="0.01"
                              defaultValue={plato.precio_venta ?? ''}
                              onBlur={(e) => updatePrecio(plato.id, e.target.value)}
                              className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-right focus:ring-2 focus:ring-orange-500 outline-none"
                            />
                          </div>

                          <div className="w-48">
                            <label className="block text-[9px] text-slate-400 uppercase">Artículo TPV</label>
                            <select
                              value={plato.nombre_tpv || ''}
                              onChange={(e) => updateTpv(plato.id, e.target.value)}
                              className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-[11px] bg-white focus:ring-2 focus:ring-orange-500 outline-none"
                            >
                              <option value="">— Sin mapeo —</option>
                              {plato.nombre_tpv && (
                                <option value={plato.nombre_tpv}>{plato.nombre_tpv}</option>
                              )}
                              {Array.from(tpvMap.entries())
                                .filter(([n]) => n !== plato.nombre_tpv)
                                .sort((a, b) => b[1] - a[1])
                                .map(([n, u]) => (
                                  <option key={n} value={n}>
                                    {n} · {u} uds
                                  </option>
                                ))}
                            </select>
                          </div>

                          <button
                            onClick={() => removePlato(link.id)}
                            className="px-2.5 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}

                    <select
                      value=""
                      onChange={(e) => addReceta(m.id, e.target.value)}
                      className="w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl text-sm bg-white text-slate-600 focus:ring-2 focus:ring-orange-500 outline-none"
                    >
                      <option value="">➕ Añadir receta al menú...</option>
                      {recetas
                        .filter((r) => !platosDe(m.id).some((x: any) => x.receta?.id === r.id))
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.nombre} · coste {eur(r.coste_total)}
                            {r.precio_venta != null ? ` · PVP ${eur(r.precio_venta)}` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>

      {/* MODAL NUEVO MENÚ */}
      {modal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl">
            <div className="bg-slate-900 text-white p-4 rounded-t-2xl flex justify-between items-center">
              <h2 className="font-bold">➕ Nuevo menú</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Nombre *</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Carta Chiringuito, Menú del Día, Navidad..."
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Descripción</label>
                <input
                  type="text"
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Entrante + principal + postre"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                  Precio cerrado (€) — opcional
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.precio_fijo}
                  onChange={(e) => setForm({ ...form, precio_fijo: e.target.value })}
                  placeholder="Vacío = suma de PVPs de los platos"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
              <button
                onClick={crearMenu}
                disabled={guardando}
                className="w-full py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition disabled:bg-slate-300"
              >
                {guardando ? 'Creando...' : '💾 Crear menú'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
