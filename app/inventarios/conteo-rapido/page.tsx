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
        setMensaje(' Producto no encontrado');
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
      setMensaje('❌ Introduce la cantidad real');
      return;
    }

    setGuardando(true);
    const cantidad = parseFloat(cantidadReal);

    try {
      const { error: errorStock } = await supabase
        .from('stock')
        .upsert({
          ingrediente_id: producto.id,
          ingrediente_nombre: producto.nombre,
          cantidad_actual: cantidad,
          hotel_id: producto.hotel_id || '00000000-0000-0000-0000-000000000001',
          updated_at: new Date().toISOString()
        }, { onConflict: 'ingrediente_id' });

      if (errorStock) throw errorStock;

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
                className="w-full px-6 py-5 text-4xl font-bold text-center border-4 border-emerald-200 rounded-2xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200 outline-none transition bg-emerald-50"
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-400">
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
                className="w-full px-4 py-3 text-sm border-2 border-amber-200 bg-amber-50 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition"
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
          <p>📱 Escanea el siguiente QR para continuar</p>
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
}
