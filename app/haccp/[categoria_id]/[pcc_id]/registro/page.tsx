'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface PCCData {
  id_pcc: string;
  nombre_pcc: string;
  categoria_id: string;
  frecuencia: string;
  tipo_control: string;
  limite_min: number | null;
  limite_max: number | null;
  unidad: string;
  descripcion: string;
  categoria_nombre: string;
}

const CATEGORIAS_INFO: Record<string, { nombre: string; icono: string; color: string; bg: string }> = {
  'CAT_01': { nombre: 'Refrigeración', icono: '❄️', color: 'text-cyan-600', bg: 'bg-cyan-500' },
  'CAT_02': { nombre: 'Cocción', icono: '🔥', color: 'text-orange-600', bg: 'bg-orange-500' },
  'CAT_03': { nombre: 'Limpieza', icono: '🧹', color: 'text-emerald-600', bg: 'bg-emerald-500' },
  'CAT_04': { nombre: 'Recepción', icono: '📦', color: 'text-purple-600', bg: 'bg-purple-500' },
  'CAT_05': { nombre: 'Almacenamiento', icono: '🗄️', color: 'text-amber-600', bg: 'bg-amber-500' },
};

export default function RegistroRapidoPage() {
  const router = useRouter();
  const params = useParams();
  const categoriaId = params.categoria_id as string;
  const pccId = params.pcc_id as string;

  const [pcc, setPcc] = useState<PCCData | null>(null);
  const [valor, setValor] = useState('');
  const [cumple, setCumple] = useState<'SI' | 'NO'>('SI');
  const [accionCorrectora, setAccionCorrectora] = useState('');
  const [loading, setLoading] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState('');

  const catInfo = CATEGORIAS_INFO[categoriaId] || { nombre: 'Categoría', icono: '', color: 'text-slate-600', bg: 'bg-slate-500' };

  useEffect(() => {
    cargarPCC();
  }, [pccId]);

  async function cargarPCC() {
    try {
      const res = await fetch(`/api/haccp/pcc?categoria=${categoriaId}`);
      const allPCCs = await res.json();
      const pccEncontrado = allPCCs.find((p: any) => p.id_pcc === pccId);
      setPcc(pccEncontrado);
    } catch (error) {
      console.error('Error cargando PCC:', error);
      setError('Error al cargar los datos del PCC');
    }
  }

  function checkCumplimientoNumerico(valorNum: number): boolean {
    if (!pcc) return true;
    const min = pcc.limite_min !== null ? pcc.limite_min : -Infinity;
    const max = pcc.limite_max !== null ? pcc.limite_max : Infinity;
    return valorNum >= min && valorNum <= max;
  }

  const esNoOk = 
    (pcc?.tipo_control === 'NUMERICO' && valor && !checkCumplimientoNumerico(parseFloat(valor))) ||
    (pcc?.tipo_control === 'CUALITATIVO' && cumple === 'NO');

  async function guardarRegistro() {
    // Validaciones
    if (pcc?.tipo_control === 'NUMERICO' && !valor) {
      setError('Introduce un valor');
      return;
    }
    if (esNoOk && !accionCorrectora.trim()) {
      setError('La acción correctora es obligatoria cuando el control no se cumple');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const usuarioData = sessionStorage.getItem('usuario');
      const usuario = usuarioData ? JSON.parse(usuarioData) : null;
      const hotelId = sessionStorage.getItem('hotel_id') || '00000000-0000-0000-0000-000000000001';

      const estado = esNoOk ? 'NO_OK' : 'OK';

      const registroData = {
        id_pcc: pccId,
        id_usuario: usuario?.id || 'B0003',
        hotel_id: hotelId,
        valor_medido: pcc?.tipo_control === 'NUMERICO' ? parseFloat(valor) : null,
        unidad: pcc?.unidad || null,
        cumple_si_no: pcc?.tipo_control === 'CUALITATIVO' ? cumple : 'SI',
        accion_correctora: esNoOk ? accionCorrectora : null,
        estado,
        notificado: estado === 'NO_OK'
      };

      const res = await fetch('/api/haccp/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registroData)
      });

      const data = await res.json();
      
      if (data.success) {
        setGuardado(true);
        setTimeout(() => {
          router.push(`/haccp/${categoriaId}`);
        }, 1500);
      } else {
        setError(data.error || 'Error al guardar el registro');
      }
    } catch (error) {
      console.error('Error guardando registro:', error);
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  if (!pcc) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <p className="text-slate-500 font-medium animate-pulse">Cargando PCC...</p>
        </div>
      </div>
    );
  }

  if (guardado) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Registro Guardado!</h2>
          <p className="text-slate-500">Volviendo a {catInfo.nombre}...</p>
          <div className="mt-6 w-48 h-1 bg-slate-200 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full animate-[progress_1.5s_ease-out]" />
          </div>
        </div>
        <style jsx>{`
          @keyframes progress {
            from { width: 0%; }
            to { width: 100%; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/haccp/${categoriaId}`)}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <span>{catInfo.nombre}</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-slate-900 font-medium">Registro</span>
              </div>
              <h1 className="text-lg font-bold text-slate-900">{pcc.nombre_pcc}</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {/* Info del PCC */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 ${catInfo.bg} rounded-xl flex items-center justify-center flex-shrink-0 shadow-md`}>
              <span className="text-2xl">{catInfo.icono}</span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 mb-1">{pcc.nombre_pcc}</h2>
              {pcc.descripcion && (
                <p className="text-sm text-slate-600 mb-2">{pcc.descripcion}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-md text-slate-700 font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {pcc.frecuencia || 'Diaria'}
                </span>
                {pcc.tipo_control === 'NUMERICO' && pcc.limite_min !== null && pcc.limite_max !== null && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-50 rounded-md text-cyan-700 font-medium border border-cyan-200">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                    </svg>
                    Rango: {pcc.limite_min} - {pcc.limite_max} {pcc.unidad || ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Formulario */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
          {/* Campo de valor o cumplimiento */}
          {pcc.tipo_control === 'NUMERICO' ? (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Valor Medido
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={valor}
                  onChange={(e) => {
                    setValor(e.target.value);
                    setError('');
                  }}
                  placeholder="Introduce el valor..."
                  className="w-full p-4 text-lg font-semibold border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all"
                  autoFocus
                />
                {pcc.unidad && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-sm bg-slate-100 px-2 py-1 rounded">
                    {pcc.unidad}
                  </span>
                )}
              </div>
              
              {/* Indicador visual de cumplimiento */}
              {valor && (
                <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 text-sm font-medium ${
                  checkCumplimientoNumerico(parseFloat(valor))
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {checkCumplimientoNumerico(parseFloat(valor)) ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Valor dentro del rango aceptable</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>Valor fuera de rango - Se requiere acción correctora</span>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                ¿Se ha cumplido el control?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setCumple('SI'); setError(''); }}
                  className={`p-4 rounded-xl border-2 font-semibold transition-all ${
                    cumple === 'SI'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">SÍ CUMPLE</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setCumple('NO'); setError(''); }}
                  className={`p-4 rounded-xl border-2 font-semibold transition-all ${
                    cumple === 'NO'
                      ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">NO CUMPLE</span>
                </button>
              </div>
            </div>
          )}

          {/* Acción correctora (solo si es NO_OK) */}
          {esNoOk && (
            <div className="animate-[fadeIn_0.3s_ease-out]">
              <label className="block text-sm font-semibold text-rose-700 mb-2">
                ⚠️ Acción Correctora <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={accionCorrectora}
                onChange={(e) => {
                  setAccionCorrectora(e.target.value);
                  setError('');
                }}
                placeholder="Describe la acción correctora aplicada..."
                rows={3}
                className="w-full p-4 border-2 border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all resize-none"
              />
              <p className="mt-1.5 text-xs text-rose-600">
                Obligatorio cuando el control no se cumple
              </p>
            </div>
          )}

          {/* Botón Guardar */}
          <button
            onClick={guardarRegistro}
            disabled={loading}
            className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-slate-900/20 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Guardando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Guardar Registro
              </>
            )}
          </button>
        </div>

        {/* Info adicional */}
        <div className="text-center text-xs text-slate-400 pb-4">
          <p>Registro rápido HACCP · KOST Software</p>
        </div>
      </main>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
