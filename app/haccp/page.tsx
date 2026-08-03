'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface PCC {
  id_pcc: string;
  nombre_pcc: string;
  frecuencia: string;
  tipo_control: string;
  limite_min: number | null;
  limite_max: number | null;
  unidad: string;
}

export default function HACCPPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<any>(null);
  const [pendientes, setPendientes] = useState<PCC[]>([]);
  const [completados, setCompletados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  
  // Estados del formulario
  const [pccSeleccionado, setPccSeleccionado] = useState<string>('');
  const [valorMedido, setValorMedido] = useState<string>('');
  const [cumpleSiNo, setCumpleSiNo] = useState<string>('SÍ');
  const [accionCorrectora, setAccionCorrectora] = useState<string>('');
  const [fotoEvidencia, setFotoEvidencia] = useState<string>('');

  useEffect(() => {
    verificarSesion();
  }, []);

  function verificarSesion() {
    const usuarioData = sessionStorage.getItem('usuario');
    if (!usuarioData) {
      router.push('/');
      return;
    }
    try {
      const usuarioParseado = JSON.parse(usuarioData);
      setUsuario(usuarioParseado);
      cargarPendientes(usuarioParseado);
    } catch (error) {
      console.error('Error al parsear usuario:', error);
      router.push('/');
    }
  }

  async function cargarPendientes(user: any) {
    setLoading(true);
    setMensaje('');
    try {
      const userId = user?.id_usuario || 'B0003';
      const res = await fetch(`/api/haccp/pcc-pendientes?usuario=${userId}`);
      
      if (!res.ok) throw new Error('Error al obtener pendientes');
      
      const data = await res.json();
      setPendientes(data.pendientes || []);
      setCompletados(data.completados || []);
      
      if (data.pendientes?.length > 0) {
        setPccSeleccionado(data.pendientes[0].id_pcc);
      }
    } catch (error) {
      console.error('Error:', error);
      setMensaje('❌ Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }

  const pccActual = pendientes.find(p => p.id_pcc === pccSeleccionado);
  
  const estaFueraDeRango = pccActual && pccActual.tipo_control === 'NUMERICO' && valorMedido !== '' 
    ? (parseFloat(valorMedido) < (pccActual.limite_min || 0) || parseFloat(valorMedido) > (pccActual.limite_max || 100))
    : false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pccActual) return;

    setGuardando(true);
    setMensaje('');

    const user = JSON.parse(sessionStorage.getItem('usuario') || '{}');
    
    const registro = {
      id_pcc: pccActual.id_pcc,
      id_usuario: user.id_usuario || 'B0003',
      hotel_id: user.hotel_id || '00000000-0000-0000-0000-000000000001',
      valor_medido: valorMedido !== '' ? valorMedido : null,
      unidad: pccActual.unidad,
      cumple_si_no: (estaFueraDeRango || cumpleSiNo === 'NO') ? 'NO' : 'SÍ',
      accion_correctora: (estaFueraDeRango || cumpleSiNo === 'NO') ? accionCorrectora : null,
      foto_evidencia: (estaFueraDeRango || cumpleSiNo === 'NO') ? fotoEvidencia : null,
    };

    try {
      const res = await fetch('/api/haccp/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registro),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMensaje(data.mensaje);
        setValorMedido('');
        setAccionCorrectora('');
        setFotoEvidencia('');
        setCumpleSiNo('SÍ');
        
        setTimeout(() => {
          setMensaje('');
          cargarPendientes(user);
        }, 2500);
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

  if (!usuario || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <p className="text-slate-600 font-medium animate-pulse">Cargando controles pendientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* HEADER MODERNO (Estilo KOST Software) */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition text-slate-600"
                title="Volver al Dashboard"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Registro HACCP</h1>
                <p className="text-sm text-slate-500">{usuario.nombre} - {usuario.cargo}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200">
                {usuario.rol === 'ADMIN' ? '👑 Administrador' : '👤 Operario'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mensajes de feedback */}
        {mensaje && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 shadow-sm border ${
            mensaje.includes('✅') ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
            mensaje.includes('⚠️') ? 'bg-amber-50 text-amber-800 border-amber-200' :
            'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mensaje.includes('✅') ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> :
               mensaje.includes('⚠️') ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /> :
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
            </svg>
            <p className="font-medium text-sm">{mensaje}</p>
          </div>
        )}

        {pendientes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Todo completado!</h2>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">No hay PCC pendientes para registrar en este turno. Excelente trabajo manteniendo los estándares.</p>
            <button 
              onClick={() => cargarPendientes(usuario)}
              className="px-6 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 font-semibold transition-all shadow-sm hover:shadow-md flex items-center gap-2 mx-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Recargar lista
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Resumen de estado */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pendientes</p>
                </div>
                <p className="text-3xl font-bold text-blue-700">{pendientes.length}</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completados hoy</p>
                </div>
                <p className="text-3xl font-bold text-emerald-700">{completados.length}</p>
              </div>
            </div>

            {/* Formulario de Registro */}
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
              <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2 pb-4 border-b border-slate-100">
                <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Registrar Nuevo Control
              </h2>
              
              {/* Selector de PCC */}
              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Punto de Control Crítico (PCC) *
                </label>
                <select 
                  value={pccSeleccionado}
                  onChange={(e) => {
                    setPccSeleccionado(e.target.value);
                    setValorMedido('');
                    setAccionCorrectora('');
                    setFotoEvidencia('');
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all text-sm font-medium text-slate-900"
                  required
                >
                  {pendientes.map(pcc => (
                    <option key={pcc.id_pcc} value={pcc.id_pcc}>
                      {pcc.nombre_pcc} ({pcc.frecuencia})
                    </option>
                  ))}
                </select>
              </div>

              {/* Información del PCC seleccionado */}
              {pccActual && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Tipo de control</p>
                    <p className="text-sm font-semibold text-slate-900">{pccActual.tipo_control}</p>
                  </div>
                  {pccActual.limite_min !== null && pccActual.limite_max !== null && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Rango aceptable</p>
                      <p className="text-sm font-semibold text-cyan-700">{pccActual.limite_min} - {pccActual.limite_max} {pccActual.unidad}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Campo para Valor Numérico o Proceso */}
              {pccActual && (pccActual.tipo_control === 'NUMERICO' || pccActual.tipo_control === 'PROCESO') && (
                <div className="mb-6">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Valor medido ({pccActual.unidad}) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={valorMedido}
                    onChange={(e) => setValorMedido(e.target.value)}
                    className={`w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all text-lg font-semibold ${
                      estaFueraDeRango 
                        ? 'border-rose-300 bg-rose-50 text-rose-700 placeholder-rose-400' 
                        : 'border-slate-200 bg-slate-50 text-slate-900'
                    }`}
                    placeholder="Ej: 3.5"
                    required
                  />
                  {estaFueraDeRango && (
                    <p className="text-rose-600 text-sm mt-2 font-medium flex items-center gap-2 animate-pulse">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      ¡Valor fuera de rango! Se requiere acción correctora.
                    </p>
                  )}
                </div>
              )}

              {/* Campo para Control Cualitativo (Sí/No) */}
              {pccActual && pccActual.tipo_control === 'CUALITATIVO' && (
                <div className="mb-6">
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
              {(estaFueraDeRango || cumpleSiNo === 'NO') && (
                <div className="space-y-5 p-5 bg-rose-50 border border-rose-200 rounded-xl mb-6 animate-fade-in">
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
                      className="w-full p-2.5 border border-rose-300 bg-white rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all text-sm"
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
                      className="w-full p-2.5 border border-slate-200 bg-white rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all text-sm"
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
          </div>
        )}
      </main>
    </div>
  );
}
