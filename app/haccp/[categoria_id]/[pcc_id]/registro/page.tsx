'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function RegistroRapidoPage() {
  const router = useRouter();
  const params = useParams();
  const categoriaId = params.categoria_id as string;
  const pccId = params.pcc_id as string;

  const [pcc, setPcc] = useState<any>(null);
  const [valor, setValor] = useState('');
  const [cumple, setCumple] = useState<'SI' | 'NO'>('SI');
  const [accionCorrectora, setAccionCorrectora] = useState('');
  const [loading, setLoading] = useState(false);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    cargarPCC();
  }, [pccId]);

  async function cargarPCC() {
    try {
      const res = await fetch(`/api/haccp/pcc`);
      const allPCCs = await res.json();
      const pccEncontrado = allPCCs.find((p: any) => p.id_pcc === pccId);
      setPcc(pccEncontrado);
    } catch (error) {
      console.error('Error cargando PCC:', error);
    }
  }

  async function guardarRegistro() {
    setLoading(true);
    
    try {
      const registroData = {
        id_pcc: pccId,
        valor_medido: pcc?.tipo_control === 'NUMERICO' ? parseFloat(valor) : null,
        cumple_si_no: pcc?.tipo_control === 'CUALITATIVO' ? cumple : null,
        accion_correctora: cumple === 'NO' ? accionCorrectora : null,
        estado: (pcc?.tipo_control === 'NUMERICO' && valor) ? 
          checkCumplimientoNumerico(parseFloat(valor)) : 
          (cumple === 'SI' ? 'OK' : 'NO_OK')
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
        alert('Error al guardar: ' + data.error);
      }
    } catch (error) {
      console.error('Error guardando registro:', error);
      alert('Error al guardar el registro');
    } finally {
      setLoading(false);
    }
  }

  function checkCumplimientoNumerico(valorNum: number): string {
    if (!pcc?.limite_min && !pcc?.limite_max) return 'OK';
    
    const min = parseFloat(pcc.limite_min || '-Infinity');
    const max = parseFloat(pcc.limite_max || 'Infinity');
    
    if (valorNum >= min && valorNum <= max) {
      return 'OK';
    }
    return 'NO_OK';
  }

  if (!pcc) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Cargando...</p>
      </div>
    );
  }

  if (guardado) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Registro Guardado!</h2>
          <p className="text-slate-500">Volviendo a la categoría...</p>
        </div>
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
            <div>
              <h1 className="text-lg font-bold text-slate-900">Registro Rápido</h1>
              <p className="text-sm text-slate-500">Completa el control</p>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tarjeta del PCC */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900 mb-1">{pcc.nombre_pcc}</h2>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Frecuencia: {pcc.frecuencia || 'Diaria'}
                </span>
                {pcc.tipo_control === 'NUMERICO' && pcc.limite_min && pcc.limite_max && (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                    </svg>
                    Límite: {pcc.limite_min} - {pcc.limite_max} {pcc.unidad || ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          {/* Campo de valor o cumplimiento */}
          {pcc.tipo_control === 'NUMERICO' ? (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Valor Medido {pcc.unidad && `(${pcc.unidad})`}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="Introduce el valor..."
                  className="w-full p-4 text-lg border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                  autoFocus
                />
                {pcc.unidad && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                    {pcc.unidad}
                  </span>
                )}
              </div>
              {pcc.limite_min && pcc.limite_max && (
                <p className="mt-2 text-xs text-slate-500">
                  Rango aceptable: {pcc.limite_min} - {pcc.limite_max} {pcc.unidad}
                </p>
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
                  onClick={() => setCumple('SI')}
                  className={`p-4 rounded-xl border-2 font-semibold transition-all ${
                    cumple === 'SI'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  SÍ
                </button>
                <button
                  type="button"
                  onClick={() => setCumple('NO')}
                  className={`p-4 rounded-xl border-2 font-semibold transition-all ${
                    cumple === 'NO'
                      ? 'border-rose-500 bg-rose-50 text-rose-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  NO
                </button>
              </div>
            </div>
          )}

          {/* Acción correctora (solo si es NO_OK) */}
          {((pcc.tipo_control === 'CUALITATIVO' && cumple === 'NO') || 
            (pcc.tipo_control === 'NUMERICO' && valor && checkCumplimientoNumerico(parseFloat(valor)) === 'NO_OK')) && (
            <div className="animate-fadeIn">
              <label className="block text-sm font-semibold text-rose-700 mb-2">
                ⚠️ Acción Correctora Requerida
              </label>
              <textarea
                value={accionCorrectora}
                onChange={(e) => setAccionCorrectora(e.target.value)}
                placeholder="Describe la acción correctora aplicada..."
                rows={3}
                className="w-full p-4 border border-rose-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all resize-none"
              />
              <p className="mt-2 text-xs text-rose-600">
                Obligatorio cuando el control no se cumple
              </p>
            </div>
          )}

          {/* Botón Guardar */}
          <button
            onClick={guardarRegistro}
            disabled={loading || (pcc.tipo_control === 'NUMERICO' && !valor) || (cumple === 'NO' && !accionCorrectora)}
            className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-slate-900/20 active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Guardando...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Guardar Registro
              </span>
            )}
          </button>
        </div>
      </main>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
