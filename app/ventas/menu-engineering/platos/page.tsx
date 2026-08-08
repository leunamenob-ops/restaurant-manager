'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

const CATEGORIAS = ['Entrante', 'Principal', 'Postre', 'Bebida', 'Otro'];

export default function PlatosPage() {
  const router = useRouter();
  const [platos, setPlatos] = useState<any[]>([]);
  const [recetas, setRecetas] = useState<any[]>([]);
  const [tpvMap, setTpvMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nombre: '',
    categoria: 'Principal',
    precio_venta: '',
    receta_id: '',
    nombre_tpv: '',
  });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    const [plRes, recRes, linRes] = await Promise.all([
      supabase.from('platos').select('*').order('nombre'),
      supabase.from('recetas').select('id, nombre, coste_total, precio_venta').order('nombre'),
      supabase.from('ventas_lineas').select('nombre_articulo, unidades'),
    ]);

    const mapa = new Map<string, number>();
    (linRes.data || []).forEach((l: any) => {
      mapa.set(l.nombre_articulo, (mapa.get(l.nombre_articulo) || 0) + Number(l.unidades || 0));
    });

    setPlatos(plRes.data || []);
    setRecetas(recRes.data || []);
    setTpvMap(mapa);
    setLoading(false);
  }

  function recetaDe(plato: any) {
    return recetas.find((r) => r.id === plato.receta_id);
  }

  function costeReal(plato: any): number | null {
    const r = recetaDe(plato);
    return r ? Number(r.coste_total || 0) : null;
  }

  function abrirNuevo() {
    setEditId(null);
    setForm({ nombre: '', categoria: 'Principal', precio_venta: '', receta_id: '', nombre_tpv: '' });
    setModal(true);
  }

  function abrirEditar(p: any) {
    setEditId(p.id);
    setForm({
      nombre: p.nombre || '',
      categoria: p.categoria || 'Principal',
      precio_venta: p.precio_venta != null ? String(p.precio_venta) : '',
      receta_id: p.receta_id || '',
      nombre_tpv: p.nombre_tpv || '',
    });
    setModal(true);
  }

  async function guardar() {
    if (!form.nombre) {
      alert('El nombre es obligatorio');
      return;
    }
    setGuardando(true);

    const payload = {
      nombre: form.nombre,
      categoria: form.categoria,
      precio_venta: form.precio_venta === '' ? null : parseFloat(form.precio_venta),
      receta_id: form.receta_id || null,
      nombre_tpv: form.nombre_tpv || null,
    };

    const res = editId
      ? await supabase.from('platos').update(payload).eq('id', editId)
      : await supabase.from('platos').insert(payload);

    setGuardando(false);

    if (res.error) {
      alert(`Error: ${res.error.message}`);
      return;
    }

    setModal(false);
    cargar();
  }

  async function eliminar(p: any) {
    if (!confirm(`¿Eliminar el plato "${p.nombre}"?`)) return;
    await supabase.from('platos').delete().eq('id', p.id);
    cargar();
  }

  // Artículos TPV sin mapear (para sugerir en el select)
  const tpvSinMapear = Array.from(tpvMap.entries())
    .filter(([nombre]) => !platos.some((p) => p.nombre_tpv === nombre))
    .sort((a, b) => b[1] - a[1]);

  function semaforo(fc: number | null) {
    if (fc === null) return { txt: '—', cls: 'bg-slate-100 text-slate-500' };
    if (fc <= 30) return { txt: fc.toFixed(1) + '%', cls: 'bg-emerald-100 text-emerald-700' };
    if (fc <= 35) return { txt: fc.toFixed(1) + '%', cls: 'bg-amber-100 text-amber-700' };
    return { txt: fc.toFixed(1) + '%', cls: 'bg-red-100 text-red-700' };
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition"
          >
            <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight">🍽️ Platos & Escandallos</h1>
            <p className="text-sm text-slate-500">Coste real en vivo · precio de venta · enlace TPV</p>
          </div>
          <button
            onClick={() => router.push('/menu-engineering/menus')}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium transition text-sm"
          >
            📋 Menús
          </button>
          <button
            onClick={abrirNuevo}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition text-sm"
          >
            ➕ Nuevo plato
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-200 border-t-orange-600"></div>
          </div>
        ) : platos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="font-semibold text-slate-700">Aún no hay platos en el sistema</p>
            <p className="text-sm text-slate-500 mt-1">
              Crea tu primer plato vinculando su receta para obtener el coste real en vivo
            </p>
            <button
              onClick={abrirNuevo}
              className="mt-5 px-6 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium text-sm"
            >
              ➕ Crear primer plato
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-3">Plato</th>
                    <th className="px-3 py-3">Receta (coste vivo)</th>
                    <th className="px-3 py-3 text-right">Precio</th>
                    <th className="px-3 py-3 text-right">Coste</th>
                    <th className="px-3 py-3 text-right">Margen</th>
                    <th className="px-3 py-3 text-center">Food Cost</th>
                    <th className="px-3 py-3 text-right">Uds TPV</th>
                    <th className="px-3 py-3 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {platos.map((p) => {
                    const coste = costeReal(p);
                    const precio = Number(p.precio_venta || 0);
                    const margen = coste !== null ? precio - coste : null;
                    const fc = coste !== null && precio > 0 ? (coste / precio) * 100 : null;
                    const sem = semaforo(fc);
                    const uds = p.nombre_tpv ? tpvMap.get(p.nombre_tpv) || 0 : null;

                    return (
                      <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="px-6 py-3">
                          <p className="font-semibold text-slate-800">{p.nombre}</p>
                          <p className="text-[11px] text-slate-400">{p.categoria}</p>
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          {recetaDe(p)?.nombre || <span className="text-red-500 text-xs font-semibold">⚠️ Sin receta</span>}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold">{precio.toFixed(2)} €</td>
                        <td className="px-3 py-3 text-right text-slate-600">
                          {coste !== null ? coste.toFixed(2) + ' €' : '—'}
                        </td>
                        <td className={`px-3 py-3 text-right font-bold ${margen !== null && margen > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          {margen !== null ? margen.toFixed(2) + ' €' : '—'}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${sem.cls}`}>{sem.txt}</span>
                        </td>
                        <td className="px-3 py-3 text-right font-semibold text-slate-700">
                          {uds !== null ? uds : <span className="text-slate-300">sin TPV</span>}
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => abrirEditar(p)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold transition"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => eliminar(p)}
                            className="ml-1 px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-semibold transition"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL ALTA / EDICIÓN */}
      {modal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="bg-slate-900 text-white p-4 rounded-t-2xl flex justify-between items-center">
              <h2 className="font-bold">{editId ? '✏️ Editar plato' : '➕ Nuevo plato'}</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-white w-8 h-8 rounded-full flex items-center justify-center">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Nombre del plato *</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Hamburguesa Angus"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Categoría</label>
                  <select
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-orange-500 outline-none"
                  >
                    {CATEGORIAS.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Precio venta (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.precio_venta}
                    onChange={(e) => setForm({ ...form, precio_venta: e.target.value })}
                    placeholder="15.45"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                  Receta vinculada (coste real en vivo)
                </label>
                <select
                  value={form.receta_id}
                  onChange={(e) => {
                    const r = recetas.find((x) => x.id === e.target.value);
                    setForm({
                      ...form,
                      receta_id: e.target.value,
                      precio_venta: form.precio_venta === '' && r?.precio_venta ? String(r.precio_venta) : form.precio_venta,
                    });
                  }}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="">— Sin receta (coste manual más adelante) —</option>
                  {recetas.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre} · coste {Number(r.coste_total || 0).toFixed(2)} €
                    </option>
                  ))}
                </select>
                {form.receta_id && (
                  <p className="text-[11px] text-emerald-700 mt-1 font-semibold">
                    ✅ Coste vivo: {Number(recetas.find((r) => r.id === form.receta_id)?.coste_total || 0).toFixed(2)} € —
                    se actualiza solo si cambian los ingredientes
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                  Artículo del TPV (para heredar unidades vendidas)
                </label>
                <select
                  value={form.nombre_tpv}
                  onChange={(e) => setForm({ ...form, nombre_tpv: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="">— Sin mapeo TPV —</option>
                  {form.nombre_tpv && !tpvSinMapear.some(([n]) => n === form.nombre_tpv) && (
                    <option value={form.nombre_tpv}>{form.nombre_tpv} (actual)</option>
                  )}
                  {tpvSinMapear.map(([nombre, uds]) => (
                    <option key={nombre} value={nombre}>
                      {nombre} · {uds} uds
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Sugeridos por volumen de ventas. Ej: HAMBURGUESA ANGUS · 1257 uds
                </p>
              </div>

              {/* Preview en vivo */}
              {form.receta_id && form.precio_venta !== '' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Coste</p>
                    <p className="font-bold text-slate-800">
                      {Number(recetas.find((r) => r.id === form.receta_id)?.coste_total || 0).toFixed(2)} €
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Margen</p>
                    <p className="font-bold text-emerald-700">
                      {(parseFloat(form.precio_venta) - Number(recetas.find((r) => r.id === form.receta_id)?.coste_total || 0)).toFixed(2)} €
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Food cost</p>
                    <p className={`font-bold ${
                      (Number(recetas.find((r) => r.id === form.receta_id)?.coste_total || 0) / parseFloat(form.precio_venta)) * 100 <= 30
                        ? 'text-emerald-700'
                        : (Number(recetas.find((r) => r.id === form.receta_id)?.coste_total || 0) / parseFloat(form.precio_venta)) * 100 <= 35
                        ? 'text-amber-700'
                        : 'text-red-700'
                    }`}>
                      {((Number(recetas.find((r) => r.id === form.receta_id)?.coste_total || 0) / parseFloat(form.precio_venta)) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
              <button
                onClick={guardar}
                disabled={guardando}
                className="w-full py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition disabled:bg-slate-300"
              >
                {guardando ? 'Guardando...' : '💾 Guardar plato'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
