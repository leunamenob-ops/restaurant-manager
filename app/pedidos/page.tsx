'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function PedidosPage() {
  const [todosProductos, setTodosProductos] = useState<any[]>([]);
  const [productosFiltrados, setProductosFiltrados] = useState<any[]>([]);
  const [carrito, setCarrito] = useState<any[]>([]);
  const [busquedaNombre, setBusquedaNombre] = useState('');
  const [proveedoresUnicos, setProveedoresUnicos] = useState<string[]>([]);
  const [proveedoresSeleccionados, setProveedoresSeleccionados] = useState<string[]>([]);
  const [mostrarFiltroProveedores, setMostrarFiltroProveedores] = useState(false);
  const [mostrarCarrito, setMostrarCarrito] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const filtroRef = useRef<HTMLDivElement>(null);

  // Cargar todos los productos al inicio
  const cargarProductos = useCallback(async () => {
    setLoading(true);
    
    try {
      let todosLosProductos: any[] = [];
      let desde = 0;
      const lote = 1000;
      let hayMas = true;

      while (hayMas) {
        const { data, error } = await supabase
          .from('ingredientes')
          .select(`
            *,
            proveedor_id,
            proveedor_nombre
          `)
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
      
      const proveedores = Array.from(
        new Set(
          productosTransformados
            .map((p: any) => p.proveedor_nombre)
            .filter(Boolean)
        )
      ) as string[];
      
      setProveedoresUnicos(proveedores.sort());
      setProductosFiltrados(productosTransformados);
      
    } catch (err: any) {
      console.error('Error cargando productos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  // Filtrado client-side
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

  function añadirAlCarrito(producto: any, cantidad: number) {
    const existente = carrito.find(item => item.id === producto.id);
    if (existente) {
      setCarrito(carrito.map(item =>
        item.id === producto.id ? { ...item, cantidad: item.cantidad + cantidad } : item
      ));
    } else {
      setCarrito([...carrito, { ...producto, cantidad }]);
    }
  }

  function eliminarDelCarrito(id: string) {
    setCarrito(carrito.filter(item => item.id !== id));
  }

  function actualizarCantidad(id: string, cantidad: number) {
    if (cantidad <= 0) {
      eliminarDelCarrito(id);
      return;
    }
    setCarrito(carrito.map(item =>
      item.id === id ? { ...item, cantidad: Math.max(1, cantidad) } : item
    ));
  }

  function calcularTotalesPorProveedor() {
    const porProveedor: any = {};
    carrito.forEach(item => {
      const provNombre = item.proveedor_nombre || 'Sin proveedor';
      if (!porProveedor[provNombre]) {
        porProveedor[provNombre] = { items: [], total: 0, totalUnidades: 0 };
      }
      const precioUnitario = parseFloat(item.precio_compra_actual) || 0;
      const subtotal = precioUnitario * item.cantidad;
      
      porProveedor[provNombre].items.push({ ...item, precioUnitario, subtotal });
      porProveedor[provNombre].total += subtotal;
      porProveedor[provNombre].totalUnidades += item.cantidad;
    });
    return porProveedor;
  }

  const totalGeneral = carrito.reduce((sum, item) => {
    const precio = parseFloat(item.precio_compra_actual) || 0;
    return sum + (precio * item.cantidad);
  }, 0);

  const totalUnidades = carrito.reduce((sum, item) => sum + item.cantidad, 0);

  // FUNCIÓN DE ENVÍO DE PEDIDO (LIMPIA Y SIN DUPLICADOS)
  async function enviarPedido() {
    if (carrito.length === 0) {
      alert('El carrito está vacío');
      return;
    }
    
    setEnviando(true);
    console.log('🚀 Iniciando envío...');

    try {
      const porProveedor = calcularTotalesPorProveedor();
      const numeroPedido = `PED-${Date.now()}`;
      const fechaISO = new Date().toISOString();

      for (const [provNombre, data] of Object.entries(porProveedor) as [string, any][]) {
        console.log(`\n📦 Procesando proveedor: ${provNombre}`);
        
        // Buscar proveedor por nombre exacto
        const { data: provData, error: provError } = await supabase
          .from('proveedores')
          .select('id, email')
          .eq('nombre', provNombre.trim())
          .maybeSingle();

        if (provError) {
          console.error(`Error buscando proveedor ${provNombre}:`, provError);
        }

        // Insertar pedido
        const { data: pedidoData, error: pedidoError } = await supabase
          .from('pedidos')
          .insert({
            id: crypto.randomUUID(),
            numero_pedido: numeroPedido,
            proveedor_id: provData?.id || null,
            proveedor_nombre: provNombre,
            proveedor_email: provData?.email || null,
            usuario_nombre: 'Cocina',
            total_articulos: data.items.length,
            estado: 'enviado',
            fecha: fechaISO,
            created_at: fechaISO
          })
          .select()
          .single();

        if (pedidoError) {
          console.error(`❌ Error guardando pedido:`, pedidoError);
          continue;
        }

        console.log('✅ Pedido guardado:', pedidoData);

        // Insertar items
        const itemsToInsert = data.items.map((item: any) => ({
          id: crypto.randomUUID(),
          pedido_id: pedidoData.id,
          ingrediente_id: item.id,
          codigo: item.codigo || '',
          descripcion: item.nombre,
          cantidad_pedida: item.cantidad,
          cantidad_recibida: 0,
          unidad: item.unidad_compra,
          estado: 'pendiente',
          created_at: fechaISO
        }));

        const { error: itemsError } = await supabase
          .from('pedido_items')
          .insert(itemsToInsert);

        if (itemsError) {
          console.error('❌ Error guardando items:', itemsError);
        } else {
          console.log('✅ Items guardados:', itemsToInsert.length);
        }

        // Enviar email
        if (provData?.email) {
          try {
            const response = await fetch('/api/enviar-pedido', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                proveedor: provNombre,
                email: provData.email,
                numeroPedido,
                fecha: new Date(fechaISO).toLocaleString('es-ES'),
                items: data.items.map((i: any) => ({
                  codigo: i.codigo || '',
                  descripcion: i.nombre,
                  cantidad: i.cantidad,
                  unidad: i.unidad_compra,
                  precio: i.precioUnitario,
                  subtotal: i.subtotal
                })),
                usuario: 'Cocina',
                total: data.total
              })
            });

            if (response.ok) {
              console.log('✅ Email enviado a', provData.email);
            } else {
              console.warn('⚠️ Email no enviado (status:', response.status, ')');
            }
          } catch (err) {
            console.error('Error enviando email:', err);
          }
        }
      }

      alert(`✅ Pedido ${numeroPedido} generado correctamente.`);
      setCarrito([]);
      setMostrarCarrito(false);
      
    } catch (error) {
      console.error('❌ Error crítico:', error);
      alert('❌ Error: ' + (error as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  // Esta línea debe estar FUERA de enviarPedido, pero DENTRO del componente
  const totalesPorProveedor = calcularTotalesPorProveedor();

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">K</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Gestión de Pedidos</h1>
                <p className="text-sm text-slate-500">Sistema de aprovisionamiento de cocina</p>
              </div>
            </div>
            <button
              onClick={() => setMostrarCarrito(true)}
              className="relative px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium transition-all text-sm flex items-center gap-2 shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              Carrito
              {carrito.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-emerald-500 text-white w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold shadow-md border-2 border-white">
                  {carrito.length}
                </span>
              )}
            </button>
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
                  placeholder="Ej: Queso, Tomate, Verduras..."
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

        {/* RESULTADOS */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              Catálogo de Productos
            </h2>
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-12 text-center text-slate-500">
                <svg className="animate-spin h-8 w-8 mx-auto mb-3 text-emerald-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                <p>Cargando productos...</p>
              </div>
            ) : productosFiltrados.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <p className="text-lg font-medium">No se encontraron productos</p>
                <p className="text-sm mt-1">Prueba con otra búsqueda o limpia los filtros</p>
              </div>
            ) : (
              productosFiltrados.map((producto) => (
                <div key={producto.id} className="p-4 hover:bg-emerald-50/30 transition group">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 text-lg group-hover:text-emerald-700 transition">
                        {producto.nombre}
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {producto.categoria}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {producto.unidad_compra}
                        </span>
                      </div>
                      {producto.proveedor_nombre && (
                        <p className="text-sm text-cyan-700 font-medium mt-2 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                          {producto.proveedor_nombre}
                        </p>
                      )}
                      {producto.precio_compra_actual && (
                        <p className="text-base text-emerald-600 font-bold mt-1">
                          {parseFloat(producto.precio_compra_actual).toFixed(2)} € / {producto.unidad_compra}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto bg-slate-50 p-3 rounded-xl border border-slate-200 sm:bg-transparent sm:border-0 sm:p-0">
                      <input
                        type="number"
                        min="1"
                        defaultValue="1"
                        id={`qty-${producto.id}`}
                        className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-center focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm font-semibold"
                      />
                      <button
                        onClick={() => {
                          const qty = parseInt((document.getElementById(`qty-${producto.id}`) as HTMLInputElement)?.value || '1');
                          añadirAlCarrito(producto, qty);
                        }}
                        className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition shadow-sm flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Añadir
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* MODAL CARRITO */}
      {mostrarCarrito && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-3xl rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-slate-900 text-white p-4 rounded-t-2xl flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                Resumen del Pedido
              </h2>
              <button onClick={() => setMostrarCarrito(false)} className="text-slate-400 hover:text-white w-8 h-8 rounded-full flex items-center justify-center transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {carrito.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  <p className="text-lg font-medium">El carrito está vacío</p>
                  <p className="text-sm mt-1">Añade productos del catálogo para comenzar</p>
                </div>
              ) : (
                Object.entries(totalesPorProveedor).map(([provNombre, data]: [string, any]) => (
                  <div key={provNombre} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        {provNombre}
                      </h3>
                      <span className="text-xs text-slate-600 font-medium bg-white px-2 py-1 rounded border border-slate-200">
                        {data.items.length} productos
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {data.items.map((item: any) => (
                        <div key={item.id} className="p-3 hover:bg-slate-50 transition">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm text-slate-900">{item.nombre}</h4>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {item.unidad_compra} • {item.precioUnitario.toFixed(2)} €/ud
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => actualizarCantidad(item.id, item.cantidad - 1)} className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded-md font-bold flex items-center justify-center transition text-slate-700">−</button>
                              <span className="w-10 text-center font-semibold text-sm py-1">{item.cantidad}</span>
                              <button onClick={() => actualizarCantidad(item.id, item.cantidad + 1)} className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded-md font-bold flex items-center justify-center transition text-slate-700">+</button>
                              <button onClick={() => eliminarDelCarrito(item.id)} className="ml-2 text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition" title="Eliminar">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </div>
                          <div className="text-right mt-2">
                            <p className="text-sm font-bold text-emerald-600">{item.subtotal.toFixed(2)} €</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-emerald-50 p-3 border-t border-emerald-100 flex justify-between items-center">
                      <span className="font-semibold text-emerald-800 text-sm">Total {provNombre}:</span>
                      <span className="font-bold text-emerald-700 text-lg">{data.total.toFixed(2)} €</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {carrito.length > 0 && (
              <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                <div className="flex justify-between items-center mb-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div>
                    <span className="font-semibold text-slate-700 text-lg">Total General:</span>
                    <p className="text-sm text-slate-500 mt-0.5">{totalUnidades} unidades • {carrito.length} productos</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-700 text-2xl">{totalGeneral.toFixed(2)} €</p>
                  </div>
                </div>
                <button
                  onClick={enviarPedido}
                  disabled={enviando}
                  className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                >
                  {enviando ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                      Procesando y enviando...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                      Confirmar y Enviar Pedido
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
