'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

interface LoteInfo {
  lote_numero: string;
  fecha_produccion: string;
  fecha_caducidad: string;
  cantidad_total: number;
  cantidad_consumida: number;
  estado: string;
}

interface Entrada {
  id: string;
  cantidad_disponible: number;
  unidad_medida: string;
  fecha_caducidad: string;
}

interface LoteAntiguo {
  lote_numero: string;
  fecha_caducidad: string;
  cantidad_disponible: number;
}

export default function LoteMovilPage() {
  const router = useRouter();
  const params = useParams();
  const loteParam = decodeURIComponent((params.lote as string) || '');

  const [loading, setLoading] = useState(true);
  const [producto, setProducto] = useState('');
  const [lote, setLote] = useState<LoteInfo | null>(null);
  const [disponible, setDisponible] = useState(0);
  const [unidad, setUnidad] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [lotesAntiguos, setLotesAntiguos] = useState<LoteAntiguo[]>([]);
  const [envaseNum, setEnvaseNum] = useState<string | null>(null);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [cantidad, setCantidad] = useState<number>(0);
  const [destino, setDestino] = useState('');
  const [responsable, setResponsable] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [exito, setExito] = useState(false);

  // Leer parámetro ?e=N del QR (envase numerado)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setEnvaseNum(params.get('e'));
    }
  }, []);

  useEffect(() => {
    if (loteParam) cargarLote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loteParam]);

  async function cargarLote() {
    setLoading(true);
    setExito(false);
    setMostrarForm(false);

    const { data: loteData } = await supabase
      .from('lotes')
      .select('*')
      .eq('lote_numero', loteParam)
      .single();

    if (!loteData) {
      setLoading(false);
      return;
    }

    setLote(loteData);

    const { data: prod } = await supabase
      .from('producciones')
      .select('nombre, ubicacion_almacen')
      .eq('id_produccion', loteData.produccion_id)
      .single();

    setProducto(prod?.nombre || loteData.lote_numero);
    setUbicacion(prod?.ubicacion_almacen || '');

    const { data: entradas } = await supabase
      .from('stock_producciones')
      .select('*')
      .eq('lote_numero', loteParam)
      .eq('movimiento_tipo', 'entrada');

    const disp = (entradas || []).reduce(
      (s: number, e: Entrada) => s + Number(e.cantidad_disponible || 0),
      0
    );
    setDisponible(disp);
    setUnidad((entradas || [])[0]?.unidad_medida || '');
    setCantidad(disp);

    // 🔒 ¿Hay lotes más antiguos con stock? (FIFO)
    if (prod?.nombre) {
      const { data: antiguos } = await supabase
        .from('stock_producciones')
        .select('lote_numero, fecha_caducidad, cantidad_disponible')
        .eq('producto_nombre', prod.nombre)
        .eq('movimiento_tipo', 'entrada')
        .gt('cantidad_disponible', 0)
        .lt('fecha_caducidad', loteData.fecha_caducidad);

      setLotesAntiguos(antiguos || []);
    }

    setLoading(false);
  }

  const fifoBloqueado = lotesAntiguos.length > 0;

  async function registrarSalida() {
    if (!cantidad || cantidad <= 0) {
      alert('Cantidad inválida');
      return;
    }

    setProcesando(true);

    try {
      const res = await fetch('/api/stock-producciones/salida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lote_numero: loteParam,
          cantidad,
          destino,
          responsable,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        if (data.error === 'FIFO_VIOLATION') {
          setLotesAntiguos(data.lotes_antiguos || []);
          setMostrarForm(false);
          alert(data.message);
        } else {
          alert(`Error: ${data.error}`);
        }
        setProcesando(false);
        return;
      }

      setExito(true);
      setMostrarForm(false);
      cargarLote();
    } catch (error: any) {
      alert(`Error de conexión: ${error.message}`);
    } finally {
      setProcesando(false);
    }
  }

  function diasHasta(f: string) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const cad = new Date(f);
    cad.setHours(0, 0, 0, 0);
    return Math.ceil((cad.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-200 border-t-orange-600"></div>
      </div>
    );
  }

  if (!lote) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center max-w-sm w-full">
          <div className="text-4xl mb-3">❓</div>
          <p className="font-bold text-slate-900">Lote no encontrado</p>
          <p className="text-sm text-slate-500 mt-1 font-mono">{loteParam}</p>
        </div>
      </div>
    );
  }

  const dias = diasHasta(lote.fecha_caducidad);

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
      <div className="max-w-md mx-auto p-4 space-y-4 pb-10">
        {/* CABECERA */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg">
          <p className="text-xs font-mono text-slate-400">{lote.lote_numero}</p>
          <h1 className="text-xl font-bold mt-1 uppercase">{producto}</h1>
          {envaseNum && (
            <span className="inline-block mt-2 px-3 py-1 bg-orange-500/20 text-orange-300 border border-orange-500/40 rounded-full text-xs font-bold">
              🏷️ Envase {envaseNum}
            </span>
          )}
          <div className="flex items-center gap-4 mt-4">
            <div>
              <p className="text-3xl font-bold text-orange-400">
                {disponible}
              </p>
              <p className="text-xs text-slate-400 uppercase">{unidad} disponibles</p>
            </div>
            <div className="h-10 w-px bg-slate-700"></div>
            <div>
              <p className={`text-lg font-bold ${dias < 0 ? 'text-red-400' : dias <= 3 ? 'text-orange-400' : 'text-emerald-400'}`}>
                {dias < 0 ? 'CADUCADO' : `${dias} días`}
              </p>
              <p className="text-xs text-slate-400">
                cad. {new Date(lote.fecha_caducidad).toLocaleDateString('es-ES')}
              </p>
            </div>
          </div>
          {ubicacion && (
            <p className="text-xs text-slate-400 mt-3">📍 {ubicacion}</p>
          )}
        </div>

        {/* 🚨 BLOQUEO FIFO */}
        {fifoBloqueado && (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5">
            <p className="font-bold text-red-700 flex items-center gap-2">
              🚫 FIFO: lote más antiguo en stock
            </p>
            <p className="text-sm text-red-600 mt-2">
              No puedes dar salida a este lote antes de consumir:
            </p>
            <div className="mt-3 space-y-2">
              {lotesAntiguos.map((a) => (
                <button
                  key={a.lote_numero}
                  onClick={() => router.push(`/lote/${encodeURIComponent(a.lote_numero)}`)}
                  className="w-full bg-white border border-red-200 rounded-xl p-3 text-left hover:bg-red-100 transition"
                >
                  <p className="font-mono text-xs font-bold text-slate-800">{a.lote_numero}</p>
                  <p className="text-xs text-red-600 mt-0.5">
                    cad. {new Date(a.fecha_caducidad).toLocaleDateString('es-ES')} · {a.cantidad_disponible} {unidad} → tocar para escanear este
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ✅ ÉXITO */}
        {exito && (
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 text-center">
            <p className="text-3xl">✅</p>
            <p className="font-bold text-emerald-700 mt-1">Salida registrada</p>
            <p className="text-xs text-emerald-600 mt-1">
              {destino ? `Destino: ${destino}` : 'Trazabilidad actualizada'}
            </p>
          </div>
        )}

        {/* FORMULARIO DE SALIDA */}
        {mostrarForm && !fifoBloqueado ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Cantidad a retirar ({unidad})
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={cantidad || ''}
                onChange={(e) => setCantidad(Number(e.target.value))}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-lg font-bold focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Destino
              </label>
              <input
                type="text"
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                placeholder="Chiringuito Playa..."
                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Quién retira
              </label>
              <input
                type="text"
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                placeholder="Nombre"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
            </div>
            <button
              onClick={registrarSalida}
              disabled={procesando}
              className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 transition disabled:bg-slate-300"
            >
              {procesando ? 'Registrando...' : '✅ Confirmar salida'}
            </button>
            <button
              onClick={() => setMostrarForm(false)}
              className="w-full py-2 text-slate-500 text-sm font-medium"
            >
              Cancelar
            </button>
          </div>
        ) : (
          !fifoBloqueado &&
          !exito && (
            <button
              onClick={() => setMostrarForm(true)}
              disabled={disponible <= 0}
              className="w-full py-5 bg-orange-600 text-white rounded-2xl font-bold text-xl shadow-lg shadow-orange-600/20 hover:bg-orange-700 transition disabled:bg-slate-300 disabled:shadow-none"
            >
              🚚 DAR SALIDA
            </button>
          )
        )}

        {disponible <= 0 && (
          <p className="text-center text-sm text-slate-400">
            Este lote está agotado.
          </p>
        )}
      </div>
    </div>
  );
}
