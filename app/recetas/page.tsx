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
    if (!confirm(`¿Estás seguro de eliminar "${nombre}"?`)) return;

    try {
      await supabase.from('receta_detalle').delete().eq('receta_id', id);
      const { error } = await supabase.from('recetas').delete().eq('id', id);
      
      if (error) throw error;
      alert('Receta eliminada correctamente');
      cargarRecetas();
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📖 Gestión de Recetas</h1>
            <p className="text-gray-600 mt-1">
              {recetasFiltradas.length} de {recetas.length} recetas
            </p>
          </div>
          <button
            onClick={() => router.push('/recetas/nueva')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-md transition-all"
          >
            + Nueva Receta
          </button>
        </div>

        {/* FILTROS */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Buscar</label>
              <input
                type="text"
                placeholder="Nombre..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="todas">Todas</option>
                <option value="plato">🍽️ Platos</option>
                <option value="sub_receta">🥘 Sub-recetas</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Rentabilidad</label>
              <select
                value={filtroRentabilidad}
                onChange={(e) => setFiltroRentabilidad(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="todas">Todas</option>
                <option value="alta">🟢 Alta (&lt;25% FC)</option>
                <option value="media">🟡 Media (25-33% FC)</option>
                <option value="baja">🔴 Baja (&gt;33% FC)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Precio Venta</label>
              <select
                value={filtroPrecio}
                onChange={(e) => setFiltroPrecio(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="todos">Todos</option>
                <option value="bajo">€ Bajo (&lt;15€)</option>
                <option value="medio">€€ Medio (15-30€)</option>
                <option value="alto">€€€ Alto (&gt;30€)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Margen Neto</label>
              <select
                value={filtroMargen}
                onChange={(e) => setFiltroMargen(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
          <div className="text-center py-12 text-gray-600">Cargando recetas...</div>
        ) : recetasFiltradas.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-500 text-lg mb-4">No se encontraron recetas</p>
            <button
              onClick={() => router.push('/recetas/nueva')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Crear primera receta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {recetasFiltradas.map((receta) => {
              const foodCost = calcularFoodCost(receta.coste_total, receta.precio_venta);
              const margen = calcularMargen(receta.coste_total, receta.precio_venta);
              const esSubReceta = receta.tipo === 'sub_receta';
              
              return (
                <div
                  key={receta.id}
                  className="group bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden border border-gray-200"
                >
                  {/* Foto */}
                  <div className="relative h-48 bg-gray-100 overflow-hidden">
                    {receta.foto_url ? (
                      <img
                        src={receta.foto_url}
                        alt={receta.nombre}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span className="text-6xl">🍽️</span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full shadow-md ${
                        esSubReceta 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {esSubReceta ? 'Sub-receta' : 'Plato'}
                      </span>
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 text-sm mb-3 line-clamp-2 min-h-[2.5rem]" title={receta.nombre}>
                      {receta.nombre}
                    </h3>

                    {/* Métricas */}
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Precio:</span>
                        <span className="font-semibold text-gray-900">{receta.precio_venta.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Coste:</span>
                        <span className="font-semibold text-blue-700">{receta.coste_total.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Food Cost:</span>
                        <span className={`font-semibold ${
                          foodCost < 25 ? 'text-green-700' : foodCost <= 33 ? 'text-yellow-700' : 'text-red-700'
                        }`}>
                          {foodCost.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Margen:</span>
                        <span className={`font-semibold ${
                          margen >= 70 ? 'text-green-700' : margen >= 60 ? 'text-yellow-700' : 'text-red-700'
                        }`}>
                          {margen.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Porciones */}
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4 pb-4 border-b border-gray-100">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {receta.porciones} porciones
                      </span>
                      {receta.produccion_gramos && (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-3-1m-6 2l-3 9a5.002 5.002 0 006.001 0M18 7l3 9" />
                          </svg>
                          {parseFloat(receta.produccion_gramos)}g
                        </span>
                      )}
                    </div>

                    {/* Botones */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/recetas/${receta.id}`)}
                        className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-300 text-xs font-medium flex items-center justify-center gap-1 group/btn"
                      >
                        <svg className="w-4 h-4 transition-transform duration-300 group-hover/btn:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Ver
                      </button>
                      <button
                        onClick={() => router.push(`/recetas/${receta.id}/editar`)}
                        className="flex-1 px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all duration-300 text-xs font-medium flex items-center justify-center group/btn"
                      >
                        <svg className="w-4 h-4 transition-transform duration-300 group-hover/btn:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => eliminarReceta(receta.id, receta.nombre)}
                        className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-300 text-xs font-medium flex items-center justify-center group/btn"
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
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-all"
          >
            ← Volver al Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
