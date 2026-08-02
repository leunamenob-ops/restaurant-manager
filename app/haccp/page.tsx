'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HACCPPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<any>(null);
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [completados, setCompletados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  
  // Login states
  const [codigo, setCodigo] = useState('');
  const [pin, setPin] = useState('');
  const [errorLogin, setErrorLogin] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Form states
  const [pccSeleccionado, setPccSeleccionado] = useState<string>('');
  const [valorMedido, setValorMedido] = useState<string>('');
  const [cumpleSiNo, setCumpleSiNo] = useState<string>('SÍ');
  const [accionCorrectora, setAccionCorrectora] = useState<string>('');
  const [fotoEvidencia, setFotoEvidencia] = useState<string>('');

  useEffect(() => {
    const user = sessionStorage.getItem('haccp_usuario');
    if (user) {
      setUsuario(JSON.parse(user));
      cargarPendientes();
    } else {
      setLoading(false);
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setErrorLogin('');

    try {
      const res = await fetch('/api/haccp/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo, pin }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        sessionStorage.setItem('haccp_usuario', JSON.stringify(data.usuario));
        setUsuario(data.usuario);
        await cargarPendientes();
      } else {
        setErrorLogin(data.error || 'Código o PIN incorrecto');
      }
    } catch (error) {
      console.error('Error login:', error);
      setErrorLogin('Error de conexión');
    } finally {
      setLoginLoading(false);
    }
  }

  async function cargarPendientes() {
    setLoading(true);
    try {
      const user = JSON.parse(sessionStorage.getItem('haccp_usuario') || '{}');
      const res = await fetch(`/api/haccp/pcc-pendientes?usuario=${user.id_usuario}`);
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

  function logout() {
    sessionStorage.removeItem('haccp_usuario');
    setUsuario(null);
    setPendientes([]);
    setCompletados([]);
    setCodigo('');
    setPin('');
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

    const user = JSON.parse(sessionStorage.getItem('haccp_usuario') || '{}');
    
    const registro = {
      id_pcc: pccActual.id_pcc,
      id_usuario: user.id_usuario,
      hotel_id: user.hotel_id || '00000000-0000-0000-0000-000000000001',
      valor_medido: valorMedido,
      unidad: pccActual.unidad,
      cumple_si_no: estaFueraDeRango || cumpleSiNo === 'NO' ? 'NO' : 'SÍ',
      accion_correctora: (estaFueraDeRango || cumpleSiNo === 'NO') ? accionCorrectora : '',
      foto_evidencia: (estaFueraDeRango || cumpleSiNo === 'NO') ? fotoEvidencia : '',
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
          cargarPendientes();
        }, 3000);
      } else {
        setMensaje(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      setMensaje('❌ Error de conexión al guardar');
    } finally {
      setGuardando(false);
    }
  }

  // Si no hay usuario, mostrar formulario de login
  if (!usuario) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2"> HACCP</h1>
            <p className="text-gray-600">Sistema de Registro de Controles</p>
          </div>

          {errorLogin && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {errorLogin}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código de Usuario:
              </label>
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: B0001"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PIN:
              </label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition ${
                loginLoading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loginLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800 font-semibold mb-2">Usuarios de prueba:</p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>🔑 <strong>B0001</strong> / PIN: 4321 (Admin)</li>
              <li>🔑 <strong>B0003</strong> / PIN: 1234 (User)</li>
            </ul>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-cyan-600 hover:text-cyan-700 text-sm font-medium"
            >
              ← Volver al Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Si hay usuario, mostrar formulario de registro HACCP
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">📝 Registro HACCP</h1>
            <p className="text-sm text-gray-600">{usuario.nombre} - {usuario.cargo}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700"
            >
              ← Dashboard
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
            >
              Salir
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Cargando controles...</div>
        ) : pendientes.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl text-green-600 font-bold mb-2">¡Todo completado!</h2>
            <p className="text-gray-600 mb-4">No hay PCC pendientes para hoy.</p>
            <button 
              onClick={cargarPendientes}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              🔄 Recargar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Resumen */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <p className="text-blue-800 font-semibold text-sm">⏳ Pendientes</p>
                <p className="text-2xl font-bold text-blue-600">{pendientes.length}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                <p className="text-green-800 font-semibold text-sm">✅ Completados hoy</p>
                <p className="text-2xl font-bold text-green-600">{completados.length}</p>
              </div>
            </div>

            {/* Selector PCC */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selecciona el PCC a registrar:
              </label>
              <select 
                value={pccSeleccionado}
                onChange={(e) => {
                  setPccSeleccionado(e.target.value);
                  setValorMedido('');
                  setAccionCorrectora('');
                  setFotoEvidencia('');
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                {pendientes.map(pcc => (
                  <option key={pcc.id_pcc} value={pcc.id_pcc}>
                    {pcc.nombre_pcc} ({pcc.frecuencia})
                  </option>
                ))}
              </select>
            </div>

            {/* Info PCC */}
            {pccActual && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-semibold">Tipo:</span> {pccActual.tipo_control}
                </p>
                {pccActual.limite_min !== null && pccActual.limite_max !== null && (
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Rango aceptable:</span> {pccActual.limite_min} - {pccActual.limite_max} {pccActual.unidad}
                  </p>
                )}
              </div>
            )}

            {/* Campo Valor Numérico */}
            {pccActual && (pccActual.tipo_control === 'NUMERICO' || pccActual.tipo_control === 'PROCESO') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor medido ({pccActual.unidad}):
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={valorMedido}
                  onChange={(e) => setValorMedido(e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    estaFueraDeRango ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Ej: 3.5"
                  required
                />
                {estaFueraDeRango && (
                  <p className="text-red-600 text-sm mt-1 font-semibold">
                    ⚠️ Valor fuera de rango. Se requiere acción correctora.
                  </p>
                )}
              </div>
            )}

            {/* Campo Cualitativo */}
            {pccActual && pccActual.tipo_control === 'CUALITATIVO' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ¿Cumple con el estándar?
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="cumple" 
                      value="SÍ" 
                      checked={cumpleSiNo === 'SÍ'} 
                      onChange={() => setCumpleSiNo('SÍ')}
                      className="w-4 h-4 text-green-600"
                    />
                    <span className="text-gray-700">SÍ, cumple</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="cumple" 
                      value="NO" 
                      checked={cumpleSiNo === 'NO'} 
                      onChange={() => setCumpleSiNo('NO')}
                      className="w-4 h-4 text-red-600"
                    />
                    <span className="text-gray-700">NO, no cumple</span>
                  </label>
                </div>
              </div>
            )}

            {/* Campos Incidencia */}
            {(estaFueraDeRango || cumpleSiNo === 'NO') && (
              <div className="space-y-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-semibold text-red-800">⚠️ Incidencia Detectada</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Acción Correctora (Obligatorio):
                  </label>
                  <textarea
                    value={accionCorrectora}
                    onChange={(e) => setAccionCorrectora(e.target.value)}
                    className="w-full p-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    rows={3}
                    placeholder="Describe qué acción se tomó..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL de Foto de Evidencia:
                  </label>
                  <input
                    type="text"
                    value={fotoEvidencia}
                    onChange={(e) => setFotoEvidencia(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="https://... o dejar en blanco"
                  />
                </div>
              </div>
            )}

            {/* Botón Guardar */}
            <button
              type="submit"
              disabled={guardando}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition ${
                guardando ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {guardando ? 'Guardando...' : '✅ Guardar Control'}
            </button>

            {/* Mensaje */}
            {mensaje && (
              <div className={`p-4 rounded-lg text-center font-semibold ${
                mensaje.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {mensaje}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
