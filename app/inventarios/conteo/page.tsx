'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

// Componente que usa useSearchParams (debe ir dentro de Suspense)
function ConteoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ubicacionId = searchParams.get('ubicacion');
  const productoId = searchParams.get('producto');

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [ubicacion, setUbicacion] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [mensaje, setMensaje] = useState('');

  const HOTEL_ID = '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    if (ubicacionId) {
      cargarDatos();
    } else {
      setMensaje('No se especificó una ubicación. Escanea un código QR válido.');
      setLoading(false);
    }
  }, [ubicacionId]);

  async function cargarDatos() {
    setLoading(true);
    
    // 1. Cargar datos de la ubicación
    const { data: ubData } = await supabase
      .from('ubicaciones')
      .select('*')
      .eq('id', ubicacionId)
      .single();
    
    if (!ubData) {
      setMensaje('Ubicación no encontrada.');
      setLoading(false);
      return;
    }
    setUbicacion(ubData);

    // 2. Cargar productos asignados a esta ubicación
    const { data: rels } = await supabase
      .from('productos_ubicacion')
      .select(`
        ingrediente_id,
        ingredientes:ingrediente_id (id, nombre, unidad_compra)
      `)
      .eq('ubicacion_id', ubicacionId);

    if (!rels || rels.length === 0) {
      setMensaje('No hay productos asignados a esta ubicación. Asigna productos primero.');
      setLoading(false);
      return;
    }

    // 3. Cargar stock actual de esos productos
    const ingredienteIds = rels.map((r: any) => r.ingrediente_id);
    const { data: stocks } = await supabase
      .from('stock')
      .select('ingrediente_id, cantidad_actual')
      .in('ingrediente_id', ingredienteIds);

    // 4. Combinar datos
    const itemsCombinados = rels.map((rel: any) => {
      const stockInfo = stocks?.find((s: any) => s.ingrediente_id === rel.ingrediente_id);
      return {
        ingrediente_id: rel.ingrediente_id,
        nombre: rel.ingredientes?.nombre || 'Producto sin nombre',
        unidad: rel.ingredientes?.unidad_compra || 'ud',
        teorico: stockInfo?.cantidad_actual || 0,
        real: '', // Se llenará al contar
        motivo: ''
      };
    });

    setItems(itemsCombinados);
    setLoading(false);

    // Si viene un producto específico en la URL, hacer scroll hacia él
    if (productoId) {
      setTimeout(() => {
        const el = document.getElementById(`item-${productoId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-emerald-500', 'bg-emerald-50');
        }
      }, 500);
    }
  }

  function actualizarReal(id: string, valor: string) {
    setItems(prev => prev.map(item => 
      item.ingrediente_id === id ? { ...item, real: valor } : item
    ));
  }

  function actualizarMotivo(id: string, valor: string) {
    setItems(prev => prev.map(item => 
      item.ingrediente_id === id ? { ...item, motivo: valor } : item
    ));
  }

  async function guardarConteo() {
    setGuardando(true);
    let ajustesRealizados = 0;

    try {
      for (const item of items) {
        const real = parseFloat(item.real) || 0;
        const teorico = parseFloat(item.teorico) || 0;
        
        // Solo actuamos si hay un cambio o si se quiere forzar el conteo
        if (item.real !== '' && real !== teorico) {
          // 1. Actualizar stock
          await supabase
            .from('stock')
            .update({ 
              cantidad_actual: real,
              updated_at: new Date().toISOString()
            })
            .eq('ingrediente_id', item.ingrediente_id);

          // 2. Registrar movimiento
          await supabase
            .from('movimientos_stock')
            .insert([{
              ingrediente_id: item.ingrediente_id,
              ingrediente_nombre: item.nombre,
              tipo: 'ajuste',
              cantidad: Math.abs(real - teorico),
              motivo: `Conteo en ${ubicacion.nombre}: ${item.motivo || 'Ajuste por conteo'}`,
              referencia: ubicacion.id,
              usuario: 'App Móvil',
              hotel_id: HOTEL_ID
            }]);
          
          ajustesRealizados++;
        }
      }

      setMensaje(`✅ Conteo guardado correctamente. ${ajustesRealizados} ajuste(s) realizado(s).`);
      
      // Limpiar inputs después de guardar
      setItems(prev => prev.map(item => ({ ...item, real: '', motivo: '' })));
      
      setTimeout(() => setMensaje(''), 4000);
    } catch (error: any) {
      console.error('Error guardando conteo:', error);
      setMensaje('❌ Error al guardar: ' + error.message);
    } finally {
      setGuardando(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-200 border-t-emerald-600 mb-4"></div>
          <p className="text-slate-600 font-medium">Cargando productos de la ubicación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24">
      {/* HEADER MÓVIL */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/inventarios')}
              className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">
                {ubicacion?.nombre || 'Conteo'}
              </h1>
              <p className="text-xs text-slate-500">{items.length} productos para contar</p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* MENSAJES */}
        {mensaje && (
          <div className={`p-4 rounded-xl border text-sm font-medium animate-in fade-in slide-in-from-top-2 ${
            mensaje.includes('✅') ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            mensaje.includes('❌') ? 'bg-red-50 border-red-200 text-red-800' :
            'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            {mensaje}
          </div>
        )}

        {/* LISTA DE PRODUCTOS */}
        {items.map((item) => (
          <div 
            key={item.ingrediente_id} 
            id={`item-${item.ingrediente_id}`}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm transition-all"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1 pr-4">
                <h3 className="font-bold text-slate-900 text-base leading-snug">{item.nombre}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Stock teórico: <span className="font-semibold text-slate-700">{item.teorico}</span> {item.unidad}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <input
                  type="number"
                  inputMode="decimal"
                  value={item.real}
                  onChange={(e) => actualizarReal(item.ingrediente_id, e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 text-xl font-bold text-center border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition bg-slate-50"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400 pointer-events-none">
                  {item.unidad}
                </span>
              </div>
            </div>

            {/* Campo opcional de motivo si hay diferencia */}
            {item.real !== '' && parseFloat(item.real) !== item.teorico && (
              <div className="mt-3 animate-in fade-in slide-in-from-top-1">
                <input
                  type="text"
                  value={item.motivo}
                  onChange={(e) => actualizarMotivo(item.ingrediente_id, e.target.value)}
                  placeholder="Motivo de la diferencia (opcional)..."
                  className="w-full px-3 py-2 text-sm border border-amber-200 bg-amber-50 rounded-lg focus:ring-2 focus:ring-amber-300 outline-none transition"
                />
              </div>
            )}
          </div>
        ))}
      </main>

      {/* FOOTER FIJO CON BOTÓN DE GUARDAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
        <button
          onClick={guardarConteo}
          disabled={guardando}
          className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {guardando ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
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
              Guardar Conteo
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Componente principal que envuelve en Suspense
export default function ConteoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-200 border-t-emerald-600 mb-4"></div>
          <p className="text-slate-600 font-medium">Cargando...</p>
        </div>
      </div>
    }>
      <ConteoContent />
    </Suspense>
  );
}
