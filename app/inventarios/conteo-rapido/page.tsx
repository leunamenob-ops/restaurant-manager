'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

// =====================================================
// FASE 1: SCANNER DE CÁMARA
// =====================================================
function ScannerFase({ onSelect }: { onSelect: (id: string) => void }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [manual, setManual] = useState('');
  const [sugerencias, setSugerencias] = useState<any[]>([]);
  const [detectado, setDetectado] = useState(false);

  const soportaQR =
    typeof window !== 'undefined' && 'BarcodeDetector' in window;

  useEffect(() => {
    if (!soportaQR) {
      setError('Este navegador no soporta escáner automático. Usa la búsqueda manual.');
      return;
    }

    let stream: MediaStream | null = null;
    let activo = true;
    let timer: any = null;

    async function iniciar() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const detector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39'],
        });

        const scan = async () => {
          if (!activo || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes && codes.length > 0) {
              activo = false;
              setDetectado(true);
              procesarCodigo(codes[0].rawValue);
              return;
            }
          } catch (e) {}
          timer = setTimeout(scan, 400);
        };

        scan();
      } catch (e: any) {
        setError('No se pudo abrir la cámara: ' + (e?.message || 'permiso denegado'));
      }
    }

    iniciar();

    return () => {
      activo = false;
      if (timer) clearTimeout(timer);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function procesarCodigo(valor: string) {
    if (!valor) return;
    setBuscando(true);
    setError(null);

    // 1. URL de etiqueta de producto (?producto=UUID) → extraer ID
    if (valor.includes('producto=')) {
      try {
        const url = new URL(valor);
        const id = url.searchParams.get('producto');
        if (id) {
          const { data } = await supabase
            .from('ingredientes')
            .select('id, nombre')
            .eq('id', id)
            .maybeSingle();

          if (data) {
            onSelect(data.id);
            setBuscando(false);
            return;
          }
        }
      } catch (e) {
        // URL mal formada, seguir intentando
      }
    }

    // 2. URL de lote (trazabilidad) → redirigir a su página
    if (valor.includes('/lote/')) {
      window.location.href = valor;
      return;
    }

    // 3. UUID directo
    if (/^[0-9a-fA-F-]{36}$/.test(valor)) {
      const { data } = await supabase
        .from('ingredientes')
        .select('id, nombre')
        .eq('id', valor)
        .maybeSingle();

      if (data) {
        onSelect(data.id);
        setBuscando(false);
        return;
      }
    }

    // 4. Código de barras (EAN, etc.)
    const { data: porCodigo } = await supabase
      .from('ingredientes')
      .select('id, nombre')
      .eq('codigo', valor)
      .maybeSingle();

    if (porCodigo) {
      onSelect(porCodigo.id);
      setBuscando(false);
      return;
    }

    // 5. Búsqueda aproximada por nombre
    const { data: porNombre } = await supabase
      .from('ingredientes')
      .select('id, nombre')
      .ilike('nombre', `%${valor}%`)
      .limit(5);

    if (porNombre && porNombre.length === 1) {
      onSelect(porNombre[0].id);
      setBuscando(false);
      return;
    }

    if (porNombre && porNombre.length > 1) {
      setSugerencias(porNombre);
      setBuscando(false);
      setDetectado(false);
      return;
    }

    setBuscando(false);
    setDetectado(false);
    setError(`❓ No se encontró ningún ingrediente para: ${valor.slice(0, 60)}`);
  }

  async function buscarManual() {
    if (!manual.trim()) return;
    setBuscando(true);
    setSugerencias([]);
    setError(null);

    const { data } = await supabase
      .from('ingredientes')
      .select('id, nombre')
      .or(`nombre.ilike.%${manual.trim()}%,codigo.eq.${manual.trim()}`)
      .limit(8);

    if (!data || data.length === 0) {
      setError(`❓ No se encontró "${manual}"`);
      setBuscando(false);
      return;
    }

    if (data.length === 1) {
      onSelect(data[0].id);
    } else {
      setSugerencias(data);
    }
    setBuscando(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-800 p-4">
      <div className="max-w-md mx-auto pt-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur rounded-2xl mb-4">
            <span className="text-5xl">📦</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Inventario Rápido</h1>
          <p className="text-blue-100 text-sm">Escanea el código del producto</p>
        </div>

        <div className="relative w-full aspect-square bg-black rounded-2xl overflow-hidden mb-6 shadow-2xl">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-56 h-32 border-4 border-blue-400 rounded-xl relative">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br"></div>
            </div>
          </div>

          {detectado && (
            <div className="absolute inset-0 bg-emerald-600/80 flex items-center justify-center">
              <p className="text-white font-bold text-lg">✅ Código detectado</p>
            </div>
          )}

          {buscando && (
            <div className="absolute inset-0 bg-slate-900/70 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent mx-auto mb-2"></div>
                <p className="text-sm">Buscando producto...</p>
              </div>
            </div>
          )}

          {error && !buscando && !detectado && (
            <div className="absolute inset-x-0 bottom-0 bg-red-600/90 p-3">
              <p className="text-white text-xs text-center">{error}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-4 mb-4">
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
            Búsqueda manual
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manual}
              onChange={(e) => {
                setManual(e.target.value);
                setError(null);
                setSugerencias([]);
              }}
              onKeyDown={(e) => e.key === 'Enter' && buscarManual()}
              placeholder="Nombre o código..."
              className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none"
            />
            <button
              onClick={buscarManual}
              disabled={buscando || !manual.trim()}
              className="px-5 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:bg-slate-300"
            >
              Buscar
            </button>
          </div>
        </div>

        {sugerencias.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-3 space-y-1 mb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2 px-2">
              Selecciona producto:
            </p>
            {sugerencias.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 rounded-lg transition text-sm font-medium text-slate-800"
              >
                {s.nombre}
              </button>
            ))}
          </div>
        )}

        {/* 🏠 Volver al inicio */}
        <button
          onClick={() => router.push('/movil')}
          className="w-full py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2"
        >
          🏠 Volver al inicio
        </button>
      </div>
    </div>
  );
}

// =====================================================
// FASE 2: FORMULARIO DE CONTEO
// =====================================================
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
      setMensaje('Introduce la cantidad real');
      return;
    }

    setGuardando(true);
    const cantidad = parseFloat(cantidadReal);

    try {
      const { data: stockExistente } = await supabase
        .from('stock')
        .select('id')
        .eq('ingrediente_id', producto.id)
        .single();

      if (stockExistente) {
        const { error: errorStock } = await supabase
          .from('stock')
          .update({
            cantidad_actual: cantidad,
            updated_at: new Date().toISOString(),
          })
          .eq('ingrediente_id', producto.id);

        if (errorStock) throw errorStock;
      } else {
        const { error: errorStock } = await supabase.from('stock').insert({
          ingrediente_id: producto.id,
          ingrediente_nombre: producto.nombre,
          cantidad_actual: cantidad,
          hotel_id: producto.hotel_id || '00000000-0000-0000-0000-000000000001',
          updated_at: new Date().toISOString(),
        });

        if (errorStock) throw errorStock;
      }

      const diferencia = cantidad - stockActual;
      if (diferencia !== 0) {
        const { error: errorMov } = await supabase.from('movimientos_stock').insert([
          {
            ingrediente_id: producto.id,
            ingrediente_nombre: producto.nombre,
            tipo: diferencia > 0 ? 'entrada' : 'salida',
            cantidad: Math.abs(diferencia),
            motivo: motivo || `Ajuste inventario: ${diferencia > 0 ? '+' : ''}${diferencia}`,
            usuario: 'App Móvil Rápida',
            hotel_id: producto.hotel_id || '00000000-0000-0000-0000-000000000001',
          },
        ]);

        if (errorMov) throw errorMov;
      }

      // ✅ Éxito → mostrar mensaje y VOLVER SOLO A LA CÁMARA
      setMensaje(`✅ Guardado: ${producto.nombre} = ${cantidad} ${producto.unidad_compra}`);

      setTimeout(() => {
        router.replace('/inventarios/conteo-rapido');
      }, 1200);
    } catch (error: any) {
      console.error('Error guardando:', error);
      setMensaje('❌ Error: ' + error.message);
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
          <p className="text-lg font-medium">Cargando producto...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-4">
      <div className="max-w-md mx-auto pt-6">
        {/* Botonera superior: casa + escanear otro */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => router.push('/movil')}
            className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2"
          >
            🏠 Inicio
          </button>
          <button
            onClick={() => router.replace('/inventarios/conteo-rapido')}
            className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2"
          >
            📷 Escanear otro
          </button>
        </div>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur rounded-2xl mb-3">
            <span className="text-4xl">📦</span>
          </div>
          <h1 className="text-xl font-bold text-white mb-1">Conteo Rápido</h1>
          <p className="text-emerald-100 text-xs">Teclea • Guarda • Siguiente escaneo</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-6 mb-4">
          <div className="text-center mb-5">
            <h2 className="text-xl font-bold text-slate-900 mb-2">{producto.nombre}</h2>
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <span className="px-3 py-1 bg-slate-100 rounded-full">
                {producto.categoria || 'General'}
              </span>
              <span className="px-3 py-1 bg-slate-100 rounded-full">
                {producto.unidad_compra}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 mb-5 text-center">
            <p className="text-sm text-slate-500 mb-1">Stock Actual</p>
            <p className="text-4xl font-bold text-slate-900">{stockActual}</p>
            <p className="text-xs text-slate-400 mt-1">{producto.unidad_compra}</p>
          </div>

          <div className="mb-5">
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
            <div className="mb-5">
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
          <div
            className={`p-4 rounded-2xl text-center font-semibold ${
              mensaje.includes('✅') ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {mensaje}
            {mensaje.includes('✅') && (
              <p className="text-xs text-emerald-100 mt-1">Volviendo a la cámara...</p>
            )}
          </div>
        )}

        <div className="mt-6 text-center text-emerald-100 text-xs">
          <p>💾 Al guardar, vuelve solo a la cámara para el siguiente</p>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// ROUTER: decide si mostrar scanner o formulario
// =====================================================
function ConteoRapidoRouter() {
  const searchParams = useSearchParams();
  const productoId = searchParams.get('producto');

  const handleSelect = (id: string) => {
    window.location.href = `/inventarios/conteo-rapido?producto=${id}`;
  };

  if (!productoId) {
    return <ScannerFase onSelect={handleSelect} />;
  }

  return <ConteoRapidoContent />;
}

export default function ConteoRapidoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="text-center text-white">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-emerald-500 border-t-transparent mb-4"></div>
            <p className="text-lg font-medium">Cargando...</p>
          </div>
        </div>
      }
    >
      <ConteoRapidoRouter />
    </Suspense>
  );
}
