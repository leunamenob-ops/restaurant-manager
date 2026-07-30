'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function AsignarProductosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [ubicaciones, setUbicaciones] = useState<any[]>([]);
  const [ubicacionActiva, setUbicacionActiva] = useState<any>(null);
  const [productosAsignados, setProductosAsignados] = useState<any[]>([]);
  const [todosProductos, setTodosProductos] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [guardando, setGuardando] = useState(false);

  const HOTEL_ID = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (ubicacionActiva) {
      cargarProductosAsignados(ubicacionActiva.id);
    }
  }, [ubicacionActiva]);

  async function cargarDatos() {
    setLoading(true);
    
    const [resUb, resProd] = await Promise.all([
      supabase.from('ubicaciones').select('*').eq('hotel_id', HOTEL_ID).order('orden'),
      supabase.from('ingredientes').select('*').order('nombre').limit(1000)
    ]);

    if (resUb.data) setUbicaciones(resUb.data);
    if (resProd.data) setTodosProductos(resProd.data);
    setLoading(false);
  }

  async function cargarProductosAsignados(ubicacionId: string) {
    const { data } = await supabase
      .from('productos_ubicacion')
      .select('ingrediente_id')
      .eq('ubicacion_id', ubicacionId);
    
    const idsAsignados = data?.map((p: any) => p.ingrediente_id) || [];
    
    const productosConInfo = todosProductos
      .filter(p => idsAsignados.includes(p.id))
      .map(p => ({ ...p, asignado: true }));
    
    setProductosAsignados(productosConInfo);
  }

  async function toggleProducto(producto: any) {
    if (!ubicacionActiva) return;

    const yaAsignado = productosAsignados.find(p => p.id === producto.id);

    if (yaAsignado) {
      // Quitar
      const { error } = await supabase
        .from('productos_ubicacion')
        .delete()
        .eq('ingrediente_id', producto.id)
        .eq('ubicacion_id', ubicacionActiva.id);
      
      if (error) {
        alert('Error: ' + error.message);
        return;
      }
      
      setProductosAsignados(prev => prev.filter(p => p.id !== producto.id));
    } else {
      // Añadir
      const { error } = await supabase
        .from('productos_ubicacion')
        .insert([{
          ingrediente_id: producto.id,
          ubicacion_id: ubicacionActiva.id,
          hotel_id: HOTEL_ID
        }]);
      
      if (error) {
        alert('Error: ' + error.message);
        return;
      }
      
      setProductosAsignados(prev => [...prev, { ...producto, asignado: true }]);
    }
  }

  async function guardarTodos() {
    if (!ubicacionActiva) return;
    setGuardando(true);

    // Eliminar todos los asignados a esta ubicación
    await supabase
      .from('productos_ubicacion')
      .delete()
      .eq('ubicacion_id', ubicacionActiva.id);

    // Insertar los nuevos
    if (productosAsignados.length > 0) {
      const { error } = await supabase
        .from('productos_ubicacion')
        .insert(
          productosAsignados.map(p => ({
            ingrediente_id: p.id,
            ubicacion_id: ubicacionActiva.id,
            hotel_id: HOTEL_ID
          }))
        );
      
      if (error) {
        alert('Error: ' + error.message);
        setGuardando(false);
        return;
      }
    }

    setGuardando(false);
    alert(`✅ ${productosAsignados.length} productos asignados a ${ubicacionActiva.nombre}`);
  }

  const productosDisponibles = todosProductos
    .filter(p => !productosAsignados.find(a => a.id === p.id))
    .filter(p => 
      busqueda === '' || 
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.categoria?.toLowerCase().includes(busqueda.toLowerCase())
    );

  const tipoIcono = (tipo: string) => {
    const iconos: {[key: string]: string} = {
      camara: '🏪', nevera: '❄️', congelador: '🥶', estanteria: '📦', otro: '📍'
    };
    return iconos[tipo] || '📍';
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Asignar Productos a Ubicaciones</h1>
                <p className="text-sm text-slate-500">Organiza qué productos van en cada zona</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/inventarios')}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition text-sm"
              >
                ← Volver
              </button>
              {ubicacionActiva && (
                <button
                  onClick={guardarTodos}
                  disabled={guardando}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium transition text-sm disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : `💾 Guardar (${productosAsignados.length})`}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-teal-200 border-t-teal-600"></div>
            <p className="mt-3 text-slate-600">Cargando...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* COLUMNA IZQUIERDA: Ubicaciones */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <h2 className="font-semibold text-slate-800"> Ubicaciones ({ubicaciones.length})</h2>
                  <p className="text-xs text-slate-500 mt-1">Selecciona una para gestionar sus productos</p>
                </div>
                <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
                  {ubicaciones.map((ub) => (
                    <button
                      key={ub.id}
                      onClick={() => setUbicacionActiva(ub)}
                      className={`w-full p-4 text-left transition hover:bg-teal-50 ${
                        ubicacionActiva?.id === ub.id ? 'bg-teal-50 border-l-4 border-l-teal-600' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{tipoIcono(ub.tipo)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{ub.nombre}</p>
                          {ub.descripcion && (
                            <p className="text-xs text-slate-500 truncate">{ub.descripcion}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA: Productos */}
            <div className="lg:col-span-2">
              {!ubicacionActiva ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                  <div className="text-6xl mb-4"></div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Selecciona una ubicación</h2>
                  <p className="text-slate-600">Elige una ubicación de la lista para ver y gestionar sus productos</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Productos ya asignados */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-teal-50 border-b border-teal-200">
                      <h2 className="font-semibold text-teal-900 flex items-center gap-2">
                        <span className="text-xl">{tipoIcono(ubicacionActiva.tipo)}</span>
                        {ubicacionActiva.nombre}
                        <span className="ml-auto text-sm font-normal text-teal-700">
                          {productosAsignados.length} producto(s) asignado(s)
                        </span>
                      </h2>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                      {productosAsignados.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                          <p className="text-lg">Sin productos asignados</p>
                          <p className="text-sm mt-1">Busca y añade productos abajo</p>
                        </div>
                      ) : (
                        productosAsignados.map((p) => (
                          <div key={p.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                            <div>
                              <p className="font-medium text-slate-900">{p.nombre}</p>
                              <p className="text-xs text-slate-500">
                                {p.categoria || 'Sin categoría'} • {p.unidad_compra || '-'}
                              </p>
                            </div>
                            <button
                              onClick={() => toggleProducto(p)}
                              className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-medium"
                            >
                               Quitar
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Buscador y productos disponibles */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200">
                      <h2 className="font-semibold text-slate-800 mb-3">➕ Añadir productos</h2>
                      <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          type="text"
                          placeholder="Buscar producto por nombre o categoría..."
                          value={busqueda}
                          onChange={(e) => setBusqueda(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                        />
                      </div>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                      {productosDisponibles.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                          <p>No hay productos disponibles</p>
                          <p className="text-sm mt-1">
                            {busqueda ? 'Prueba con otra búsqueda' : 'Todos los productos ya están asignados'}
                          </p>
                        </div>
                      ) : (
                        productosDisponibles.slice(0, 50).map((p) => (
                          <div key={p.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                            <div>
                              <p className="font-medium text-slate-900">{p.nombre}</p>
                              <p className="text-xs text-slate-500">
                                {p.categoria || 'Sin categoría'} • {p.unidad_compra || '-'}
                                {p.proveedor_nombre && ` • ${p.proveedor_nombre}`}
                              </p>
                            </div>
                            <button
                              onClick={() => toggleProducto(p)}
                              className="px-3 py-1 text-xs bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition font-medium"
                            >
                              + Añadir
                            </button>
                          </div>
                        ))
                      )}
                      {productosDisponibles.length > 50 && (
                        <div className="p-3 text-center text-xs text-slate-500 bg-slate-50">
                          Mostrando 50 de {productosDisponibles.length}. Usa el buscador para filtrar.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
