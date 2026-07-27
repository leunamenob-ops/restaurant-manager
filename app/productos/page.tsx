'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ProductosPage() {
  const [todosProductos, setTodosProductos] = useState<any[]>([]);
  const [productosFiltrados, setProductosFiltrados] = useState<any[]>([]);
  const [busquedaNombre, setBusquedaNombre] = useState('');
  const [proveedoresUnicos, setProveedoresUnicos] = useState<string[]>([]);
  const [proveedoresSeleccionados, setProveedoresSeleccionados] = useState<string[]>([]);
  const [mostrarFiltroProveedores, setMostrarFiltroProveedores] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [paginaActual, setPaginaActual] = useState(1);
  const productosPorPagina = 50;
  
  const filtroRef = useRef<HTMLDivElement>(null);

  const cargarProductos = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('ingredientes')
        .select('*')
        .order('nombre')
        .range(0, 20000);

      if (error) throw error;

      const productosTransformados = data?.map((item: any) => ({
        ...item,
        proveedor_nombre: item.proveedor_nombre || 'Sin proveedor'
      })) || [];

      setTodosProductos(productosTransformados);
      
      const proveedores = Array.from(
        new Set(
          productosTransformados
            .map((p: any) => p.proveedor_nombre)
            .filter(Boolean)
        )
      ) as string[];
      
      setProveedoresUnicos(proveedores.sort());
      setProductosFiltrados(productosTransformados);
      setPaginaActual(1);
      
    } catch (err: any) {
      console.error('Error cargando productos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  useEffect(() => {
    let filtrados = [...todosProductos];

    if (busquedaNombre.trim()) {
      const busqueda = busquedaNombre.toLowerCase();
      filtrados = filtrados.filter((p: any) => 
        p.nombre.toLowerCase().includes(busqueda) ||
        (p.categoria && p.categoria.toLowerCase().includes(busqueda))
      );
    }

    if (proveedoresSeleccionados.length > 0) {
      filtrados = filtrados.filter((p: any) => 
        proveedoresSeleccionados.includes(p.proveedor_nombre)
      );
    }

    setProductosFiltrados(filtrados);
    setPaginaActual(1);
  }, [busquedaNombre, proveedoresSeleccionados, todosProductos]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filtroRef.current && !filtroRef.current.contains(event.target as Node)) {
        setMostrarFiltroProveedores(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function toggleProveedor(proveedor: string) {
    setProveedoresSeleccionados(prev => 
      prev.includes(proveedor)
        ? prev.filter(p => p !== proveedor)
        : [...prev, proveedor]
    );
  }

  function toggleTodosProveedores() {
    if (proveedoresSeleccionados.length === proveedoresUnicos.length) {
      setProveedoresSeleccionados([]);
    } else {
      setProveedoresSeleccionados([...proveedoresUnicos]);
    }
  }

  function limpiarFiltros() {
    setBusquedaNombre('');
    setProveedoresSeleccionados([]);
  }

  const indiceUltimo = paginaActual * productosPorPagina;
  const indicePrimero = indiceUltimo - productosPorPagina;
  const productosPagina = productosFiltrados.slice(indicePrimero, indiceUltimo);
  const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina);

  const irAPagina = (pagina: number) => {
    if (pagina < 1 || pagina > totalPaginas) return;
    setPaginaActual(pagina);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const obtenerNumerosPagina = () => {
    const numeros: number[] = [];
    const total = totalPaginas;
    const actual = paginaActual;
    
    if (total <= 7) {
      for (let i = 1; i <= total; i++) numeros.push(i);
    } else {
      numeros.push(1);
      if (actual > 3) numeros.push(-1);
      const inicio = Math.max(2, actual - 1);
      const fin = Math.min(total - 1, actual + 1);
      for (let i = inicio; i <= fin; i++) numeros.push(i);
      if (actual < total - 2) numeros.push(-1);
      numeros.push(total);
    }
    return numeros;
  };

  return (
    <div className="min-h-screen bg-cyan-50">
      <header className="bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg sticky top-0 z-10">
        <div className="px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Gestion de Productos</h1>
              <p className="text-cyan-100 mt-1">
                {productosFiltrados.length} de {todosProductos.length} ingredientes
              </p>
            </div>
            <a href="/dashboard" className="px-6 py-3 bg-white text-cyan-600 rounded-lg hover:bg-cyan-50 font-semibold transition">
              Volver al Dashboard
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex gap-4 items-start flex-wrap">
            <div className="flex-1 min-w-[250px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar por nombre o categoria
              </label>
              <input
                type="text"
                placeholder="Ej: Aceite, Tomate, Verduras..."
                value={busquedaNombre}
                onChange={(e) => setBusquedaNombre(e.target.value)}
                className="w-full px-4 py-3 border border-cyan-200 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
              />
            </div>

            <div className="relative" ref={filtroRef}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Proveedores
              </label>
              <button
                onClick={() => setMostrarFiltroProveedores(!mostrarFiltroProveedores)}
                className="px-6 py-3 border-2 border-cyan-200 rounded-lg font-medium transition flex items-center gap-2 hover:border-cyan-300"
              >
                {proveedoresSeleccionados.length > 0 
                  ? proveedoresSeleccionados.length + ' seleccionado(s)'
                  : 'Todos los proveedores'
                }
                <span>▼</span>
              </button>

              {mostrarFiltroProveedores && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white border-2 border-cyan-200 rounded-lg shadow-xl z-20">
                  <div className="p-4 border-b border-cyan-100">
                    <button
                      onClick={toggleTodosProveedores}
                      className="text-sm font-medium text-cyan-600 hover:text-cyan-700"
                    >
                      {proveedoresSeleccionados.length === proveedoresUnicos.length 
                        ? 'Deseleccionar todos' 
                        : 'Seleccionar todos'}
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-2">
                    {proveedoresUnicos.map((proveedor) => (
                      <label
                        key={proveedor}
                        className="flex items-center gap-3 p-2 hover:bg-cyan-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={proveedoresSeleccionados.includes(proveedor)}
                          onChange={() => toggleProveedor(proveedor)}
                          className="w-4 h-4 text-cyan-600 border-cyan-300 rounded focus:ring-cyan-500"
                        />
                        <span className="text-sm text-gray-700 flex-1">{proveedor}</span>
                        <span className="text-xs text-gray-400">
                          {todosProductos.filter((p: any) => p.proveedor_nombre === proveedor).length}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {(busquedaNombre || proveedoresSeleccionados.length > 0) && (
              <div className="pt-8">
                <button
                  onClick={limpiarFiltros}
                  className="px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg font-medium transition"
                >
                  Limpiar
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 p-6 rounded-lg mb-6">
            <h2 className="text-red-700 font-bold text-xl mb-2">Error al cargar</h2>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <button onClick={cargarProductos} className="text-cyan-600 underline font-medium">
              Reintentar
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-cyan-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-cyan-900">Nombre</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-cyan-900">Categoria</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-cyan-900">Proveedor</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-cyan-900">Unidad</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-cyan-900">Precio</th>
              </tr>
            </thead>
            <tbody>
              {productosPagina.length > 0 ? (
                productosPagina.map((p: any) => (
                  <tr key={p.id} className="border-t hover:bg-cyan-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.nombre}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{p.categoria || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{p.proveedor_nombre || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{p.unidad_compra || '-'}</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">
                      {p.precio_compra_actual ? Number(p.precio_compra_actual).toFixed(2) + '€' : '-'}
                    </td>
                  </tr>
                ))
              ) : !loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron productos.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>

          {loading && (
            <div className="py-8 text-center text-cyan-600">
              <p className="text-lg">Cargando productos...</p>
            </div>
          )}
        </div>

        {totalPaginas > 1 && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-600">
                Mostrando {indicePrimero + 1} a {Math.min(indiceUltimo, productosFiltrados.length)} de {productosFiltrados.length} productos
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Pagina</span>
                <input
                  type="number"
                  min={1}
                  max={totalPaginas}
                  value={paginaActual}
                  onChange={(e) => {
                    const num = parseInt(e.target.value);
                    if (num >= 1 && num <= totalPaginas) irAPagina(num);
                  }}
                  className="w-16 px-2 py-1 border border-cyan-200 rounded text-center font-semibold"
                />
                <span>de {totalPaginas}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1 flex-wrap">
              <button
                onClick={() => irAPagina(1)}
                disabled={paginaActual === 1}
                className="px-3 py-2 border border-cyan-200 rounded-lg text-sm font-medium text-cyan-600 hover:bg-cyan-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Primera
              </button>
              
              <button
                onClick={() => irAPagina(paginaActual - 1)}
                disabled={paginaActual === 1}
                className="px-3 py-2 border border-cyan-200 rounded-lg text-sm font-medium text-cyan-600 hover:bg-cyan-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Anterior
              </button>

              {obtenerNumerosPagina().map((num, idx) => (
                num === -1 ? (
                  <span key={'dots-' + idx} className="px-2 py-2 text-gray-400">...</span>
                ) : (
                  <button
                    key={num}
                    onClick={() => irAPagina(num)}
                    className={'px-3 py-2 rounded-lg text-sm font-medium transition ' + (
                      paginaActual === num
                        ? 'bg-cyan-600 text-white'
                        : 'border border-cyan-200 text-cyan-600 hover:bg-cyan-50'
                    )}
                  >
                    {num}
                  </button>
                )
              ))}

              <button
                onClick={() => irAPagina(paginaActual + 1)}
                disabled={paginaActual === totalPaginas}
                className="px-3 py-2 border border-cyan-200 rounded-lg text-sm font-medium text-cyan-600 hover:bg-cyan-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Siguiente
              </button>
              
              <button
                onClick={() => irAPagina(totalPaginas)}
                disabled={paginaActual === totalPaginas}
                className="px-3 py-2 border border-cyan-200 rounded-lg text-sm font-medium text-cyan-600 hover:bg-cyan-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Ultima
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 text-sm text-gray-500 text-center">
          Total: {todosProductos.length} productos en base de datos
        </div>
      </div>
    </div>
  );
}
