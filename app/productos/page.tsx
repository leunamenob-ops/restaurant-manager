'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const ITEMS_POR_PAGINA = 100;

export default function ProductosPage() {
  const [productos, setProductos] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaActiva, setBusquedaActiva] = useState('');
  const [pagina, setPagina] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hayMas, setHayMas] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cargar productos
  const cargarProductos = useCallback(async (paginaActual: number, busquedaActual: string, reiniciar = false) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('ingredientes')
        .select('*, proveedores(nombre)')
        .order('nombre');

      if (busquedaActual) {
        query = query.or(`nombre.ilike.%${busquedaActual}%,categoria.ilike.%${busquedaActual}%,proveedor_nombre.ilike.%${busquedaActual}%`);
      }

      // Paginación
      const desde = paginaActual * ITEMS_POR_PAGINA;
      const hasta = desde + ITEMS_POR_PAGINA - 1;
      query = query.range(desde, hasta);

      const { data, error, count } = await query;

      if (error) throw error;

      if (reiniciar) {
        setProductos(data || []);
      } else {
        setProductos(prev => [...prev, ...(data || [])]);
      }

      setTotal(count || 0);
      setHayMas((data?.length || 0) === ITEMS_POR_PAGINA);
    } catch (err: any) {
      console.error('❌ Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar inicial
  useEffect(() => {
    cargarProductos(0, busquedaActiva, true);
  }, [busquedaActiva, cargarProductos]);

  // Cargar más
  function cargarMas() {
    const nuevaPagina = pagina + 1;
    setPagina(nuevaPagina);
    cargarProductos(nuevaPagina, busquedaActiva, false);
  }

  // Manejar búsqueda con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setBusquedaActiva(busqueda);
      setPagina(0);
    }, 400); // Espera 400ms antes de buscar

    return () => clearTimeout(timer);
  }, [busqueda]);

  // Mantener foco en el input cuando cambia la búsqueda
  useEffect(() => {
    if (inputRef.current && document.activeElement !== inputRef.current) {
      // Solo recuperar foco si el usuario no está interactuando con otra cosa
    }
  }, [productos]);

  return (
    <div className="min-h-screen bg-cyan-50">
      <header className="bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg sticky top-0 z-10">
        <div className="px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">📦 Gestión de Productos</h1>
              <p className="text-cyan-100 mt-1">
                {total > 0 ? `${total.toLocaleString()} ingredientes en base de datos` : 'Base de datos de ingredientes'}
              </p>
            </div>
            <a href="/" className="px-6 py-3 bg-white text-cyan-600 rounded-lg hover:bg-cyan-50 font-semibold transition">
              ← Volver a Recetas
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-8">
        {/* BUSCADOR */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <input
            ref={inputRef}
            type="text"
            placeholder=" Buscar por nombre, categoría o proveedor..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full px-4 py-3 border border-cyan-200 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none text-lg"
          />
          {busqueda && (
            <p className="text-sm text-cyan-600 mt-2">
              Buscando: "{busqueda}" {loading && '...'}
            </p>
          )}
        </div>

        {/* ERROR */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-6 rounded-lg mb-6">
            <h2 className="text-red-700 font-bold text-xl mb-2">Error al cargar</h2>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <button 
              onClick={() => cargarProductos(0, busquedaActiva, true)} 
              className="text-cyan-600 underline font-medium"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* TABLA */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-cyan-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-cyan-900">Nombre</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-cyan-900">Categoría</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-cyan-900">Proveedor</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-cyan-900">Unidad</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-cyan-900">Precio</th>
              </tr>
            </thead>
            <tbody>
              {productos.length > 0 ? (
                productos.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-cyan-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.nombre}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{p.categoria || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {p.proveedores?.nombre || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{p.unidad_compra || '-'}</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">
                      {p.precio_compra_actual ? `${Number(p.precio_compra_actual).toFixed(2)}€` : '-'}
                    </td>
                  </tr>
                ))
              ) : !loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron productos. {busqueda && 'Prueba con otra búsqueda.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>

          {/* CARGANDO */}
          {loading && productos.length === 0 && (
            <div className="py-8 text-center text-cyan-600">
              <p className="text-lg">Cargando productos...</p>
            </div>
          )}

          {/* BOTÓN CARGAR MÁS */}
          {hayMas && productos.length > 0 && (
            <div className="p-6 text-center border-t">
              <button
                onClick={cargarMas}
                disabled={loading}
                className="px-8 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-semibold transition disabled:opacity-50"
              >
                {loading ? 'Cargando...' : `Cargar más productos (mostrados: ${productos.length})`}
              </button>
            </div>
          )}
        </div>

        {/* INFO */}
        <div className="mt-4 text-sm text-gray-500 text-center">
          Mostrando {productos.length} de {total.toLocaleString()} productos
          {busquedaActiva && ` (filtrados por "${busquedaActiva}")`}
        </div>
      </div>
    </div>
  );
}