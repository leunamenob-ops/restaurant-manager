'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

// Componente interno que usa useSearchParams
function ConteoRapidoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productoId = searchParams.get('producto');
  
  const [producto, setProducto] = useState<any>(null);
  const [stockActual, setStockActual] = useState(0);
  const [cantidadReal, setCantidadReal] = useState('');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [ultimoActualizado, setUltimoActualizado] = useState('');
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (productoId) {
      cargarProducto(productoId);
    }
  }, [productoId]);

  useEffect(() => {
    if (producto && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [producto]);

  async function cargarProducto(id: string) {
    try {
      const { data: prodData } = await supabase
        .from('ingredientes')
        .select('*')
        .eq('id', id)
        .single();

      if (!prodData) {
        setMensaje('❌ Producto no encontrado');
        return;
      }

      const { data: stockData } = await supabase
        .from('stock')
        .select('cantidad_actual')
        .eq('ingrediente_id', id)
        .single();

      setProducto(prodData);
      setStockActual(stockData?.cantidad_actual || 0);
      setCantidadReal('');
      setMotivo('');
      setMensaje('');
    } catch (error) {
      console.error('Error cargando producto:', error);
      setMensaje('❌ Error al cargar producto');
    }
  }

  async function guardarConteo() {
    if (!producto || cantidadReal === '') {
      setMensaje(' Introduce la cantidad real');
      return;
    }

    setGuardando(true);
    const cantidad = parseFloat(cantidadReal);

    try {
      // 1. Verificar si existe stock para este producto
      const { data: stockExistente } = await supabase
        .from('stock')
        .select('id')
        .eq('ingrediente_id', producto.id)
        .single();

      if (stockExistente) {
        // 2a. Actualizar stock existente
        const { error: errorStock } = await supabase
          .from('stock')
          .update({
            cantidad_actual: cantidad,
            updated_at: new Date().toISOString()
          })
          .eq('ingrediente_id', producto.id);

        if (errorStock) throw errorStock;
      } else {
        // 2b. Crear nuevo registro de stock
        const { error: errorStock } = await supabase
          .from('stock')
          .insert({
            ingrediente_id: producto.id,
            ingrediente_nombre: producto.nombre,
            cantidad_actual: cantidad,
            hotel_id: producto.hotel_id || '00000000-0000-0000-0000-000000000001',
            updated_at: new Date().toISOString()
          });

        if (errorStock) throw errorStock;
      }

      // 3. Registrar movimiento si hay diferencia
      const diferencia = cantidad - stockActual;
      if (diferencia !== 0) {
        const { error: errorMov } = await supabase
          .from('movimientos_stock')
          .insert([{
            ingrediente_id: producto.id,
            ingrediente_nombre: producto.nombre,
            tipo: diferencia > 0 ? 'entrada' : 'salida',
            cantidad: Math.abs(diferencia),
            motivo: motivo || `Ajuste inventario: ${diferencia > 0 ? '+' : ''}${diferencia}`,
            usuario: 'App Móvil Rápida',
            hotel_id: producto.hotel_id || '00000000-0000-0000-0000-000000000001'
          }]);

        if (errorMov) throw errorMov;
      }

      setMensaje(`✅ Guardado: ${producto.nombre} = ${cantidad} ${producto.unidad_compra}`);
      setUltimoActualizado(new Date().toLocaleTimeString());
      
      // Actualizar stock actual en pantalla para la próxima vez
      setStockActual(cantidad);
      
      setTimeout(() => {
        setCantidadReal('');
        setMotivo('');
        setMensaje('');
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 1500);

    } catch (error: any) {
      console.error('Error guardando:', error);
      setMensaje('❌ Error: ' + error.message);
    } finally {
      setGuardando(false);
    }
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      guardarConteo();
    }
  }

  if (!producto) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-emerald-500 border-t-transparent mb-4"></div>
          <p className="text-lg font-medium">Escanea un producto...</p>
          <p className="text-sm text-slate-400 mt-2">O espera a que cargue</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-4">
      <div className="max-w-md mx-auto pt-8">
        
        {/* HEADER */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur rounded-2xl mb-4">
            <span className="text-5xl"></span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Conteo Rápido</h1>
          <p className="text-emerald-100 text-sm">Escanea • Teclea • Guarda</p>
        </div>

        {/* TARJETA PRINCIPAL */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 mb-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-900 mb-2">{producto.nombre}</h2>
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <span className="px-3 py-1 bg-slate-100 rounded-full">{producto.categoria || 'General'}</span>
              <span className="px-3 py-1 bg-slate-100 rounded-full">{producto.unidad_compra}</span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 mb-6 text-center">
            <p className="text-sm text-slate-500 mb-1">Stock Actual</p>
            <p className="text-4xl font-bold text-slate-900">{stockActual}</p>
            <p className="text-xs text-slate-400 mt-1">{producto.unidad_compra}</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2 text-center">
              Cantidad Real Contada
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="number"
                inputMode="decimal"
                step="0.01"
                value={cantidadReal}
                onChange={(e) => setCantidadReal(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="0.00"
                className="w-full px-6 py-5 text-4xl font-bold text-center text-emerald-900 border-4 border-emerald-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200 outline-none transition bg-emerald-50 placeholder-emerald-300"
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-emerald-600">
                {producto.unidad_compra}
              </span>
            </div>
          </div>

          {cantidadReal && parseFloat(cantidadReal) !== stockActual && (
            <div className="mb-6 animate-in fade-in slide-in-from-top-2">
              <input
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Motivo diferencia (opcional)..."
                className="w-full px-4 py-3 text-sm text-slate-900 border-2 border-amber-200 bg-amber-50 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition placeholder-amber-300"
              />
            </div>
          )}

          <button
            onClick={guardarConteo}
            disabled={guardando || !cantidadReal}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-600/30 active:scale-[0.98] flex items-center justify-center gap-3"
          >
            {guardando ? (
              <>
                <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Guardando...
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Guardar (Enter)
              </>
            )}
          </button>
        </div>

        {mensaje && (
          <div className={`p-4 rounded-2xl text-center font-semibold animate-in fade-in slide-in-from-bottom-2 ${
            mensaje.includes('✅') ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {mensaje}
          </div>
        )}

        {ultimoActualizado && (
          <p className="text-center text-emerald-100 text-xs mt-4">
            Último: {ultimoActualizado}
          </p>
        )}

        <div className="mt-8 text-center text-emerald-100 text-xs space-y-1">
          <p> Escanea el siguiente QR para continuar</p>
          <p>⌨️ O pulsa Enter para guardar rápido</p>
        </div>
      </div>
    </div>
  );
}

// Componente principal con Suspense
export default function ConteoRapidoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-emerald-500 border-t-transparent mb-4"></div>
          <p className="text-lg font-medium">Cargando...</p>
        </div>
      </div>
    }>
      <ConteoRapidoContent />
    </Suspense>
  );
}                     TE PASO EL CODIGO DE      app/inventarios/page.tsx          : 'use client';

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
  const { data, error } = await supabase
    .from('stock')
    .select('*')
    .order('ingrediente_nombre');
    
    if (error) {
      console.error('❌ Error cargando stock:', error);
      alert('Error al cargar el stock: ' + error.message + '\n\nVerifica que RLS esté desactivado en la tabla stock.');
      return;
    }
    
    console.log('✅ Stock cargado correctamente. Total:', data?.length || 0);
    
    const productos = data || [];
    setTodosProductos(productos);
    setProductosFiltrados(productos);
    
    const categorias = Array.from(
      new Set(
        productos.map((p: any) => p.categoria || 'Sin categoría')
      )
    ) as string[];
    setCategoriasUnicas(categorias.sort());
  }

  async function cargarUbicaciones() {
    const { data, error } = await supabase
      .from('ubicaciones')
      .select('*')
      .order('orden');
    
    if (error) {
      console.error('❌ Error cargando ubicaciones:', error);
    } else if (data) {
      setUbicaciones(data);
    }
  }

  async function cargarMovimientos() {
    const { data, error } = await supabase
      .from('movimientos_stock')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (error) {
      console.error('❌ Error cargando movimientos:', error);
    } else if (data) {
      setMovimientos(data);
    }
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
                          <p className="text-sm mt-1">
                            {todosProductos.length === 0 
                              ? 'La base de datos está vacía o hay un error de conexión. Revisa la consola (F12).' 
                              : 'Prueba ajustando los filtros de búsqueda'}
                          </p>
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
}                             TE PASO EL CODIGO DE              app/inventarios/ubicaciones/page.tsx         :   'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';

export default function UbicacionesPage() {
  const router = useRouter();
  const [ubicaciones, setUbicaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [ubicacionEditando, setUbicacionEditando] = useState<any>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  
  // Modal de productos y QRs
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState<any>(null);
  const [productosUbicacion, setProductosUbicacion] = useState<any[]>([]);
  const [qrUbicacion, setQrUbicacion] = useState<string>('');
  const [qrsProductos, setQrsProductos] = useState<{[key: string]: string}>({});
  const [generandoQRs, setGenerandoQRs] = useState(false);
  
  const [formulario, setFormulario] = useState({
    nombre: '',
    descripcion: '',
    tipo: 'almacenamiento',
    orden: 0
  });

  const HOTEL_ID = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    cargarUbicaciones();
  }, []);

  async function cargarUbicaciones() {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('ubicaciones')
      .select('*')
      .eq('hotel_id', HOTEL_ID)
      .order('orden');
    
    if (error) {
      console.error('Error cargando ubicaciones:', error);
      alert('Error al cargar: ' + error.message);
    } else {
      console.log('Ubicaciones cargadas:', data?.length);
      setUbicaciones(data || []);
    }
    setLoading(false);
  }

  async function abrirCrear() {
    setUbicacionEditando(null);
    setFormulario({ 
      nombre: '', 
      descripcion: '', 
      tipo: 'estanteria', 
      orden: ubicaciones.length + 1 
    });
    setMostrarModal(true);
  }

  function abrirEditar(ubicacion: any) {
    setUbicacionEditando(ubicacion);
    setFormulario({
      nombre: ubicacion.nombre,
      descripcion: ubicacion.descripcion || '',
      tipo: ubicacion.tipo || 'estanteria',
      orden: ubicacion.orden || 0
    });
    setMostrarModal(true);
  }

  async function abrirProductosYQRs(ubicacion: any) {
    setUbicacionSeleccionada(ubicacion);
    setGenerandoQRs(true);
    
    // 1. Cargar productos asignados a esta ubicación
    const { data } = await supabase
      .from('productos_ubicacion')
      .select(`
        ingrediente_id,
        ingredientes:ingrediente_id (
          id,
          nombre,
          categoria,
          unidad_compra,
          proveedor_nombre
        )
      `)
      .eq('ubicacion_id', ubicacion.id);
    
    const productos = data?.map((d: any) => d.ingredientes) || [];
    setProductosUbicacion(productos);
    
    // 2. Generar QR de la ubicación (AHORA CON URL)
    const urlUbicacion = `${window.location.origin}/inventarios/conteo?ubicacion=${ubicacion.id}`;
    const qrCodeUbicacion = await QRCode.toDataURL(urlUbicacion, { 
      width: 300,
      margin: 2
    });
    setQrUbicacion(qrCodeUbicacion);
    
    // 3. Generar QRs de cada producto (AHORA CON URL)
    const qrs: {[key: string]: string} = {};
    for (const prod of productos) {
      const urlProducto = `${window.location.origin}/inventarios/conteo-rapido?producto=${prod.id}`;
      qrs[prod.id] = await QRCode.toDataURL(urlProducto, { 
        width: 200,
        margin: 2
      });
    }
    setQrsProductos(qrs);
    setGenerandoQRs(false);
    setMostrarModal(true);
  }

  async function guardarUbicacion() {
    if (!formulario.nombre.trim()) {
      alert('El nombre es obligatorio');
      return;
    }

    let error;
    
    if (ubicacionEditando) {
      const result = await supabase
        .from('ubicaciones')
        .update({
          nombre: formulario.nombre,
          descripcion: formulario.descripcion,
          tipo: formulario.tipo,
          orden: formulario.orden
        })
        .eq('id', ubicacionEditando.id);
      error = result.error;
    } else {
      const result = await supabase
        .from('ubicaciones')
        .insert([{
          nombre: formulario.nombre,
          descripcion: formulario.descripcion,
          tipo: formulario.tipo,
          orden: formulario.orden,
          hotel_id: HOTEL_ID
        }]);
      error = result.error;
    }

    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    setMostrarModal(false);
    await cargarUbicaciones();
  }

  async function eliminarUbicacion(id: string, nombre: string) {
    if (!confirm(`¿Eliminar la ubicación "${nombre}"?\n\nLos productos asignados quedarán sin ubicación.`)) {
      return;
    }

    const { error } = await supabase
      .from('ubicaciones')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    await cargarUbicaciones();
  }

  function imprimirQRUbicacion() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Permite las ventanas emergentes para imprimir');
      return;
    }
    
    const urlUbicacion = `${window.location.origin}/inventarios/conteo?ubicacion=${ubicacionSeleccionada?.id}`;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR - ${ubicacionSeleccionada?.nombre}</title>
        <style>
          @media print {
            @page { size: A4; margin: 20mm; }
            body { margin: 0; font-family: Arial, sans-serif; }
          }
          body { 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center;
            min-height: 100vh;
            padding: 40px;
          }
          .qr-container {
            text-align: center;
            border: 3px solid #333;
            padding: 30px;
            border-radius: 10px;
            max-width: 400px;
          }
          h1 { 
            margin: 0 0 10px 0; 
            font-size: 24px;
            color: #1e293b;
          }
          .subtitle {
            font-size: 14px;
            color: #64748b;
            margin-bottom: 20px;
          }
          img {
            width: 300px;
            height: 300px;
            margin: 20px 0;
          }
          .info {
            margin-top: 20px;
            font-size: 12px;
            color: #475569;
          }
          .url {
            font-size: 10px;
            color: #94a3b8;
            word-break: break-all;
            margin-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="qr-container">
          <h1>${ubicacionSeleccionada?.nombre || ''}</h1>
          <div class="subtitle">${ubicacionSeleccionada?.descripcion || ''}</div>
          <img src="${qrUbicacion}" alt="QR Ubicación" />
          <div class="info">
            <p><strong>ID:</strong> ${ubicacionSeleccionada?.id.substring(0, 8)}...</p>
            <p>Escanea para hacer inventario de esta ubicación</p>
            <div class="url">${urlUbicacion}</div>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  function imprimirQRsProductos() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Permite las ventanas emergentes para imprimir');
      return;
    }
    
    const productosHTML = productosUbicacion.map(prod => {
      const urlProd = `${window.location.origin}/inventarios/conteo?ubicacion=${ubicacionSeleccionada?.id}&producto=${prod.id}`;
      return `
      <div class="producto-card">
        <h3>${prod.nombre}</h3>
        <div class="producto-info">
          <span class="badge">${prod.categoria || 'Sin categoría'}</span>
          <span class="badge">${prod.unidad_compra || '-'}</span>
        </div>
        <img src="${qrsProductos[prod.id]}" alt="QR ${prod.nombre}" />
        <div class="producto-id">ID: ${prod.id.substring(0, 8)}...</div>
        <div class="url">${urlProd}</div>
      </div>
    `}).join('');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QRs Productos - ${ubicacionSeleccionada?.nombre}</title>
        <style>
          @media print {
            @page { size: A4; margin: 10mm; }
            body { margin: 0; }
          }
          body { 
            font-family: Arial, sans-serif;
            padding: 20px;
          }
          h1 {
            text-align: center;
            color: #1e293b;
            margin-bottom: 30px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
          }
          .producto-card {
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .producto-card h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            color: #0f172a;
          }
          .producto-info {
            margin-bottom: 10px;
          }
          .badge {
            display: inline-block;
            padding: 3px 8px;
            background: #e0f2fe;
            color: #0369a1;
            border-radius: 4px;
            font-size: 10px;
            margin: 0 2px;
          }
          .producto-card img {
            width: 150px;
            height: 150px;
            margin: 10px 0;
          }
          .producto-id {
            font-size: 9px;
            color: #94a3b8;
            margin-top: 5px;
          }
          .url {
            font-size: 8px;
            color: #94a3b8;
            word-break: break-all;
            margin-top: 5px;
          }
        </style>
      </head>
      <body>
        <h1>📦 QRs de Productos - ${ubicacionSeleccionada?.nombre}</h1>
        <div class="grid">
          ${productosHTML}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  function imprimirQRProductoIndividual(producto: any) {
    const qrCode = qrsProductos[producto.id];
    if (!qrCode) {
      alert('QR no disponible para este producto');
      return;
    }
    
    const urlProducto = `${window.location.origin}/inventarios/conteo-rapido?producto=${producto.id}`;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Permite las ventanas emergentes para imprimir');
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR - ${producto.nombre}</title>
        <style>
          @media print {
            @page { size: A6; margin: 10mm; }
            body { margin: 0; }
          }
          body { 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
            font-family: Arial, sans-serif;
          }
          .qr-container {
            text-align: center;
            border: 2px solid #333;
            padding: 20px;
            border-radius: 8px;
            max-width: 300px;
          }
          h1 { 
            margin: 0 0 8px 0; 
            font-size: 18px;
            color: #1e293b;
          }
          .info {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 15px;
          }
          img {
            width: 200px;
            height: 200px;
            margin: 15px 0;
          }
          .badges {
            display: flex;
            gap: 5px;
            justify-content: center;
            margin-top: 10px;
          }
          .badge {
            padding: 3px 8px;
            background: #e0f2fe;
            color: #0369a1;
            border-radius: 4px;
            font-size: 11px;
          }
          .url {
            font-size: 10px;
            color: #94a3b8;
            word-break: break-all;
            margin-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="qr-container">
          <h1>${producto.nombre}</h1>
          <div class="info">${ubicacionSeleccionada?.nombre || ''}</div>
          <img src="${qrCode}" alt="QR ${producto.nombre}" />
          <div class="badges">
            <span class="badge">${producto.categoria || 'Sin categoría'}</span>
            <span class="badge">${producto.unidad_compra || '-'}</span>
          </div>
          <div class="url">${urlProducto}</div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            }, 300);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  const tipoIcono = (tipo: string) => {
    switch (tipo) {
      case 'camara': return '🏪';
      case 'nevera': return '❄️';
      case 'congelador': return '🥶';
      case 'estanteria': return '📦';
      case 'otro': return '📍';
      default: return '📍';
    }
  };

  const colorTipo = (tipo: string) => {
    switch (tipo) {
      case 'camara': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'nevera': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'congelador': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'estanteria': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'otro': return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const ubicacionesFiltradas = ubicaciones
    .filter(u => filtroTipo === 'todos' ? true : u.tipo === filtroTipo)
    .filter(u => u.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
                 u.descripcion?.toLowerCase().includes(busqueda.toLowerCase()));

  const conteoPorTipo = {
    camara: ubicaciones.filter(u => u.tipo === 'camara').length,
    nevera: ubicaciones.filter(u => u.tipo === 'nevera').length,
    congelador: ubicaciones.filter(u => u.tipo === 'congelador').length,
    estanteria: ubicaciones.filter(u => u.tipo === 'estanteria').length,
    otro: ubicaciones.filter(u => u.tipo === 'otro').length,
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Gestión de Ubicaciones</h1>
                <p className="text-sm text-slate-500">{ubicaciones.length} ubicaciones registradas</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push('/inventarios')}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Volver a Inventarios
              </button>
              
              <button
                onClick={() => router.push('/inventarios/asignar-productos')}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium transition text-sm flex items-center gap-2 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Asignar Productos
              </button>

              <button
                onClick={abrirCrear}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium transition text-sm flex items-center gap-2 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nueva Ubicación
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* RESUMEN POR TIPO */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase">Total</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{ubicaciones.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-4">
            <p className="text-xs font-semibold text-blue-600 uppercase">🏪 Cámaras</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">{conteoPorTipo.camara}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-cyan-200 p-4">
            <p className="text-xs font-semibold text-cyan-600 uppercase">❄️ Neveras</p>
            <p className="text-2xl font-bold text-cyan-900 mt-1">{conteoPorTipo.nevera}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-indigo-200 p-4">
            <p className="text-xs font-semibold text-indigo-600 uppercase">🥶 Congeladores</p>
            <p className="text-2xl font-bold text-indigo-900 mt-1">{conteoPorTipo.congelador}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-4">
            <p className="text-xs font-semibold text-amber-600 uppercase">📦 Estanterías</p>
            <p className="text-2xl font-bold text-amber-900 mt-1">{conteoPorTipo.estanteria}</p>
          </div>
        </div>

        {/* FILTROS */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Buscar ubicación
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar por nombre o descripción..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition text-sm"
                />
              </div>
            </div>

            <div className="w-full md:w-auto">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Filtrar por tipo
              </label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="w-full md:w-auto px-4 py-2.5 border border-slate-300 rounded-lg font-medium transition-all hover:border-amber-400 hover:bg-slate-50 text-sm text-slate-700 bg-white"
              >
                <option value="todos">Todos los tipos ({ubicaciones.length})</option>
                <option value="camara">🏪 Cámaras ({conteoPorTipo.camara})</option>
                <option value="nevera">❄️ Neveras ({conteoPorTipo.nevera})</option>
                <option value="congelador">🥶 Congeladores ({conteoPorTipo.congelador})</option>
                <option value="estanteria">📦 Estanterías ({conteoPorTipo.estanteria})</option>
                <option value="otro">📍 Otros ({conteoPorTipo.otro})</option>
              </select>
            </div>
          </div>
        </div>

        {/* LISTA DE UBICACIONES */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Ubicaciones ({ubicacionesFiltradas.length})
            </h2>
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-12 text-center text-slate-500">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-200 border-t-amber-600 mb-3"></div>
                <p className="font-medium">Cargando ubicaciones...</p>
              </div>
            ) : ubicacionesFiltradas.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <p className="text-lg font-medium">No se encontraron ubicaciones</p>
                <p className="text-sm mt-1">Prueba con otra búsqueda o crea una nueva</p>
              </div>
            ) : (
              ubicacionesFiltradas.map((ub) => (
                <div key={ub.id} className="p-5 hover:bg-amber-50/30 transition group">
                  <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                    <div className="flex-1 flex items-start gap-4">
                      <div className="text-3xl">{tipoIcono(ub.tipo)}</div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-slate-900 text-lg">{ub.nombre}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorTipo(ub.tipo)}`}>
                            {ub.tipo}
                          </span>
                          <span className="text-xs text-slate-400">Orden: {ub.orden}</span>
                        </div>
                        {ub.descripcion && (
                          <p className="text-sm text-slate-600 mt-1">{ub.descripcion}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => abrirProductosYQRs(ub)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2 text-sm font-medium shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                         Ver Productos e Imprimir QRs
                      </button>
                      
                      <button
                        onClick={() => abrirEditar(ub)}
                        className="px-3 py-2 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar
                      </button>
                      <button
                        onClick={() => eliminarUbicacion(ub.id, ub.nombre)}
                        className="px-3 py-2 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* MODAL CREAR/EDITAR */}
      {mostrarModal && !ubicacionSeleccionada && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {ubicacionEditando ? 'Editar Ubicación' : 'Nueva Ubicación'}
              </h2>
              <button onClick={() => setMostrarModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nombre * <span className="text-slate-400 text-xs">(puedes usar emojis)</span>
                </label>
                <input
                  type="text"
                  value={formulario.nombre}
                  onChange={(e) => setFormulario({...formulario, nombre: e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                  placeholder="Ej: ❄️ Nevera 1 - Estante Superior"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Descripción</label>
                <input
                  type="text"
                  value={formulario.descripcion}
                  onChange={(e) => setFormulario({...formulario, descripcion: e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                  placeholder="Ej: Temperatura 2-4°C, productos listos para usar"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo</label>
                  <select
                    value={formulario.tipo}
                    onChange={(e) => setFormulario({...formulario, tipo: e.target.value})}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition bg-white"
                  >
                    <option value="camara">🏪 Cámara Fría</option>
                    <option value="nevera">❄️ Nevera</option>
                    <option value="congelador">🥶 Congelador</option>
                    <option value="estanteria">📦 Estantería</option>
                    <option value="otro">📍 Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Orden</label>
                  <input
                    type="number"
                    value={formulario.orden}
                    onChange={(e) => setFormulario({...formulario, orden: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition"
                    placeholder="0"
                  />
                  <p className="text-xs text-slate-500 mt-1">Orden de aparición</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={guardarUbicacion}
                className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-semibold text-sm"
              >
                {ubicacionEditando ? 'Guardar Cambios' : 'Crear Ubicación'}
              </button>
              <button
                onClick={() => setMostrarModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRODUCTOS Y QRS */}
      {mostrarModal && ubicacionSeleccionada && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <span className="text-3xl">{tipoIcono(ubicacionSeleccionada.tipo)}</span>
                  {ubicacionSeleccionada.nombre}
                </h2>
                {ubicacionSeleccionada.descripcion && (
                  <p className="text-sm text-slate-600 mt-1">{ubicacionSeleccionada.descripcion}</p>
                )}
              </div>
              <button onClick={() => { setMostrarModal(false); setUbicacionSeleccionada(null); }} className="text-slate-400 hover:text-slate-600 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {generandoQRs ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mb-3"></div>
                <p className="text-slate-600 font-medium">Generando códigos QR...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Botones de impresión */}
                <div className="flex flex-wrap gap-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <button
                    onClick={imprimirQRUbicacion}
                    className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium text-sm flex items-center gap-2 shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    📍 Imprimir QR de Ubicación
                  </button>
                  <button
                    onClick={imprimirQRsProductos}
                    disabled={productosUbicacion.length === 0}
                    className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium text-sm flex items-center gap-2 shadow-sm disabled:bg-slate-300 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    📦 Imprimir QRs de {productosUbicacion.length} Productos
                  </button>
                </div>

                {/* QR de la ubicación */}
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                  <h3 className="font-semibold text-slate-900 mb-4 text-center">📍 Código QR de Ubicación</h3>
                  <div className="flex justify-center">
                    <img src={qrUbicacion} alt="QR Ubicación" className="w-48 h-48 rounded-lg border-2 border-white shadow-md" />
                  </div>
                  <p className="text-center text-sm text-slate-600 mt-3">
                    Escanea para hacer inventario de esta ubicación
                  </p>
                </div>

                {/* Lista de productos */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Productos Asignados ({productosUbicacion.length})
                  </h3>
                  
                  {productosUbicacion.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-slate-500">No hay productos asignados a esta ubicación</p>
                      <button
                        onClick={() => {
                          setMostrarModal(false);
                          setUbicacionSeleccionada(null);
                          router.push('/inventarios/asignar-productos');
                        }}
                        className="mt-3 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition text-sm font-medium"
                      >
                        Asignar Productos
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                      {productosUbicacion.map((prod) => (
                        <div key={prod.id} className="bg-white border border-slate-200 rounded-lg p-3 hover:shadow-md transition">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900 text-sm truncate">{prod.nombre}</p>
                              <div className="flex gap-1 mt-1 flex-wrap">
                                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                  {prod.categoria || 'Sin categoría'}
                                </span>
                                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                  {prod.unidad_compra || '-'}
                                </span>
                              </div>
                            </div>
                            {qrsProductos[prod.id] && (
                              <div className="flex-shrink-0">
                                <img 
                                  src={qrsProductos[prod.id]} 
                                  alt={`QR ${prod.nombre}`}
                                  className="w-16 h-16 rounded border border-slate-200"
                                />
                              </div>
                            )}
                          </div>
                          
                          {/* Botón Imprimir QR individual */}
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <button
                              onClick={() => imprimirQRProductoIndividual(prod)}
                              className="w-full px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-xs font-medium flex items-center justify-center gap-2"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                              🖨️ Imprimir QR
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200">
              <button
                onClick={() => { setMostrarModal(false); setUbicacionSeleccionada(null); }}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
