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
  
  // Modales
  const [mostrarModalIngrediente, setMostrarModalIngrediente] = useState(false);
  const [mostrarModalProveedor, setMostrarModalProveedor] = useState(false);
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [productoEditando, setProductoEditando] = useState<any>(null);
  const [productoEliminando, setProductoEliminando] = useState<any>(null);
  
  // Formulario ingrediente
  const [nuevoIngrediente, setNuevoIngrediente] = useState({
    nombre: '',
    categoria: 'Comida',
    unidad_compra: 'Kg.',
    precio_compra_actual: '',
    proveedor_nombre: ''
  });
  
  // Formulario proveedor
  const [nuevoProveedor, setNuevoProveedor] = useState({
    nombre: '',
    codigo: '',
    contacto: '',
    telefono: '',
    email: ''
  });
  
  const [paginaActual, setPaginaActual] = useState(1);
  const productosPorPagina = 50;
  
  const filtroRef = useRef<HTMLDivElement>(null);

  const cargarProductos = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 1. Cargar ingredientes
      let todosLosProductos: any[] = [];
      let desde = 0;
      const lote = 1000;
      let hayMas = true;

      while (hayMas) {
        const { data, error } = await supabase
          .from('ingredientes')
          .select('*')
          .order('nombre')
          .range(desde, desde + lote - 1);

        if (error) throw error;

        if (!data || data.length === 0) {
          hayMas = false;
        } else {
          todosLosProductos = todosLosProductos.concat(data);
          if (data.length < lote) {
            hayMas = false;
          } else {
            desde += lote;
          }
        }
      }

      const productosTransformados = todosLosProductos.map((item: any) => ({
        ...item,
        proveedor_nombre: item.proveedor_nombre || 'Sin proveedor'
      }));

      setTodosProductos(productosTransformados);
      
      // 2. Cargar proveedores EXPLÍCITAMENTE (para que aparezcan aunque no tengan ingredientes)
      const { data: proveedoresData, error: provError } = await supabase
        .from('proveedores')
        .select('nombre')
        .order('nombre');

      let listaProveedores: string[] = [];
      if (!provError && proveedoresData) {
        listaProveedores = proveedoresData.map((p: any) => p.nombre).filter(Boolean);
      }

      // 3. Combinar proveedores de la tabla y los que ya están en ingredientes
      const proveedoresDeIngredientes = Array.from(
        new Set(
          productosTransformados
            .map((p: any) => p.proveedor_nombre)
            .filter(Boolean)
        )
      ) as string[];

      const todosLosProveedores = Array.from(
        new Set([...listaProveedores, ...proveedoresDeIngredientes])
      ) as string[];
      
      setProveedoresUnicos(todosLosProveedores.sort());
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
      filtrados = filtrados.filter((p: any) => {
        const nombre = p.nombre?.toLowerCase() || '';
        const categoria = p.categoria?.toLowerCase() || '';
        return nombre.includes(busqueda) || categoria.includes(busqueda);
      });
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

  async function guardarIngrediente() {
    try {
      const { error } = await supabase
        .from('ingredientes')
        .insert([{
          nombre: nuevoIngrediente.nombre,
          categoria: nuevoIngrediente.categoria,
          unidad_compra: nuevoIngrediente.unidad_compra,
          precio_compra_actual: nuevoIngrediente.precio_compra_actual ? parseFloat(nuevoIngrediente.precio_compra_actual) : null,
          proveedor_nombre: nuevoIngrediente.proveedor_nombre
        }]);

      if (error) throw error;

      setMostrarModalIngrediente(false);
      setNuevoIngrediente({ nombre: '', categoria: 'Comida', unidad_compra: 'Kg.', precio_compra_actual: '', proveedor_nombre: '' });
      cargarProductos();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  }

  async function guardarProveedor() {
    try {
      const { error } = await supabase
        .from('proveedores')
        .insert([{
          id: crypto.randomUUID(), // Genera el ID explícitamente para evitar nulos
          nombre: nuevoProveedor.nombre,
          codigo: nuevoProveedor.codigo,
          contacto: nuevoProveedor.contacto,
          telefono: nuevoProveedor.telefono,
          email: nuevoProveedor.email
        }]);

      if (error) throw error;

      setMostrarModalProveedor(false);
      setNuevoProveedor({ nombre: '', codigo: '', contacto: '', telefono: '', email: '' });
      cargarProductos(); // Recarga para mostrar el nuevo proveedor inmediatamente
    } catch (err: any) {
      alert('Error al guardar proveedor: ' + err.message);
    }
  }

  function abrirEditar(producto: any) {
    setProductoEditando({ ...producto, precio_compra_actual: producto.precio_compra_actual || '' });
    setMostrarModalEditar(true);
  }

  async function guardarEdicion() {
    try {
      const { error } = await supabase
        .from('ingredientes')
        .update({
          nombre: productoEditando.nombre,
          categoria: productoEditando.categoria,
          unidad_compra: productoEditando.unidad_compra,
          precio_compra_actual: productoEditando.precio_compra_actual ? parseFloat(productoEditando.precio_compra_actual) : null,
          proveedor_nombre: productoEditando.proveedor_nombre
        })
        .eq('id', productoEditando.id);

      if (error) throw error;

      setMostrarModalEditar(false);
      setProductoEditando(null);
      cargarProductos();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  }

  function abrirEliminar(producto: any) {
    setProductoEliminando(producto);
  }

  async function confirmarEliminar() {
    try {
      const { error } = await supabase
        .from('ingredientes')
        .delete()
        .eq('id', productoEliminando.id);

      if (error) throw error;

      setProductoEliminando(null);
      cargarProductos();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
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
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Proveedores y Productos</h1>
                <p className="text-sm text-slate-500">
                  {productosFiltrados.length} de {todosProductos.length} ingredientes registrados
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setMostrarModalProveedor(true)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-all shadow-sm text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                Nuevo Proveedor
              </button>
              <button
                onClick={() => setMostrarModalIngrediente(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-all shadow-sm hover:shadow-md text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Nuevo Ingrediente
              </button>
              <a href="/dashboard" className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-all text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Dashboard
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* FILTROS */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Buscar por nombre o categoría
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  type="text"
                  placeholder="Ej: Aceite, Tomate, Verduras..."
                  value={busquedaNombre}
                  onChange={(e) => setBusquedaNombre(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm"
                />
              </div>
            </div>

            <div className="relative w-full md:w-auto" ref={filtroRef}>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Proveedores
              </label>
              <button
                onClick={() => setMostrarFiltroProveedores(!mostrarFiltroProveedores)}
                className="w-full md:w-auto px-4 py-2.5 border border-slate-300 rounded-lg font-medium transition-all hover:border-emerald-400 hover:bg-slate-50 flex items-center justify-between gap-2 text-sm text-slate-700"
              >
                <span className="truncate">
                  {proveedoresSeleccionados.length > 0 
                    ? `${proveedoresSeleccionados.length} seleccionado(s)`
                    : 'Todos los proveedores'
                  }
                </span>
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${mostrarFiltroProveedores ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>

              {mostrarFiltroProveedores && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-3 border-b border-slate-100 bg-slate-50">
                    <button
                      onClick={toggleTodosProveedores}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 w-full text-left"
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
                        className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={proveedoresSeleccionados.includes(proveedor)}
                          onChange={() => toggleProveedor(proveedor)}
                          className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                        />
                        <span className="text-sm text-slate-700 flex-1 truncate">{proveedor}</span>
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          {todosProductos.filter((p: any) => p.proveedor_nombre === proveedor).length}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {(busquedaNombre || proveedoresSeleccionados.length > 0) && (
              <div className="pt-6 w-full md:w-auto">
                <button
                  onClick={limpiarFiltros}
                  className="w-full md:w-auto px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-lg font-medium transition text-sm flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ERROR STATE */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-5 rounded-xl flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div className="flex-1">
              <h3 className="text-red-800 font-semibold text-sm">Error al cargar los datos</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
              <button onClick={cargarProductos} className="mt-3 text-sm font-medium text-red-700 hover:text-red-800 underline">
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* TABLA DE PRODUCTOS */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Categoría</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Proveedor</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Unidad</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Precio</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productosPagina.length > 0 ? (
                  productosPagina.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{p.nombre}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {p.categoria || 'General'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{p.proveedor_nombre || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-mono text-xs">{p.unidad_compra || '-'}</td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-emerald-600">
                        {p.precio_compra_actual ? Number(p.precio_compra_actual).toFixed(2) + ' €' : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => abrirEditar(p)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button
                            onClick={() => abrirEliminar(p)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Eliminar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : !loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <svg className="w-12 h-12 mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                        <p className="text-slate-600 font-medium">No se encontraron productos</p>
                        <p className="text-sm text-slate-400 mt-1">Prueba ajustando los filtros de búsqueda</p>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {loading && (
            <div className="py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-200 border-t-emerald-600 mb-3"></div>
              <p className="text-slate-600 font-medium">Cargando productos...</p>
            </div>
          )}
        </div>

        {/* PAGINACIÓN */}
        {totalPaginas > 1 && !loading && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="text-sm text-slate-500">
              Mostrando <span className="font-semibold text-slate-900">{indicePrimero + 1}</span> a{' '}
              <span className="font-semibold text-slate-900">{Math.min(indiceUltimo, productosFiltrados.length)}</span> de{' '}
              <span className="font-semibold text-slate-900">{productosFiltrados.length}</span> productos
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => irAPagina(1)}
                disabled={paginaActual === 1}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Primera
              </button>
              
              <button
                onClick={() => irAPagina(paginaActual - 1)}
                disabled={paginaActual === 1}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>

              {obtenerNumerosPagina().map((num, idx) => (
                num === -1 ? (
                  <span key={'dots-' + idx} className="px-2 text-slate-400">...</span>
                ) : (
                  <button
                    key={num}
                    onClick={() => irAPagina(num)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition ${
                      paginaActual === num
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {num}
                  </button>
                )
              ))}

              <button
                onClick={() => irAPagina(paginaActual + 1)}
                disabled={paginaActual === totalPaginas}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
              
              <button
                onClick={() => irAPagina(totalPaginas)}
                disabled={paginaActual === totalPaginas}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Última
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ================= MODALES ================= */}
      
      {/* MODAL AÑADIR INGREDIENTE */}
      {mostrarModalIngrediente && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Nuevo Ingrediente</h2>
              <button onClick={() => setMostrarModalIngrediente(false)} className="text-slate-400 hover:text-slate-600 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre *</label>
                <input
                  type="text"
                  value={nuevoIngrediente.nombre}
                  onChange={(e) => setNuevoIngrediente({...nuevoIngrediente, nombre: e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm"
                  placeholder="Ej: Tomate Raf"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Categoría</label>
                  <select
                    value={nuevoIngrediente.categoria}
                    onChange={(e) => setNuevoIngrediente({...nuevoIngrediente, categoria: e.target.value})}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm bg-white"
                  >
                    <option value="Comida">Comida</option>
                    <option value="Bebida">Bebida</option>
                    <option value="Limpieza">Limpieza</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Unidad</label>
                  <select
                    value={nuevoIngrediente.unidad_compra}
                    onChange={(e) => setNuevoIngrediente({...nuevoIngrediente, unidad_compra: e.target.value})}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm bg-white"
                  >
                    <option value="Kg.">Kg.</option>
                    <option value="Ud.">Ud.</option>
                    <option value="CAJA">CAJA</option>
                    <option value="L.">L.</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Precio de compra (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={nuevoIngrediente.precio_compra_actual}
                  onChange={(e) => setNuevoIngrediente({...nuevoIngrediente, precio_compra_actual: e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Proveedor</label>
                <select
                  value={nuevoIngrediente.proveedor_nombre}
                  onChange={(e) => setNuevoIngrediente({...nuevoIngrediente, proveedor_nombre: e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm bg-white"
                >
                  <option value="">Seleccionar proveedor...</option>
                  {proveedoresUnicos.map((prov) => (
                    <option key={prov} value={prov}>{prov}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={guardarIngrediente}
                disabled={!nuevoIngrediente.nombre}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold text-sm"
              >
                Guardar Ingrediente
              </button>
              <button
                onClick={() => setMostrarModalIngrediente(false)}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AÑADIR PROVEEDOR */}
      {mostrarModalProveedor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Nuevo Proveedor</h2>
              <button onClick={() => setMostrarModalProveedor(false)} className="text-slate-400 hover:text-slate-600 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre de la empresa *</label>
                <input
                  type="text"
                  value={nuevoProveedor.nombre}
                  onChange={(e) => setNuevoProveedor({...nuevoProveedor, nombre: e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm"
                  placeholder="Ej: CHEF FRUITS S.L."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Código de proveedor</label>
                <input
                  type="text"
                  value={nuevoProveedor.codigo}
                  onChange={(e) => setNuevoProveedor({...nuevoProveedor, codigo: e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm"
                  placeholder="Ej: 960000"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Persona de contacto</label>
                  <input
                    type="text"
                    value={nuevoProveedor.contacto}
                    onChange={(e) => setNuevoProveedor({...nuevoProveedor, contacto: e.target.value})}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm"
                    placeholder="Nombre"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Teléfono</label>
                  <input
                    type="tel"
                    value={nuevoProveedor.telefono}
                    onChange={(e) => setNuevoProveedor({...nuevoProveedor, telefono: e.target.value})}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm"
                    placeholder="600 000 000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={nuevoProveedor.email}
                  onChange={(e) => setNuevoProveedor({...nuevoProveedor, email: e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm"
                  placeholder="email@ejemplo.com"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={guardarProveedor}
                disabled={!nuevoProveedor.nombre}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold text-sm"
              >
                Guardar Proveedor
              </button>
              <button
                onClick={() => setMostrarModalProveedor(false)}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR INGREDIENTE */}
      {mostrarModalEditar && productoEditando && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Editar Ingrediente</h2>
              <button onClick={() => { setMostrarModalEditar(false); setProductoEditando(null); }} className="text-slate-400 hover:text-slate-600 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre *</label>
                <input
                  type="text"
                  value={productoEditando.nombre || ''}
                  onChange={(e) => setProductoEditando({...productoEditando, nombre: e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Categoría</label>
                  <select
                    value={productoEditando.categoria || 'Comida'}
                    onChange={(e) => setProductoEditando({...productoEditando, categoria: e.target.value})}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm bg-white"
                  >
                    <option value="Comida">Comida</option>
                    <option value="Bebida">Bebida</option>
                    <option value="Limpieza">Limpieza</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Unidad</label>
                  <select
                    value={productoEditando.unidad_compra || 'Kg.'}
                    onChange={(e) => setProductoEditando({...productoEditando, unidad_compra: e.target.value})}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm bg-white"
                  >
                    <option value="Kg.">Kg.</option>
                    <option value="Ud.">Ud.</option>
                    <option value="CAJA">CAJA</option>
                    <option value="L.">L.</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Precio de compra (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={productoEditando.precio_compra_actual || ''}
                  onChange={(e) => setProductoEditando({...productoEditando, precio_compra_actual: e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Proveedor</label>
                <select
                  value={productoEditando.proveedor_nombre || ''}
                  onChange={(e) => setProductoEditando({...productoEditando, proveedor_nombre: e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm bg-white"
                >
                  <option value="">Seleccionar proveedor...</option>
                  {proveedoresUnicos.map((prov) => (
                    <option key={prov} value={prov}>{prov}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={guardarEdicion}
                disabled={!productoEditando.nombre}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold text-sm"
              >
                Actualizar Cambios
              </button>
              <button
                onClick={() => { setMostrarModalEditar(false); setProductoEditando(null); }}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINAR */}
      {productoEliminando && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">¿Eliminar ingrediente?</h2>
            <p className="text-slate-600 text-sm mb-6">
              Estás a punto de eliminar <strong className="text-slate-900">{productoEliminando.nombre}</strong>. Esta acción no se puede deshacer y podría afectar a las recetas que lo utilizan.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={confirmarEliminar}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold text-sm"
              >
                Sí, eliminar
              </button>
              <button
                onClick={() => setProductoEliminando(null)}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
