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
      // Usamos 'B0003' como fallback porque sabemos que existe en haccp_usuarios
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
  
  // Validación en tiempo real para mostrar alerta visual
  const estaFueraDeRango = pccActual && pccActual.tipo_control === 'NUMERICO' && valorMedido !== '' 
    ? (parseFloat(valorMedido) < (pccActual.limite_min || 0) || parseFloat(valorMedido) > (pccActual.limite_max || 100))
    : false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pccActual) return;

    setGuardando(true);
    setMensaje('');

    const user = JSON.parse(sessionStorage.getItem('usuario') || '{}');
    
    // Preparar el objeto de registro
    const registro = {
      id_pcc: pccActual.id_pcc,
      id_usuario: user.id_usuario || 'B0003', // Fallback seguro
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
        // Limpiar formulario
        setValorMedido('');
        setAccionCorrectora('');
        setFotoEvidencia('');
        setCumpleSiNo('SÍ');
        
        // Recargar la lista después de 2.5 segundos
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

  // Pantalla de carga inicial
  if (!usuario) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
                title="Volver al Dashboard"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  📝 Registro HACCP
                </h1>
                <p className="text-cyan-100 text-sm">{usuario.nombre} - {usuario.cargo}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-4 py-2 bg-white/20 rounded-lg text-sm font-medium">
                {usuario.rol === 'ADMIN' ? '👑 Admin' : '👤 Operario'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6">
        {/* Mensajes de feedback */}
        {mensaje && (
          <div className={`mb-6 p-4 rounded-lg text-center font-semibold shadow-sm ${
            mensaje.includes('✅') ? 'bg-green-100 text-green-800 border border-green-200' :
            mensaje.includes('⚠️') ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
            'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {mensaje}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando controles pendientes...</p>
          </div>
        ) : pendientes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl text-green-600 font-bold mb-2">¡Todo completado!</h2>
            <p className="text-gray-600 mb-6">No hay PCC pendientes para registrar en este turno.</p>
            <button 
              onClick={() => cargarPendientes(usuario)}
              className="px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-semibold transition shadow-md"
            >
              🔄 Recargar lista
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Resumen de estado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
                <p className="text-gray-600 text-sm font-medium mb-1">⏳ Pendientes de registrar</p>
                <p className="text-3xl font-bold text-blue-600">{pendientes.length}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
                <p className="text-gray-600 text-sm font-medium mb-1">✅ Completados hoy</p>
                <p className="text-3xl font-bold text-green-600">{completados.length}</p>
              </div>
            </div>

            {/* Formulario de Registro */}
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span>📋</span> Registrar Nuevo Control
              </h2>
              
              {/* Selector de PCC */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Punto de Control Crítico (PCC): *
                </label>
                <select 
                  value={pccSeleccionado}
                  onChange={(e) => {
                    setPccSeleccionado(e.target.value);
                    setValorMedido('');
                    setAccionCorrectora('');
                    setFotoEvidencia('');
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition bg-white"
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
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold">Tipo de control:</span> {pccActual.tipo_control}
                      </p>
                    </div>
                    {pccActual.limite_min !== null && pccActual.limite_max !== null && (
                      <div>
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">Rango aceptable:</span> {pccActual.limite_min} - {pccActual.limite_max} {pccActual.unidad}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Campo para Valor Numérico o Proceso */}
              {pccActual && (pccActual.tipo_control === 'NUMERICO' || pccActual.tipo_control === 'PROCESO') && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Valor medido ({pccActual.unidad}): *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={valorMedido}
                    onChange={(e) => setValorMedido(e.target.value)}
                    className={`w-full p-3 border-2 rounded-lg focus:ring-2 focus:ring-cyan-500 transition text-lg ${
                      estaFueraDeRango ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-300'
                    }`}
                    placeholder="Ej: 3.5"
                    required
                  />
                  {estaFueraDeRango && (
                    <p className="text-red-600 text-sm mt-2 font-semibold flex items-center gap-2 animate-pulse">
                      <span>⚠️</span> ¡Valor fuera de rango! Se requiere acción correctora.
                    </p>
                  )}
                </div>
              )}

              {/* Campo para Control Cualitativo (Sí/No) */}
              {pccActual && pccActual.tipo_control === 'CUALITATIVO' && (
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    ¿Cumple con el estándar establecido? *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex-1 flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50 transition">
                      <input 
                        type="radio" 
                        name="cumple" 
                        value="SÍ" 
                        checked={cumpleSiNo === 'SÍ'} 
                        onChange={() => setCumpleSiNo('SÍ')}
                        className="w-5 h-5 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-gray-700 font-medium">✅ SÍ, cumple</span>
                    </label>
                    <label className="flex-1 flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-red-500 hover:bg-red-50 transition">
                      <input 
                        type="radio" 
                        name="cumple" 
                        value="NO" 
                        checked={cumpleSiNo === 'NO'} 
                        onChange={() => setCumpleSiNo('NO')}
                        className="w-5 h-5 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-gray-700 font-medium">❌ NO, no cumple</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Campos de Incidencia (Solo se muestran si hay fallo) */}
              {(estaFueraDeRango || cumpleSiNo === 'NO') && (
                <div className="space-y-4 p-6 bg-red-50 border-2 border-red-200 rounded-lg mb-6 animate-fade-in">
                  <h3 className="font-bold text-red-800 flex items-center gap-2 text-lg">
                    <span>🚨</span> Incidencia Detectada
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Acción Correctora aplicada (Obligatorio): *
                    </label>
                    <textarea
                      value={accionCorrectora}
                      onChange={(e) => setAccionCorrectora(e.target.value)}
                      className="w-full p-3 border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      rows={3}
                      placeholder="Describe qué acción se tomó para corregir el problema (ej: 'Se ajustó el termostato', 'Se desechó el producto')..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      URL de Foto de Evidencia (Opcional):
                    </label>
                    <input
                      type="text"
                      value={fotoEvidencia}
                      onChange={(e) => setFotoEvidencia(e.target.value)}
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                      placeholder="https://... o dejar en blanco"
                    />
                    <p className="text-xs text-gray-500 mt-1">* La subida directa de archivos desde el móvil se integrará en la próxima versión.</p>
                  </div>
                </div>
              )}

              {/* Botón de Guardar */}
              <button
                type="submit"
                disabled={guardando}
                className={`w-full py-4 px-6 rounded-lg font-bold text-white text-lg transition flex items-center justify-center gap-2 shadow-md ${
                  guardando ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 hover:shadow-lg transform hover:-translate-y-0.5'
                }`}
              >
                {guardando ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    Guardando registro...
                  </>
                ) : (
                  <>✅ Guardar Control</>
                )}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}


