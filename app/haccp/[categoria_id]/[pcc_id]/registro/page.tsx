'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface PCC {
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
  'CAT_01': { nombre: 'Refrigeración y Equipos de Frío', icono: '❄️', color: 'text-cyan-600', bg: 'bg-cyan-500' },
  'CAT_02': { nombre: 'Cocción y Procesos', icono: '🔥', color: 'text-orange-600', bg: 'bg-orange-500' },
  'CAT_03': { nombre: 'Limpieza y Desinfección', icono: '🧹', color: 'text-emerald-600', bg: 'bg-emerald-500' },
  'CAT_04': { nombre: 'Recepción de Mercancías', icono: '📦', color: 'text-purple-600', bg: 'bg-purple-500' },
  'CAT_05': { nombre: 'Almacenamiento y FIFO', icono: '🗄️', color: 'text-amber-600', bg: 'bg-amber-500' },
  'CAT_06': { nombre: 'Buffet y Exposición', icono: '🍽️', color: 'text-pink-600', bg: 'bg-pink-500' },
};

export default function RegistroRapidoPage() {
  const router = useRouter();
  const params = useParams();
  const categoriaId = params.categoria_id as string;
  const pccId = params.pcc_id as string;

  const [pcc, setPcc] = useState<PCC | null>(null);
  const [valorMedido, setValorMedido] = useState<string>('');
  const [cumpleSiNo, setCumpleSiNo] = useState<string>('SÍ');
  const [accionCorrectora, setAccionCorrectora] = useState<string>('');
  const [fotoEvidencia, setFotoEvidencia] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const catInfo = CATEGORIAS_INFO[categoriaId] || { nombre: 'Categoría', icono: '', color: 'text-slate-600', bg: 'bg-slate-500' };

  useEffect(() => {
    cargarPCC();
  }, [pccId]);

  async function cargarPCC() {
    setLoading(true);
    try {
      const res = await fetch(`/api/haccp/pcc?categoria=${categoriaId}`);
      const allPCCs = await res.json();
      const pccEncontrado = allPCCs.find((p: any) => p.id_pcc === pccId);
      
      if (pccEncontrado) {
        setPcc(pccEncontrado);
      } else {
        setMensaje('❌ No se encontró el PCC solicitado');
      }
    } catch (error) {
      console.error('Error cargando PCC:', error);
      setMensaje('❌ Error al cargar los datos del PCC');
    } finally {
      setLoading(false);
    }
  }

  // Lógica idéntica a la que funcionaba antes
  const estaFueraDeRango = pcc && pcc.tipo_control === 'NUMERICO' && valorMedido !== '' 
    ? (parseFloat(valorMedido) < (pcc.limite_min || -Infinity) || parseFloat(valorMedido) > (pcc.limite_max || Infinity))
    : false;

  const requiereAccionCorrectora = estaFueraDeRango || cumpleSiNo === 'NO';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pcc) return;

    setGuardando(true);
    setMensaje('');

    const usuarioData = sessionStorage.getItem('usuario');
    const user = usuarioData ? JSON.parse(usuarioData) : null;
    const hotelId = sessionStorage.getItem('hotel_id') || '00000000-0000-0000-0000-000000000001';

    const estado = requiereAccionCorrectora ? 'NO_OK' : 'OK';

    const registro = {
      id_pcc: pcc.id_pcc,
      id_usuario: user?.id_usuario || user?.id || 'B0003',
      hotel_id: hotelId,
      valor_medido: (pcc.tipo_control === 'NUMERICO' || pcc.tipo_control === 'PROCESO') && valorMedido !== '' ? parseFloat(valorMedido) : null,
      unidad: pcc.unidad,
      cumple_si_no: requiereAccionCorrectora ? 'NO' : 'SÍ',
      accion_correctora: requiereAccionCorrectora ? accionCorrectora : null,
      foto_evidencia: requiereAccionCorrectora ? fotoEvidencia : null,
      estado,
      notificado: estado === 'NO_OK'
    };

    try {
      const res = await fetch('/api/haccp/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registro),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMensaje(data.mensaje || '✅ Registro guardado correctamente');
        setTimeout(() => {
          router.push(`/haccp/${categoriaId}`);
        }, 2000);
      } else {
        setMensaje(`❌ Error: ${data.error}${data.details ? ' (' + data.details + ')' : ''}`);
      }
    } catch (error: any) {
      console.error('Error al guardar:', error);
      setMensaje('❌ Error de conexión al guardar');
    } finally {
      setGuardando(false);
    }
  }

  if (loading || !pcc) {
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {mensaje && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 shadow-sm border ${
            mensaje.includes('✅') ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
            mensaje.includes('⚠️') ? 'bg-amber-50 text-amber-800 border-amber-200' :
            'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            <p className="font-medium text-sm">{mensaje}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          
          {/* Info del PCC */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Tipo de control</p>
              <p className="text-sm font-semibold text-slate-900">{pcc.tipo_control}</p>
            </div>
            {pcc.limite_min !== null && pcc.limite_max !== null && (
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Rango aceptable</p>
                <p className="text-sm font-semibold text-cyan-700">{pcc.limite_min} - {pcc.limite_max} {pcc.unidad}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Frecuencia</p>
              <p className="text-sm font-semibold text-slate-900">{pcc.frecuencia || 'Diaria'}</p>
            </div>
          </div>

          {/* Campo para Valor Numérico o Proceso */}
          {(pcc.tipo_control === 'NUMERICO' || pcc.tipo_control === 'PROCESO') && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Valor medido ({pcc.unidad}) *
              </label>
              <input
                type="number"
                step="0.1"
                value={valorMedido}
                onChange={(e) => setValorMedido(e.target.value)}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all text-lg font-semibold ${
                  estaFueraDeRango 
                    ? 'border-rose-300 bg-rose-50 text-rose-700 placeholder-rose-400' 
                    : 'border-slate-200 bg-slate-50 text-slate-900'
                }`}
                placeholder="Ej: 3.5"
                required
              />
              {estaFueraDeRango && (
                <p className="text-rose-600 text-sm mt-2 font-medium flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  ¡Valor fuera de rango! Se requiere acción correctora.
                </p>
              )}
            </div>
          )}

          {/* Campo para Control Cualitativo (Sí/No) */}
          {pcc.tipo_control === 'CUALITATIVO' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                ¿Cumple con el estándar establecido? *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  cumpleSiNo === 'SÍ' 
                    ? 'border-emerald-500 bg-emerald-50/50' 
                    : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                }`}>
                  <input 
                    type="radio" 
                    name="cumple" 
                    value="SÍ" 
                    checked={cumpleSiNo === 'SÍ'} 
                    onChange={() => setCumpleSiNo('SÍ')}
                    className="w-5 h-5 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span className={`font-semibold ${cumpleSiNo === 'SÍ' ? 'text-emerald-800' : 'text-slate-700'}`}>SÍ, cumple</span>
                </label>
                <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  cumpleSiNo === 'NO' 
                    ? 'border-rose-500 bg-rose-50/50' 
                    : 'border-slate-200 hover:border-rose-300 hover:bg-rose-50/30'
                }`}>
                  <input 
                    type="radio" 
                    name="cumple" 
                    value="NO" 
                    checked={cumpleSiNo === 'NO'} 
                    onChange={() => setCumpleSiNo('NO')}
                    className="w-5 h-5 text-rose-600 focus:ring-rose-500 border-slate-300"
                  />
                  <span className={`font-semibold ${cumpleSiNo === 'NO' ? 'text-rose-800' : 'text-slate-700'}`}>NO, no cumple</span>
                </label>
              </div>
            </div>
          )}

          {/* Campos de Incidencia (Solo se muestran si hay fallo) */}
          {requiereAccionCorrectora && (
            <div className="space-y-5 p-5 bg-rose-50 border border-rose-200 rounded-xl animate-[fadeIn_0.3s_ease-out]">
              <h3 className="font-bold text-rose-800 flex items-center gap-2 text-base">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                Incidencia Detectada
              </h3>
              
              <div>
                <label className="block text-xs font-semibold text-rose-700 uppercase tracking-wider mb-1.5">
                  Acción Correctora aplicada *
                </label>
                <textarea
                  value={accionCorrectora}
                  onChange={(e) => setAccionCorrectora(e.target.value)}
                  className="w-full p-3 border border-rose-300 bg-white rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all text-sm"
                  rows={3}
                  placeholder="Describe qué acción se tomó para corregir el problema..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  URL de Foto de Evidencia (Opcional)
                </label>
                <input
                  type="text"
                  value={fotoEvidencia}
                  onChange={(e) => setFotoEvidencia(e.target.value)}
                  className="w-full p-3 border border-slate-200 bg-white rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all text-sm"
                  placeholder="https://..."
                />
              </div>
            </div>
          )}

          {/* Botón de Guardar */}
          <button
            type="submit"
            disabled={guardando}
            className={`w-full py-3.5 px-6 rounded-xl font-bold text-white text-base transition-all flex items-center justify-center gap-2 shadow-sm ${
              guardando 
                ? 'bg-slate-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 hover:shadow-md transform hover:-translate-y-0.5'
            }`}
          >
            {guardando ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Guardando registro...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Guardar Control
              </>
            )}
          </button>
        </form>
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
