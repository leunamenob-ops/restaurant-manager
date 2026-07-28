'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

interface Ingrediente {
  id: string;
  nombre: string;
  unidad_compra: string;
  precio_compra_actual: number;
  proveedor_nombre: string;
  categoria: string;
}

interface SubReceta {
  id: string;
  nombre: string;
  coste_total: number;
  produccion_gramos: number | null;
  tipo: string;
}

interface ItemSeleccionado {
  tipo: 'ingrediente' | 'subreceta';
  id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  costeUnitario: number;
  coste: number;
}

export default function NuevaReceta() {
  const router = useRouter();
  const [todosIngredientes, setTodosIngredientes] = useState<Ingrediente[]>([]);
  const [ingredientesFiltrados, setIngredientesFiltrados] = useState<Ingrediente[]>([]);
  const [subRecetas, setSubRecetas] = useState<SubReceta[]>([]);
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<'plato' | 'sub_receta'>('plato');
  const [porciones, setPorciones] = useState(1);
  const [produccionGramos, setProduccionGramos] = useState<number | ''>('');
  const [precioVenta, setPrecioVenta] = useState(0);
  const [ivaPorcentaje, setIvaPorcentaje] = useState(10);
  const [itemsSeleccionados, setItemsSeleccionados] = useState<ItemSeleccionado[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [proveedoresUnicos, setProveedoresUnicos] = useState<string[]>([]);
  const [proveedoresSeleccionados, setProveedoresSeleccionados] = useState<string[]>([]);
  const [mostrarFiltroProveedores, setMostrarFiltroProveedores] = useState(false);
  const [itemSeleccionado, setItemSeleccionado] = useState<{tipo: 'ingrediente' | 'subreceta', id: string} | null>(null);
  const [cantidadActual, setCantidadActual] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [hotelId, setHotelId] = useState<string>('');
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [procedimiento, setProcedimiento] = useState('');
  
  const filtroRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    filtrarIngredientes();
  }, [busqueda, proveedoresSeleccionados, todosIngredientes]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filtroRef.current && !filtroRef.current.contains(event.target as Node)) {
        setMostrarFiltroProveedores(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function cargarDatos() {
    const storedHotelId = sessionStorage.getItem('hotel_id');
    if (storedHotelId) setHotelId(storedHotelId);

    let todosLosIngredientes: Ingrediente[] = [];
    let desde = 0;
    const lote = 1000;
    let hayMas = true;

    while (hayMas) {
      const { data, error } = await supabase
        .from('ingredientes')
        .select('id, nombre, unidad_compra, precio_compra_actual, proveedor_nombre, categoria')
        .order('nombre')
        .range(desde, desde + lote - 1);

      if (error) { console.error('Error cargando lote:', error); break; }
      if (!data || data.length === 0) { hayMas = false; } 
      else {
        todosLosIngredientes = todosLosIngredientes.concat(data);
        if (data.length < lote) hayMas = false;
        else desde += lote;
      }
    }

    setTodosIngredientes(todosLosIngredientes);
    const proveedores = Array.from(new Set(todosLosIngredientes.map(i => i.proveedor_nombre || '').filter(p => p && p.trim() !== ''))) as string[];
    setProveedoresUnicos(proveedores.sort());

    const { data: subRecetasData } = await supabase.from('recetas').select('id, nombre, coste_total, produccion_gramos, tipo').eq('tipo', 'sub_receta').order('nombre');
    if (subRecetasData) setSubRecetas(subRecetasData);
  }

  function normalizarUnidad(unidad: string | null | undefined): { unidad: string; factor: number } {
    if (!unidad) return { unidad: 'gr', factor: 1 };
    try {
      const u = unidad.toLowerCase().trim();
      if (u.includes('kg') || u.includes('kilo')) return { unidad: 'gr', factor: 1000 };
      if (u.includes('l') && !u.includes('ml')) return { unidad: 'ml', factor: 1000 };
      if (u.includes('ud') || u.includes('unidad') || u.includes('pieza')) return { unidad: 'ud', factor: 1 };
      if (u.includes('gr') || u.includes('gramo')) return { unidad: 'gr', factor: 1 };
      if (u.includes('ml')) return { unidad: 'ml', factor: 1 };
      return { unidad: 'ud', factor: 1 };
    } catch { return { unidad: 'gr', factor: 1 }; }
  }

  function filtrarIngredientes() {
    let filtrados = [...todosIngredientes];
    if (busqueda.trim()) {
      const b = busqueda.toLowerCase();
      filtrados = filtrados.filter(i => (i.nombre || '').toLowerCase().includes(b) || (i.categoria || '').toLowerCase().includes(b));
    }
    if (proveedoresSeleccionados.length > 0) {
      filtrados = filtrados.filter(i => i.proveedor_nombre && proveedoresSeleccionados.includes(i.proveedor_nombre));
    }
    setIngredientesFiltrados(filtrados);
  }

  function toggleProveedor(proveedor: string) {
    setProveedoresSeleccionados(prev => prev.includes(proveedor) ? prev.filter(p => p !== proveedor) : [...prev, proveedor]);
  }

  function toggleTodosProveedores() {
    setProveedoresSeleccionados(proveedoresSeleccionados.length === proveedoresUnicos.length ? [] : [...proveedoresUnicos]);
  }

  function limpiarFiltros() {
    setBusqueda('');
    setProveedoresSeleccionados([]);
    setItemSeleccionado(null);
    setCantidadActual(0);
  }

  function handleFotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { setMensaje('La imagen no puede superar los 5MB'); return; }
      if (!file.type.startsWith('image/')) { setMensaje('Solo se permiten imágenes'); return; }
      setFotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => { setFotoPreview(reader.result as string); setMensaje(''); };
      reader.readAsDataURL(file);
    }
  }

  function eliminarFoto() {
    setFotoFile(null);
    setFotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const todosLosItems = [
    ...ingredientesFiltrados.map(i => {
      const conv = normalizarUnidad(i.unidad_compra);
      return { tipo: 'ingrediente' as const, id: i.id, nombre: i.nombre || 'Sin nombre', costeUnitario: (i.precio_compra_actual || 0) / conv.factor, unidad: conv.unidad };
    }),
    ...subRecetas.map(s => {
      const gramos = s.produccion_gramos ? parseFloat(s.produccion_gramos as unknown as string) : 0;
      return { tipo: 'subreceta' as const, id: s.id, nombre: s.nombre || 'Sin nombre', costeUnitario: gramos > 0 ? s.coste_total / gramos : 0, unidad: 'gr' };
    })
  ];

  function agregarItem() {
    if (!itemSeleccionado || cantidadActual <= 0) { setMensaje('Selecciona un elemento y una cantidad válida'); return; }
    const item = todosLosItems.find(i => i.id === itemSeleccionado.id && i.tipo === itemSeleccionado.tipo);
    if (!item) return;
    setItemsSeleccionados([...itemsSeleccionados, { tipo: item.tipo, id: item.id, nombre: item.nombre, cantidad: cantidadActual, unidad: item.unidad, costeUnitario: item.costeUnitario, coste: cantidadActual * item.costeUnitario }]);
    setItemSeleccionado(null);
    setCantidadActual(0);
    setMensaje('');
  }

  function eliminarItem(index: number) {
    setItemsSeleccionados(itemsSeleccionados.filter((_, i) => i !== index));
  }

  function actualizarCantidad(index: number, nuevaCantidad: number) {
    const nuevos = [...itemsSeleccionados];
    nuevos[index].cantidad = nuevaCantidad;
    nuevos[index].coste = nuevaCantidad * nuevos[index].costeUnitario;
    setItemsSeleccionados(nuevos);
  }

  function calcularCosteTotal() { return itemsSeleccionados.reduce((sum, item) => sum + item.coste, 0); }
  function calcularPrecioNeto() { return precioVenta <= 0 ? 0 : precioVenta / (1 + ivaPorcentaje / 100); }
  function calcularFoodCostPorcentaje() { const pn = calcularPrecioNeto(); return pn <= 0 ? '0' : ((calcularCosteTotal() / pn) * 100).toFixed(2); }
  function calcularMargenNeto() { const pn = calcularPrecioNeto(); return pn <= 0 ? '0' : (((pn - calcularCosteTotal()) / pn) * 100).toFixed(2); }
  function calcularCostePorGramo() { const g = typeof produccionGramos === 'number' && produccionGramos > 0 ? produccionGramos : 0; return g === 0 ? 0 : calcularCosteTotal() / g; }

  async function subirFoto(recetaId: string): Promise<string | null> {
    if (!fotoFile) return null;
    try {
      setSubiendoFoto(true);
      const fileExt = fotoFile.name.split('.').pop();
      const fileName = `${recetaId}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('recetas-fotos').upload(fileName, fotoFile, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('recetas-fotos').getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (error) { console.error('Error en subirFoto:', error); return null; }
    finally { setSubiendoFoto(false); }
  }

  async function guardarReceta() {
    if (!nombre.trim()) { setMensaje('El nombre es obligatorio'); return; }
    if (itemsSeleccionados.length === 0) { setMensaje('Añade al menos un ingrediente o sub-receta'); return; }
    if (tipo === 'sub_receta' && (!produccionGramos || produccionGramos <= 0)) { setMensaje('Para sub-recetas, debes especificar la producción en gramos'); return; }

    setGuardando(true);
    setMensaje('');

    try {
      const recetaId = crypto.randomUUID();
      let fotoUrl = null;
      if (fotoFile) fotoUrl = await subirFoto(recetaId);

      const { error: recetaError } = await supabase.from('recetas').insert({
        id: recetaId, nombre: nombre.trim(), tipo, procedimiento: procedimiento.trim(), porciones,
        produccion_gramos: tipo === 'sub_receta' ? String(produccionGramos) : null,
        precio_venta: precioVenta, coste_total: calcularCosteTotal(), foto_url: fotoUrl,
        hotel_id: hotelId || '00000000-0000-0000-0000-000000000001', created_at: new Date().toISOString()
      });
      if (recetaError) throw recetaError;

      const detalles = itemsSeleccionados.map((item) => ({
        id: crypto.randomUUID(), receta_id: recetaId,
        ingrediente_id: item.tipo === 'ingrediente' ? item.id : null,
        subreceta_id: item.tipo === 'subreceta' ? item.id : null,
        cantidad_necesaria: item.cantidad, coste_linea: item.coste, unidad: item.unidad,
        hotel_id: hotelId || '00000000-0000-0000-0000-000000000001', created_at: new Date().toISOString()
      }));

      const { error: detalleError } = await supabase.from('receta_detalle').insert(detalles);
      if (detalleError) throw detalleError;

      setMensaje('Receta guardada correctamente');
      setTimeout(() => router.push('/recetas'), 1500);
    } catch (error: any) {
      console.error('Error guardando receta:', error);
      setMensaje(`Error: ${error.message}`);
    } finally {
      setGuardando(false);
    }
  }

  const fc = parseFloat(calcularFoodCostPorcentaje());
  const mn = parseFloat(calcularMargenNeto());

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      
      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">K</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Nueva Receta</h1>
                <p className="text-sm text-slate-500">Crea y calcula el escandallo de tu plato o sub-receta</p>
              </div>
            </div>
            <button onClick={() => router.push('/recetas')} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-all text-sm flex items-center gap-2 shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Cancelar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* MENSAJES */}
        {mensaje && (
          <div className={`p-4 rounded-xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-2 ${
            mensaje.includes('correctamente') ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            mensaje.includes('Error') ? 'bg-red-50 border-red-200 text-red-800' :
            'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mensaje.includes('correctamente') ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"} />
            </svg>
            <span className="text-sm font-medium">{mensaje}</span>
          </div>
        )}

        {/* CARD 1: DATOS BÁSICOS */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Datos Básicos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nombre de la receta *</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm" placeholder="Ej: Solomillo al whisky" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tipo *</label>
              <select value={tipo} onChange={(e) => { setTipo(e.target.value as 'plato' | 'sub_receta'); if (e.target.value === 'plato') setProduccionGramos(''); }} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm bg-white">
                <option value="plato">🍽️ Plato Principal</option>
                <option value="sub_receta">🥘 Sub-receta</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Porciones</label>
              <input type="number" value={porciones} onChange={(e) => setPorciones(Number(e.target.value))} min="1" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm" />
            </div>
            {tipo === 'sub_receta' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Producción total (gramos) *</label>
                <input type="number" value={produccionGramos} onChange={(e) => setProduccionGramos(Number(e.target.value))} min="1" step="1" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm" placeholder="Ej: 1000" />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Precio de venta (€) - Incl. IVA</label>
              <input type="number" value={precioVenta} onChange={(e) => setPrecioVenta(Number(e.target.value))} min="0" step="0.01" className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">IVA (%)</label>
              <select value={ivaPorcentaje} onChange={(e) => setIvaPorcentaje(Number(e.target.value))} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm bg-white">
                <option value="4">4% - Superreducido</option>
                <option value="10">10% - Reducido (Restauración)</option>
                <option value="21">21% - General</option>
                <option value="0">0% - Sin IVA</option>
              </select>
            </div>

            {/* FOTO */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Foto de la receta (opcional)</label>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-emerald-400 transition-all group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-8 h-8 mb-2 text-slate-400 group-hover:text-emerald-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <p className="text-xs text-slate-500"><span className="font-semibold text-emerald-600">Click para subir</span> o arrastra</p>
                      <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP (Máx. 5MB)</p>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFotoChange} className="hidden" />
                  </label>
                </div>
                {fotoPreview && (
                  <div className="relative group">
                    <img src={fotoPreview} alt="Vista previa" className="w-32 h-32 object-cover rounded-xl border border-slate-200 shadow-sm" />
                    <button onClick={eliminarFoto} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition opacity-0 group-hover:opacity-100" title="Eliminar foto">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* PROCEDIMIENTO */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                {tipo === 'sub_receta' ? 'Procedimiento de elaboración' : 'Descripción de ejecución'}
              </label>
              <textarea value={procedimiento} onChange={(e) => setProcedimiento(e.target.value)} rows={5} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm resize-none" placeholder={tipo === 'sub_receta' ? 'Describe aquí el procedimiento de elaboración...' : 'Describe aquí el proceso de ejecución del plato...'} />
            </div>
          </div>
        </div>

        {/* CARD 2: INGREDIENTES */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            Composición de la Receta
          </h2>
          
          {/* Buscador y Filtros */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm" placeholder="Buscar ingrediente o sub-receta..." />
            </div>
            <div className="relative" ref={filtroRef}>
              <button onClick={() => setMostrarFiltroProveedores(!mostrarFiltroProveedores)} className="w-full md:w-auto px-4 py-2.5 border border-slate-300 rounded-lg font-medium transition-all hover:border-emerald-400 hover:bg-slate-50 flex items-center justify-between gap-2 text-sm text-slate-700">
                <span className="truncate">{proveedoresSeleccionados.length > 0 ? `${proveedoresSeleccionados.length} proveedor(es)` : 'Todos los proveedores'}</span>
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${mostrarFiltroProveedores ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {mostrarFiltroProveedores && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-3 border-b border-slate-100 bg-slate-50">
                    <button onClick={toggleTodosProveedores} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 w-full text-left">
                      {proveedoresSeleccionados.length === proveedoresUnicos.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-2">
                    {proveedoresUnicos.map((prov) => (
                      <label key={prov} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                        <input type="checkbox" checked={proveedoresSeleccionados.includes(prov)} onChange={() => toggleProveedor(prov)} className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500" />
                        <span className="text-sm text-slate-700 flex-1 truncate">{prov}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {(busqueda || proveedoresSeleccionados.length > 0) && (
              <button onClick={limpiarFiltros} className="px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-lg font-medium transition text-sm flex items-center justify-center gap-2 border border-transparent hover:border-red-100">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                Limpiar
              </button>
            )}
          </div>

          {/* Lista de resultados */}
          {(busqueda.trim() || proveedoresSeleccionados.length > 0) && todosLosItems.length > 0 && (
            <div className="border border-slate-200 rounded-xl bg-white max-h-60 overflow-y-auto shadow-sm mb-4">
              {todosLosItems.map((item, idx) => (
                <button key={idx} onClick={() => { setItemSeleccionado({tipo: item.tipo, id: item.id}); setCantidadActual(0); }} className="w-full px-4 py-3 text-left hover:bg-emerald-50 border-b border-slate-100 last:border-b-0 flex justify-between items-center transition-colors">
                  <div>
                    <span className="font-medium text-slate-900 text-sm">{item.nombre}</span>
                    <span className="ml-2 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{item.tipo === 'subreceta' ? 'Sub-receta' : item.unidad}</span>
                  </div>
                  <span className="text-sm font-semibold text-emerald-700">{item.costeUnitario.toFixed(4)} €/{item.unidad}</span>
                </button>
              ))}
            </div>
          )}

          {/* Selector de cantidad */}
          {itemSeleccionado && (
            <div className="mb-6 p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl animate-in fade-in slide-in-from-top-2">
              <label className="block text-sm font-semibold text-emerald-900 mb-2">
                Cantidad para: <span className="font-normal text-emerald-700">{todosLosItems.find(i => i.id === itemSeleccionado.id && i.tipo === itemSeleccionado.tipo)?.nombre}</span> ({todosLosItems.find(i => i.id === itemSeleccionado.id && i.tipo === itemSeleccionado.tipo)?.unidad})
              </label>
              <div className="flex gap-3">
                <input type="number" value={cantidadActual} onChange={(e) => setCantidadActual(Number(e.target.value))} min="0" step="0.01" className="flex-1 px-3 py-2.5 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm" placeholder="0.00" autoFocus />
                <button onClick={agregarItem} disabled={cantidadActual <= 0} className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition font-semibold text-sm flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Añadir
                </button>
              </div>
            </div>
          )}

          {/* Items añadidos */}
          {itemsSeleccionados.length > 0 && (
            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wide">Ingredientes añadidos ({itemsSeleccionados.length})</h3>
              <ul className="space-y-2">
                {itemsSeleccionados.map((item, index) => (
                  <li key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-slate-50 p-3 rounded-lg border border-slate-100 gap-3">
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-slate-900">{item.nombre}</span>
                      {item.tipo === 'subreceta' && <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-medium">Sub-receta</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1">
                        <input type="number" value={item.cantidad} onChange={(e) => actualizarCantidad(index, Number(e.target.value))} min="0" step="0.01" className="w-16 text-right text-sm outline-none bg-transparent" />
                        <span className="text-xs text-slate-500 font-medium w-8">{item.unidad}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900 w-20 text-right">{item.coste.toFixed(2)} €</span>
                      <button onClick={() => eliminarItem(index)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Eliminar">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* CARD 3: RESUMEN DE COSTES */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            Resumen Económico
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Precio Venta (IVA {ivaPorcentaje}%)</p>
              <p className="text-2xl font-bold text-slate-900">{precioVenta.toFixed(2)} €</p>
              <p className="text-xs text-slate-500 mt-1">Neto: {calcularPrecioNeto().toFixed(2)} €</p>
            </div>
            <div className="bg-cyan-50 p-4 rounded-xl border border-cyan-100">
              <p className="text-xs font-semibold text-cyan-700 uppercase tracking-wider mb-1">Coste Total</p>
              <p className="text-2xl font-bold text-cyan-900">{calcularCosteTotal().toFixed(2)} €</p>
            </div>
            {tipo === 'sub_receta' && typeof produccionGramos === 'number' && produccionGramos > 0 && (
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">Coste / Gramo</p>
                <p className="text-2xl font-bold text-amber-900">{calcularCostePorGramo().toFixed(4)} €</p>
                <p className="text-xs text-amber-600 mt-1">Prod: {produccionGramos}g</p>
              </div>
            )}
            <div className={`p-4 rounded-xl border ${fc < 25 ? 'bg-emerald-50 border-emerald-100' : fc <= 33 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'}`}>
              <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${fc < 25 ? 'text-emerald-700' : fc <= 33 ? 'text-amber-700' : 'text-red-700'}`}>Food Cost</p>
              <p className={`text-2xl font-bold ${fc < 25 ? 'text-emerald-900' : fc <= 33 ? 'text-amber-900' : 'text-red-900'}`}>{calcularFoodCostPorcentaje()}%</p>
              <p className="text-xs text-slate-500 mt-1">Ideal: &lt;25%</p>
            </div>
            <div className={`p-4 rounded-xl border ${mn >= 60 ? 'bg-emerald-50 border-emerald-100' : mn >= 50 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'}`}>
              <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${mn >= 60 ? 'text-emerald-700' : mn >= 50 ? 'text-amber-700' : 'text-red-700'}`}>Margen Neto</p>
              <p className={`text-2xl font-bold ${mn >= 60 ? 'text-emerald-900' : mn >= 50 ? 'text-amber-900' : 'text-red-900'}`}>{calcularMargenNeto()}%</p>
              <p className="text-xs text-slate-500 mt-1">Sobre precio neto</p>
            </div>
          </div>
        </div>

        {/* BOTÓN GUARDAR */}
        <div className="pt-4">
          <button
            onClick={guardarReceta}
            disabled={guardando || subiendoFoto}
            className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-3"
          >
            {guardando || subiendoFoto ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {subiendoFoto ? 'Subiendo imagen...' : 'Guardando receta...'}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                Guardar Receta
              </>
            )}
          </button>
        </div>

      </main>
    </div>
  );
}
