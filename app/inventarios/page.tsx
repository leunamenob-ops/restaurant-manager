'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function InventariosPage() {
  const router = useRouter();
  const [tabActiva, setTabActiva] = useState<'stock' | 'movimientos' | 'conteo' | 'alertas'>('stock');
  const [loading, setLoading] = useState(true);
  
  // Stock con filtros
  const [todosProductos, setTodosProductos] = useState<any[]>([]);
  const [productosFiltrados, setProductosFiltrados] = useState<any[]>([]);
  const [busquedaNombre, setBusquedaNombre] = useState('');
  const [categoriasUnicas, setCategoriasUnicas] = useState<string[]>([]);
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<string[]>([]);
  const [mostrarFiltroCategorias, setMostrarFiltroCategorias] = useState(false);
  
  // Ubicaciones
  const [ubicaciones, setUbicaciones] = useState<any[]>([]);
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState<string>('todas');
  
  // Movimientos
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  
  // Conteo
  const [conteoActivo, setConteoActivo] = useState<any>(null);
  const [itemsConteo, setItemsConteo] = useState<any[]>([]);
  const [guardandoConteo, setGuardandoConteo] = useState(false);
  
  // Modal ajuste
  const [modalAjuste, setModalAjuste] = useState<any>(null);
  const [tipoAjuste, setTipoAjuste] = useState<'entrada' | 'salida' | 'merma' | 'ajuste'>('ajuste');
  const [cantidadAjuste, setCantidadAjuste] = useState('');
  const [motivoAjuste, setMotivoAjuste] = useState('');
  
  // Modal ubicación
  const [modalUbicacion, setModalUbicacion] = useState<any>(null);
  
  const filtroRef = useRef<HTMLDivElement>(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    await Promise.all([cargarStock(), cargarMovimientos(), cargarUbicaciones()]);
    setLoading(false);
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  async function cargarStock() {
    const { data } = await supabase
      .from('stock')
      .select(`
        *,
        ubicaciones:ubicacion_id (
          id,
          nombre,
          tipo
        )
      `)
      .order('ingrediente_nombre');
    
    if (data) {
      setTodosProductos(data);
      setProductosFiltrados(data);
      
      const categorias = Array.from(
        new Set(
          data.map((p: any) => p.categoria || 'Sin categoría')
        )
      ) as string[];
      setCategoriasUnicas(categorias.sort());
    }
  }

  async function cargarUbicaciones() {
    const { data } = await supabase
      .from('ubicaciones')
      .select('*')
      .order('orden');
    if (data) setUbicaciones(data);
  }

  async function cargarMovimientos() {
    const { data } = await supabase
      .from('movimientos_stock')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) setMovimientos(data);
  }

  // Filtrado
  useEffect(() => {
    let filtrados = [...todosProductos];

    if (busquedaNombre.trim()) {
      const busqueda = busquedaNombre.toLowerCase();
      filtrados = filtrados.filter((p: any) => {
        const nombre = p.ingrediente_nombre?.toLowerCase() || '';
        const categoria = p.categoria?.toLowerCase() || '';
        return nombre.includes(busqueda) || categoria.includes(busqueda);
      });
    }

    if (categoriasSeleccionadas.length > 0) {
      filtrados = filtrados.filter((p: any) => 
        categoriasSeleccionadas.includes(p.categoria || 'Sin categoría')
      );
    }

    if (ubicacionSeleccionada !== 'todas') {
      filtrados = filtrados.filter((p: any) => 
        p.ubicaciones?.id === ubicacionSeleccionada
      );
    }

    setProductosFiltrados(filtrados);
  }, [busquedaNombre, categoriasSeleccionadas, ubicacionSeleccionada, todosProductos]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filtroRef.current && !filtroRef.current.contains(event.target as Node)) {
        setMostrarFiltroCategorias(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function toggleCategoria(categoria: string) {
    setCategoriasSeleccionadas(prev => 
      prev.includes(categoria)
        ? prev.filter(c => c !== categoria)
        : [...prev, categoria]
    );
  }

  function toggleTodasCategorias() {
    if (categoriasSeleccionadas.length === categoriasUnicas.length) {
      setCategoriasSeleccionadas([]);
    } else {
      setCategoriasSeleccionadas([...categoriasUnicas]);
    }
  }

  function limpiarFiltros() {
    setBusquedaNombre('');
    setCategoriasSeleccionadas([]);
    setUbicacionSeleccionada('todas');
  }

  async function abrirModalUbicacion(item: any) {
    setModalUbicacion(item);
  }

  async function confirmarUbicacion(ubicacionId: string) {
    if (!modalUbicacion) return;
    
    const { error } = await supabase
      .from('stock')
      .update({ ubicacion_id: ubicacionId })
      .eq('id', modalUbicacion.id);
    
    if (error) {
      alert('Error: ' + error.message);
      return;
    }
    
    setModalUbicacion(null);
    await cargarStock();
  }

  // ========== STOCK ==========
  const stockBajo = todosProductos.filter((s) => s.stock_minimo > 0 && s.cantidad_actual <= s.stock_minimo);
  const stockAgotado = todosProductos.filter((s) => s.cantidad_actual === 0);

  async function abrirModalAjuste(item: any, tipo: 'entrada' | 'salida' | 'merma' | 'ajuste') {
    setModalAjuste(item);
    setTipoAjuste(tipo);
    setCantidadAjuste('');
    setMotivoAjuste('');
  }

  async function confirmarAjuste() {
    if (!modalAjuste || !cantidadAjuste) {
      alert('Completa todos los campos');
      return;
    }
    const cantidad = parseFloat(cantidadAjuste);
    if (isNaN(cantidad) || cantidad <= 0) {
      alert('Cantidad no válida');
      return;
    }

    let nuevaCantidad = modalAjuste.cantidad_actual;
    if (tipoAjuste === 'entrada' || tipoAjuste === 'ajuste') {
      nuevaCantidad += cantidad;
    } else {
      nuevaCantidad -= cantidad;
      if (nuevaCantidad < 0) nuevaCantidad = 0;
    }

    const { error: errorStock } = await supabase
      .from('stock')
      .update({ 
        cantidad_actual: nuevaCantidad,
        updated_at: new Date().toISOString()
      })
      .eq('id', modalAjuste.id);

    if (errorStock) {
      alert('Error: ' + errorStock.message);
      return;
    }

    const { error: errorMov } = await supabase
      .from('movimientos_stock')
      .insert([{
        ingrediente_id: modalAjuste.ingrediente_id,
        ingrediente_nombre: modalAjuste.ingrediente_nombre,
        tipo: tipoAjuste,
        cantidad: cantidad,
        motivo: motivoAjuste || tipoAjuste,
        usuario: 'Usuario',
        hotel_id: modalAjuste.hotel_id
      }]);

    if (errorMov) {
      alert('Error registrando movimiento: ' + errorMov.message);
      return;
    }

    setModalAjuste(null);
    await cargarDatos();
    alert(`✅ ${tipoAjuste === 'entrada' ? 'Entrada' : tipoAjuste === 'salida' ? 'Salida' : tipoAjuste === 'merma' ? 'Merma' : 'Ajuste'} registrada correctamente`);
  }

  // ========== CONTEO CÍCLICO ==========
  async function iniciarConteo() {
    const { data: conteo, error } = await supabase
      .from('conteos')
      .insert([{
        usuario: 'Usuario',
        estado: 'borrador',
        total_items: todosProductos.length,
        hotel_id: '00000000-0000-0000-0000-000000000001'
      }])
      .select()
      .single();

    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    const items = todosProductos.map((s) => ({
      conteo_id: conteo.id,
      ingrediente_id: s.ingrediente_id,
      ingrediente_nombre: s.ingrediente_nombre,
      cantidad_teorica: s.cantidad_actual,
      cantidad_real: s.cantidad_actual,
      diferencia: 0,
      motivo: '',
      hotel_id: s.hotel_id
    }));

    await supabase.from('conteo_items').insert(items);
    setConteoActivo(conteo);
    setItemsConteo(items);
    setTabActiva('conteo');
  }

  function actualizarCantidadReal(id: string, valor: string) {
    const real = parseFloat(valor) || 0;
    setItemsConteo(prev => prev.map(item => {
      if (item.id === id) {
        const diferencia = real - item.cantidad_teorica;
        return { ...item, cantidad_real: real, diferencia };
      }
      return item;
    }));
  }

  function actualizarMotivo(id: string, valor: string) {
    setItemsConteo(prev => prev.map(item => 
      item.id === id ? { ...item, motivo: valor } : item
    ));
  }

  async function confirmarConteo() {
    if (!conteoActivo) return;
    if (!confirm('¿Confirmar conteo? Se actualizará el stock con las cantidades reales.')) return;

    setGuardandoConteo(true);
    const diferencias = itemsConteo.filter(i => i.diferencia !== 0);

    await supabase
      .from('conteos')
      .update({ estado: 'confirmado', total_diferencias: diferencias.length })
      .eq('id', conteoActivo.id);

    for (const item of itemsConteo) {
      await supabase
        .from('conteo_items')
        .update({
          cantidad_real: item.cantidad_real,
          diferencia: item.diferencia,
          motivo: item.motivo
        })
        .eq('id', item.id);

      if (item.diferencia !== 0) {
        await supabase
          .from('stock')
          .update({ cantidad_actual: item.cantidad_real })
          .eq('ingrediente_id', item.ingrediente_id);

        await supabase
          .from('movimientos_stock')
          .insert([{
            ingrediente_id: item.ingrediente_id,
            ingrediente_nombre: item.ingrediente_nombre,
            tipo: 'ajuste',
            cantidad: Math.abs(item.diferencia),
            motivo: `Conteo cíclico: ${item.motivo || 'Ajuste por conteo'}`,
            referencia: conteoActivo.id,
            usuario: 'Usuario',
            hotel_id: item.hotel_id
          }]);
      }
    }

    setGuardandoConteo(false);
    setConteoActivo(null);
    setItemsConteo([]);
    await cargarDatos();
    alert(`✅ Conteo confirmado. ${diferencias.length} ajustes realizados.`);
  }

  // ========== FILTROS MOVIMIENTOS ==========
  const movimientosFiltrados = movimientos.filter(m => 
    filtroTipo === 'todos' ? true : m.tipo === filtroTipo
  );

  const colorTipo = (tipo: string) => {
    switch (tipo) {
      case 'entrada': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'salida': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'merma': return 'bg-red-100 text-red-800 border-red-200';
      case 'ajuste': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const tabs = [
    { id: 'stock', label: '📦 Stock Actual', count: productosFiltrados.length },
    { id: 'movimientos', label: '📋 Movimientos', count: movimientos.length },
    { id: 'conteo', label: '📝 Conteo Cíclico', count: null },
    { id: 'alertas', label: '⚠️ Alertas', count: stockBajo.length + stockAgotado.length },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Inventarios</h1>
                <p className="text-sm text-slate-500">Control de stock y movimientos de almacén</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
  onClick={() => router.push('/inventarios/ubicaciones')}
  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium transition text-sm flex items-center gap-2"
>
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
  Ubicaciones
</button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* DASHBOARD RESUMEN */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Productos</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{todosProductos.length}</p>
            <p className="text-xs text-slate-500 mt-1">en inventario</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase">Stock Bajo</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stockBajo.length}</p>
            <p className="text-xs text-slate-500 mt-1">bajo mínimo</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase">Agotados</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stockAgotado.length}</p>
            <p className="text-xs text-slate-500 mt-1">sin stock</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase">Movimientos</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{movimientos.length}</p>
            <p className="text-xs text-slate-500 mt-1">registrados</p>
          </div>
        </div>

        {/* TABS */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
          <div className="flex overflow-x-auto border-b border-slate-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTabActiva(tab.id as any)}
                className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition border-b-2 ${
                  tabActiva === tab.id
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ========== TAB: STOCK ========== */}
        {tabActiva === 'stock' && (
          <div>
            {/* FILTROS */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
              <div className="flex flex-col md:flex-row gap-4 items-start">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Buscar por nombre o categoría
                  </label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Ej: Tomate, Verduras, Frutas..."
                      value={busquedaNombre}
                      onChange={(e) => setBusquedaNombre(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm"
                    />
                  </div>
                </div>

                <div className="relative w-full md:w-auto" ref={filtroRef}>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Categorías
                  </label>
                  <button
                    onClick={() => setMostrarFiltroCategorias(!mostrarFiltroCategorias)}
                    className="w-full md:w-auto px-4 py-2.5 border border-slate-300 rounded-lg font-medium transition-all hover:border-indigo-400 hover:bg-slate-50 flex items-center justify-between gap-2 text-sm text-slate-700"
                  >
                    <span className="truncate">
                      {categoriasSeleccionadas.length > 0 
                        ? `${categoriasSeleccionadas.length} seleccionada(s)`
                        : 'Todas las categorías'
                      }
                    </span>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${mostrarFiltroCategorias ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {mostrarFiltroCategorias && (
                    <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-3 border-b border-slate-100 bg-slate-50">
                        <button
                          onClick={toggleTodasCategorias}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 w-full text-left"
                        >
                          {categoriasSeleccionadas.length === categoriasUnicas.length 
                            ? 'Deseleccionar todas' 
                            : 'Seleccionar todas'}
                        </button>
                      </div>
                      <div className="max-h-64 overflow-y-auto p-2">
                        {categoriasUnicas.map((categoria) => (
                          <label
                            key={categoria}
                            className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={categoriasSeleccionadas.includes(categoria)}
                              onChange={() => toggleCategoria(categoria)}
                              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                            />
                            <span className="text-sm text-slate-700 flex-1 truncate">{categoria}</span>
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                              {todosProductos.filter((p: any) => (p.categoria || 'Sin categoría') === categoria).length}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="w-full md:w-auto">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Ubicación
                  </label>
                  <select
                    value={ubicacionSeleccionada}
                    onChange={(e) => setUbicacionSeleccionada(e.target.value)}
                    className="w-full md:w-auto px-4 py-2.5 border border-slate-300 rounded-lg font-medium transition-all hover:border-indigo-400 hover:bg-slate-50 text-sm text-slate-700 bg-white"
                  >
                    <option value="todas">Todas las ubicaciones</option>
                    {ubicaciones.map((ub) => (
                      <option key={ub.id} value={ub.id}>{ub.nombre}</option>
                    ))}
                  </select>
                </div>

                {(busquedaNombre || categoriasSeleccionadas.length > 0 || ubicacionSeleccionada !== 'todas') && (
                  <div className="pt-6 w-full md:w-auto">
                    <button
                      onClick={limpiarFiltros}
                      className="w-full md:w-auto px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-lg font-medium transition text-sm flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Limpiar filtros
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* TABLA DE STOCK */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase">Producto</th>
                      <th className="px-6 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase">Stock Actual</th>
                      <th className="px-6 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase">Mínimo</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase">Ubicación</th>
                      <th className="px-6 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase">Estado</th>
                      <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-200 border-t-indigo-600"></div>
                          <p className="text-slate-600 font-medium mt-3">Cargando stock...</p>
                        </td>
                      </tr>
                    ) : productosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                          <p className="text-lg font-medium">No se encontraron productos</p>
                          <p className="text-sm mt-1">Prueba ajustando los filtros de búsqueda</p>
                        </td>
                      </tr>
                    ) : (
                      productosFiltrados.map((item) => {
                        const estado = item.cantidad_actual === 0 ? 'agotado' : 
                                      item.stock_minimo > 0 && item.cantidad_actual <= item.stock_minimo ? 'bajo' : 'normal';
                        return (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <p className="text-sm font-medium text-slate-900">{item.ingrediente_nombre}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{item.categoria || 'Sin categoría'}</p>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`text-sm font-bold ${
                                estado === 'agotado' ? 'text-red-600' : 
                                estado === 'bajo' ? 'text-amber-600' : 'text-emerald-600'
                              }`}>
                                {item.cantidad_actual}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center text-sm text-slate-600">{item.stock_minimo || '-'}</td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {item.ubicaciones?.nombre ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium">
                                  {item.ubicaciones.nombre}
                                </span>
                              ) : (
                                <button
                                  onClick={() => abrirModalUbicacion(item)}
                                  className="text-indigo-600 hover:text-indigo-700 underline text-xs font-medium"
                                >
                                  + Asignar ubicación
                                </button>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                estado === 'agotado' ? 'bg-red-100 text-red-800 border-red-200' :
                                estado === 'bajo' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                'bg-emerald-100 text-emerald-800 border-emerald-200'
                              }`}>
                                {estado === 'agotado' ? 'Agotado' : estado === 'bajo' ? 'Stock Bajo' : 'Normal'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => abrirModalAjuste(item, 'entrada')}
                                  className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 transition"
                                  title="Entrada"
                                >
                                  + Entrada
                                </button>
                                <button
                                  onClick={() => abrirModalAjuste(item, 'salida')}
                                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                                  title="Salida"
                                >
                                  - Salida
                                </button>
                                <button
                                  onClick={() => abrirModalAjuste(item, 'merma')}
                                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition"
                                  title="Merma"
                                >
                                  Merma
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========== TAB: MOVIMIENTOS ========== */}
        {tabActiva === 'movimientos' && (
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Filtrar por tipo
              </label>
              <div className="flex flex-wrap gap-2">
                {['todos', 'entrada', 'salida', 'merma', 'ajuste'].map((tipo) => (
                  <button
                    key={tipo}
                    onClick={() => setFiltroTipo(tipo)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      filtroTipo === tipo
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase">Fecha</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase">Producto</th>
                      <th className="px-6 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase">Tipo</th>
                      <th className="px-6 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase">Cantidad</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase">Motivo</th>
                      <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase">Usuario</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {movimientosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                          <p className="text-lg font-medium">No hay movimientos registrados</p>
                          <p className="text-sm mt-1">Los movimientos aparecerán aquí cuando registres entradas, salidas o mermas</p>
                        </td>
                      </tr>
                    ) : (
                      movimientosFiltrados.map((mov) => (
                        <tr key={mov.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {new Date(mov.created_at).toLocaleString('es-ES', { 
                              day: '2-digit', month: '2-digit', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">{mov.ingrediente_nombre}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${colorTipo(mov.tipo)}`}>
                              {mov.tipo}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-bold text-slate-900">{mov.cantidad}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{mov.motivo || '-'}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{mov.usuario}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========== TAB: CONTEO CÍCLICO ========== */}
        {tabActiva === 'conteo' && (
          <div>
            {!conteoActivo ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Conteo Cíclico de Inventario</h2>
                <p className="text-slate-600 mb-6 max-w-md mx-auto">
                  Inicia un conteo para verificar el stock real de todos los productos. 
                  Compara las cantidades teóricas con las reales y ajusta automáticamente.
                </p>
                <button
                  onClick={iniciarConteo}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition shadow-lg"
                >
                  Iniciar Nuevo Conteo
                </button>
              </div>
            ) : (
              <div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Conteo en curso</h2>
                      <p className="text-sm text-slate-500">
                        {itemsConteo.filter(i => i.diferencia !== 0).length} diferencias detectadas de {itemsConteo.length} productos
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          if (confirm('¿Cancelar conteo? Se perderán los datos.')) {
                            setConteoActivo(null);
                            setItemsConteo([]);
                          }
                        }}
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition text-sm"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={confirmarConteo}
                        disabled={guardandoConteo}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition text-sm disabled:opacity-50"
                      >
                        {guardandoConteo ? 'Guardando...' : 'Confirmar Conteo'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase">Producto</th>
                          <th className="px-6 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase">Stock Teórico</th>
                          <th className="px-6 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase">Stock Real</th>
                          <th className="px-6 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase">Diferencia</th>
                          <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase">Motivo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {itemsConteo.map((item) => (
                          <tr key={item.id} className={item.diferencia !== 0 ? 'bg-amber-50/50' : ''}>
                            <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.ingrediente_nombre}</td>
                            <td className="px-6 py-4 text-center text-sm text-slate-600">{item.cantidad_teorica}</td>
                            <td className="px-6 py-4 text-center">
                              <input
                                type="number"
                                step="0.01"
                                value={item.cantidad_real}
                                onChange={(e) => actualizarCantidadReal(item.id, e.target.value)}
                                className="w-24 px-3 py-1.5 border border-slate-300 rounded-lg text-center text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`text-sm font-bold ${
                                item.diferencia > 0 ? 'text-emerald-600' : 
                                item.diferencia < 0 ? 'text-red-600' : 'text-slate-400'
                              }`}>
                                {item.diferencia > 0 ? '+' : ''}{item.diferencia.toFixed(2)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <input
                                type="text"
                                value={item.motivo || ''}
                                onChange={(e) => actualizarMotivo(item.id, e.target.value)}
                                placeholder="Motivo de diferencia..."
                                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========== TAB: ALERTAS ========== */}
        {tabActiva === 'alertas' && (
          <div>
            {stockBajo.length === 0 && stockAgotado.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">¡Todo en orden!</h2>
                <p className="text-slate-600">No hay alertas de stock en este momento.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {stockAgotado.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
                    <div className="p-4 bg-red-50 border-b border-red-200">
                      <h2 className="font-bold text-red-800 flex items-center gap-2">
                        <span className="text-xl">🚨</span> Productos Agotados ({stockAgotado.length})
                      </h2>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {stockAgotado.map((item) => (
                        <div key={item.id} className="p-4 flex justify-between items-center hover:bg-red-50/50">
                          <div>
                            <p className="font-semibold text-slate-900">{item.ingrediente_nombre}</p>
                            <p className="text-sm text-slate-500">Stock: 0</p>
                          </div>
                          <button
                            onClick={() => abrirModalAjuste(item, 'entrada')}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition text-sm"
                          >
                            + Registrar Entrada
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {stockBajo.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden">
                    <div className="p-4 bg-amber-50 border-b border-amber-200">
                      <h2 className="font-bold text-amber-800 flex items-center gap-2">
                        <span className="text-xl">⚠️</span> Stock Bajo ({stockBajo.length})
                      </h2>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {stockBajo.map((item) => (
                        <div key={item.id} className="p-4 flex justify-between items-center hover:bg-amber-50/50">
                          <div>
                            <p className="font-semibold text-slate-900">{item.ingrediente_nombre}</p>
                            <p className="text-sm text-slate-500">
                              Actual: <span className="font-bold text-amber-600">{item.cantidad_actual}</span> / 
                              Mínimo: {item.stock_minimo}
                            </p>
                          </div>
                          <button
                            onClick={() => abrirModalAjuste(item, 'entrada')}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition text-sm"
                          >
                            + Registrar Entrada
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL AJUSTE */}
      {modalAjuste && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {tipoAjuste === 'entrada' ? ' Entrada de Stock' :
                 tipoAjuste === 'salida' ? '📤 Salida de Stock' :
                 tipoAjuste === 'merma' ? '🗑️ Registrar Merma' : '⚙️ Ajuste de Stock'}
              </h2>
              <button onClick={() => setModalAjuste(null)} className="text-slate-400 hover:text-slate-600 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-slate-600">Producto:</p>
              <p className="font-bold text-slate-900">{modalAjuste.ingrediente_nombre}</p>
              <p className="text-sm text-slate-600 mt-2">Stock actual: <span className="font-bold text-indigo-600">{modalAjuste.cantidad_actual}</span></p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Cantidad *</label>
                <input
                  type="number"
                  step="0.01"
                  value={cantidadAjuste}
                  onChange={(e) => setCantidadAjuste(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  placeholder="0.00"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Motivo / Observaciones</label>
                <textarea
                  value={motivoAjuste}
                  onChange={(e) => setMotivoAjuste(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  rows={3}
                  placeholder="Ej: Recepción de pedido, Rotura, Caducidad..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={confirmarAjuste}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold text-sm"
              >
                Confirmar
              </button>
              <button
                onClick={() => setModalAjuste(null)}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ASIGNAR UBICACIÓN */}
      {modalUbicacion && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Asignar Ubicación</h2>
              <button onClick={() => setModalUbicacion(null)} className="text-slate-400 hover:text-slate-600 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-slate-600">Producto:</p>
              <p className="font-bold text-slate-900">{modalUbicacion.ingrediente_nombre}</p>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {ubicaciones.map((ub) => (
                <button
                  key={ub.id}
                  onClick={() => confirmarUbicacion(ub.id)}
                  className="w-full px-4 py-3 text-left rounded-lg border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition"
                >
                  <p className="font-semibold text-slate-900">{ub.nombre}</p>
                  {ub.descripcion && <p className="text-xs text-slate-500 mt-0.5">{ub.descripcion}</p>}
                </button>
              ))}
            </div>

            <button
              onClick={() => setModalUbicacion(null)}
              className="mt-4 w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
