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

  function getRentabilidadLabel(foodCost: number): string {
    if (foodCost < 25) return 'Alta';
    if (foodCost <= 33) return 'Media';
    return 'Baja';
  }

  function getPrecioLabel(precio: number): string {
    if (precio < 15) return 'Bajo';
    if (precio <= 30) return 'Medio';
    return 'Alto';
  }

  function getMargenLabel(margen: number): string {
    if (margen >= 70) return 'Alto';
    if (margen >= 60) return 'Medio';
    return 'Bajo';
  }

  const recetasFiltradas = recetas.filter(receta => {
    const foodCost = calcularFoodCost(receta.coste_total, receta.precio_venta);
    const margen = calcularMargen(receta.coste_total, receta.precio_venta);
    
    const coincideBusqueda = receta.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const coincideTipo = filtroTipo === 'todas' || receta.tipo === filtroTipo;
    
    // Filtro por rentabilidad (Food Cost)
    let coincideRentabilidad = true;
    if (filtroRentabilidad === 'alta') coincideRentabilidad = foodCost < 25;
    else if (filtroRentabilidad === 'media') coincideRentabilidad = foodCost >= 25 && foodCost <= 33;
    else if (filtroRentabilidad === 'baja') coincideRentabilidad = foodCost > 33;
    
    // Filtro por precio
    let coincidePrecio = true;
    if (filtroPrecio === 'bajo') coincidePrecio = receta.precio_venta < 15;
    else if (filtroPrecio === 'medio') coincidePrecio = receta.precio_venta >= 15 && receta.precio_venta <= 30;
    else if (filtroPrecio === 'alto') coincidePrecio = receta.precio_venta > 30;
    
    // Filtro por margen
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
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-md"
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
                <option value="sub_receta"> Sub-recetas</option>
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
                <option value="alto"> Alto (≥70%)</option>
                <option value="medio">🟡 Medio (60-70%)</option>
                <option value="bajo">🔴 Bajo (&lt;60%)</option>
              </select>
            </div>
          </div>
        </div>

        {/* GRID DE RECETAS */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {recetasFiltradas.map((receta) => {
              const foodCost = calcularFoodCost(receta.coste_total, receta.precio_venta);
              const margen = calcularMargen(receta.coste_total, receta.precio_venta);
              const esSubReceta = receta.tipo === 'sub_receta';
              
              return (
                <div
                  key={receta.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-gray-200"
                >
                  {/* Foto */}
                  <div className="relative h-40 bg-gray-100">
                    {receta.foto_url ? (
                      <img
                        src={receta.foto_url}
                        alt={receta.nombre}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span className="text-4xl">🍽️</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        esSubReceta 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {esSubReceta ? 'Sub-receta' : 'Plato'}
                      </span>
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="p-3">
                    <h3 className="font-bold text-gray-900 text-sm mb-2 truncate" title={receta.nombre}>
                      {receta.nombre}
                    </h3>

                    {/* Métricas */}
                    <div className="space-y-1 mb-3">
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
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                      <span>🍽️ {receta.porciones} porciones</span>
                      {receta.produccion_gramos && (
                        <span>⚖️ {parseFloat(receta.produccion_gramos)}g</span>
                      )}
                    </div>

                    {/* Botones */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/recetas/${receta.id}`)}
                        className="flex-1 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition"
                      >
                        👁️ Ver
                      </button>
                      <button
                        onClick={() => router.push(`/recetas/${receta.id}/editar`)}
                        className="flex-1 px-2 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600 transition"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => eliminarReceta(receta.id, receta.nombre)}
                        className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
          >
            ← Volver al Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
