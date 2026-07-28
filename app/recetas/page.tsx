'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

interface Receta {
  id: string;
  nombre: string;
  tipo: string;
  porciones: number;
  coste_total: number;
  precio_venta: number;
  produccion_gramos: string | null;
  foto_url: string | null;
  created_at: string;
}

export default function RecetasPage() {
  const router = useRouter();
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todas' | 'plato' | 'sub_receta'>('todas');
  const [filtroRentabilidad, setFiltroRentabilidad] = useState<'todas' | 'alta' | 'media' | 'baja'>('todas');
  const [filtroPrecio, setFiltroPrecio] = useState<'todos' | 'bajo' | 'medio' | 'alto'>('todos');
  const [filtroMargen, setFiltroMargen] = useState<'todos' | 'alto' | 'medio' | 'bajo'>('todos');

  useEffect(() => {
    cargarRecetas();
  }, []);

  async function cargarRecetas() {
    setLoading(true);
    const { data, error } = await supabase
      .from('recetas')
      .select('*')
      .order('nombre');

    if (error) {
      console.error('Error cargando recetas:', error);
    } else {
      setRecetas(data || []);
    }
    setLoading(false);
  }

  async function eliminarReceta(id: string, nombre: string) {
    if (!confirm(`¿Estás seguro de eliminar "${nombre}"?\n\nEsta acción también eliminará sus detalles y no se puede deshacer.`)) return;

    try {
      await supabase.from('receta_detalle').delete().eq('receta_id', id);
      const { error } = await supabase.from('recetas').delete().eq('id', id);
      
      if (error) throw error;
      
      // Pequeño timeout para que la UI se sienta fluida
      setTimeout(() => {
        alert('Receta eliminada correctamente');
        cargarRecetas();
      }, 100);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }

  function calcularFoodCost(coste: number, precioVenta: number): number {
    if (precioVenta <= 0) return 0;
    return (coste / precioVenta) * 100;
  }

  function calcularMargen(coste: number, precioVenta: number): number {
    if (precioVenta <= 0) return 0;
    return ((precioVenta - coste) / precioVenta) * 100;
  }

  const recetasFiltradas = recetas.filter(receta => {
    const foodCost = calcularFoodCost(receta.coste_total, receta.precio_venta);
    const margen = calcularMargen(receta.coste_total, receta.precio_venta);
    
    const coincideBusqueda = receta.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const coincideTipo = filtroTipo === 'todas' || receta.tipo === filtroTipo;
    
    let coincideRentabilidad = true;
    if (filtroRentabilidad === 'alta') coincideRentabilidad = foodCost < 25;
    else if (filtroRentabilidad === 'media') coincideRentabilidad = foodCost >= 25 && foodCost <= 33;
    else if (filtroRentabilidad === 'baja') coincideRentabilidad = foodCost > 33;
    
    let coincidePrecio = true;
    if (filtroPrecio === 'bajo') coincidePrecio = receta.precio_venta < 15;
    else if (filtroPrecio === 'medio') coincidePrecio = receta.precio_venta >= 15 && receta.precio_venta <= 30;
    else if (filtroPrecio === 'alto') coincidePrecio = receta.precio_venta > 30;
    
    let coincideMargen = true;
    if (filtroMargen === 'alto') coincideMargen = margen >= 70;
    else if (filtroMargen === 'medio') coincideMargen = margen >= 60 && margen < 70;
    else if (filtroMargen === 'bajo') coincideMargen = margen < 60;
    
    return coincideBusqueda && coincideTipo && coincideRentabilidad && coincidePrecio && coincideMargen;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* HEADER MODERNO */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">K</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Gestión de Recetas</h1>
                <p className="text-sm text-slate-500">
                  {recetasFiltradas.length} de {recetas.length} recetas registradas
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <a 
                href="/dashboard" 
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-all text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Dashboard
              </a>
              <button
                onClick={() => router.push('/recetas/nueva')}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-all shadow-sm hover:shadow-md text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Nueva Receta
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* FILTROS AVANZADOS */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Buscar</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  type="text"
                  placeholder="Nombre de la receta..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tipo</label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value as any)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white text-slate-700"
              >
                <option value="todas">Todas</option>
                <option value="plato">🍽️ Platos</option>
                <option value="sub_receta">🥘 Sub-recetas</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Rentabilidad (FC)</label>
              <select
                value={filtroRentabilidad}
                onChange={(e) => setFiltroRentabilidad(e.target.value as any)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white text-slate-700"
              >
                <option value="todas">Todas</option>
                <option value="alta">🟢 Alta (&lt;25%)</option>
                <option value="media">🟡 Media (25-33%)</option>
                <option value="baja">🔴 Baja (&gt;33%)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Precio Venta</label>
              <select
                value={filtroPrecio}
                onChange={(e) => setFiltroPrecio(e.target.value as any)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white text-slate-700"
              >
                <option value="todos">Todos</option>
                <option value="bajo">€ Bajo (&lt;15€)</option>
                <option value="medio">€€ Medio (15-30€)</option>
                <option value="alto">€€€ Alto (&gt;30€)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Margen Neto</label>
              <select
                value={filtroMargen}
                onChange={(e) => setFiltroMargen(e.target.value as any)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white text-slate-700"
              >
                <option value="todos">Todos</option>
                <option value="alto">🟢 Alto (≥70%)</option>
                <option value="medio">🟡 Medio (60-70%)</option>
                <option value="bajo">🔴 Bajo (&lt;60%)</option>
              </select>
            </div>
          </div>
        </div>

        {/* GRID DE RECETAS CON ANIMACIONES */}
        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-200 border-t-emerald-600 mb-3"></div>
            <p className="text-slate-600 font-medium">Cargando recetas...</p>
          </div>
        ) : recetasFiltradas.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="flex flex-col items-center justify-center text-slate-400 mb-6">
              <svg className="w-16 h-16 mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p className="text-slate-600 font-medium text-lg">No se encontraron recetas</p>
              <p className="text-sm text-slate-400 mt-1">Prueba ajustando los filtros o crea una nueva</p>
            </div>
            <button
              onClick={() => router.push('/recetas/nueva')}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-all shadow-sm"
            >
              Crear primera receta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {recetasFiltradas.map((receta) => {
              const foodCost = calcularFoodCost(receta.coste_total, receta.precio_venta);
              const margen = calcularMargen(receta.coste_total, receta.precio_venta);
              const esSubReceta = receta.tipo === 'sub_receta';
              
              return (
                <div
                  key={receta.id}
                  className="group bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
                >
                  {/* Foto */}
                  <div className="relative h-44 bg-slate-100 overflow-hidden">
                    {receta.foto_url ? (
                      <img
                        src={receta.foto_url}
                        alt={receta.nombre}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full shadow-sm backdrop-blur-sm ${
                        esSubReceta 
                          ? 'bg-purple-100/90 text-purple-800 border border-purple-200' 
                          : 'bg-cyan-100/90 text-cyan-800 border border-cyan-200'
                      }`}>
                        {esSubReceta ? 'Sub-receta' : 'Plato'}
                      </span>
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-bold text-slate-900 text-sm mb-3 line-clamp-2 min-h-[2.5rem]" title={receta.nombre}>
                      {receta.nombre}
                    </h3>

                    {/* Métricas */}
                    <div className="space-y-2 mb-4 flex-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Precio venta:</span>
                        <span className="font-semibold text-slate-900">{receta.precio_venta.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Coste total:</span>
                        <span className="font-semibold text-slate-700">{receta.coste_total.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Food Cost:</span>
                        <span className={`font-bold px-1.5 py-0.5 rounded ${
                          foodCost < 25 ? 'text-emerald-700 bg-emerald-50' : foodCost <= 33 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50'
                        }`}>
                          {foodCost.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Margen neto:</span>
                        <span className={`font-bold px-1.5 py-0.5 rounded ${
                          margen >= 70 ? 'text-emerald-700 bg-emerald-50' : margen >= 60 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50'
                        }`}>
                          {margen.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Porciones / Producción */}
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-4 pb-4 border-t border-slate-100 pt-3">
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {receta.porciones} porc.
                      </span>
                      {receta.produccion_gramos && (
                        <span className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-3-1m-6 2l-3 9a5.002 5.002 0 006.001 0M18 7l3 9" />
                          </svg>
                          {parseFloat(receta.produccion_gramos)}g
                        </span>
                      )}
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/recetas/${receta.id}`)}
                        className="flex-1 px-3 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all duration-300 text-xs font-medium flex items-center justify-center gap-1.5 group/btn"
                      >
                        <svg className="w-4 h-4 transition-transform duration-300 group-hover/btn:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Ver Ficha
                      </button>
                      <button
                        onClick={() => router.push(`/recetas/${receta.id}/editar`)}
                        className="px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all duration-300 text-xs font-medium flex items-center justify-center group/btn"
                        title="Editar"
                      >
                        <svg className="w-4 h-4 transition-transform duration-300 group-hover/btn:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => eliminarReceta(receta.id, receta.nombre)}
                        className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-all duration-300 text-xs font-medium flex items-center justify-center group/btn"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4 transition-transform duration-300 group-hover/btn:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 pb-8 text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-all shadow-sm text-sm flex items-center gap-2 mx-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Volver al Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}
