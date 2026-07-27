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
  created_at: string;
}

export default function RecetasPage() {
  const router = useRouter();
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todas' | 'plato' | 'sub_receta'>('todas');

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
    if (!confirm(`¿Estás seguro de eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return;

    try {
      // Primero eliminar los detalles para evitar problemas de foreign key
      await supabase.from('receta_detalle').delete().eq('receta_id', id);
      
      // Luego eliminar la receta
      const { error } = await supabase.from('recetas').delete().eq('id', id);
      
      if (error) throw error;
      
      alert('Receta eliminada correctamente');
      cargarRecetas();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }

  function calcularFoodCost(coste: number, precioVenta: number) {
    if (precioVenta <= 0) return 0;
    return ((coste / precioVenta) * 100).toFixed(1);
  }

  const recetasFiltradas = recetas.filter(receta => {
    const coincideBusqueda = receta.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const coincideTipo = filtroTipo === 'todas' || receta.tipo === filtroTipo;
    return coincideBusqueda && coincideTipo;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">📖 Gestión de Recetas</h1>
            <p className="text-gray-600 mt-2">
              {recetasFiltradas.length} de {recetas.length} recetas
            </p>
          </div>
          <button
            onClick={() => router.push('/recetas/nueva')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition shadow-md"
          >
            + Nueva Receta
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[300px]">
              <input
                type="text"
                placeholder="🔍 Buscar receta por nombre..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="todas">Todas las recetas</option>
                <option value="plato">🍽️ Platos</option>
                <option value="sub_receta">🥘 Sub-recetas</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-600 text-xl">
            Cargando recetas...
          </div>
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
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Nombre</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Tipo</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Porciones</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Coste Total</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Precio Venta</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Food Cost</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recetasFiltradas.map((receta) => {
                  const foodCost = calcularFoodCost(receta.coste_total, receta.precio_venta);
                  const esSubReceta = receta.tipo === 'sub_receta';
                  
                  return (
                    <tr key={receta.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{receta.nombre}</div>
                        {esSubReceta && receta.produccion_gramos && (
                          <div className="text-sm text-gray-500">
                            Producción: {parseFloat(receta.produccion_gramos)}g
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          esSubReceta 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {esSubReceta ? '🥘 Sub-receta' : '🍽️ Plato'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600">{receta.porciones}</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900">
                        {receta.coste_total.toFixed(2)}€
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900">
                        {receta.precio_venta.toFixed(2)}€
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          parseFloat(foodCost) < 25 
                            ? 'bg-green-100 text-green-800' 
                            : parseFloat(foodCost) <= 33 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {foodCost}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => router.push(`/recetas/${receta.id}/editar`)}
                            className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-xs font-medium transition"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => eliminarReceta(receta.id, receta.nombre)}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs font-medium transition"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition"
          >
            ← Volver al Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
