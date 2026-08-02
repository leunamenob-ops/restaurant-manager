'use client';

import { useEffect, useState } from 'react';

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
    cargarPendientes();
  }, []);

  async function cargarPendientes() {
    setLoading(true);
    try {
      // NOTA: En producción, 'cocinero001' vendrá de la sesión del usuario logueado
      const res = await fetch('/api/haccp/pcc-pendientes?usuario=cocinero001');
      const data = await res.json();
      setPendientes(data.pendientes || []);
      setCompletados(data.completados || []);
      
      // Seleccionar el primero por defecto si hay pendientes
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

  // Detectar automáticamente si el valor está fuera de rango para mostrar campos de incidencia
  const pccActual = pendientes.find(p => p.id_pcc === pccSeleccionado);
  const estaFueraDeRango = pccActual && pccActual.tipo_control === 'NUMERICO' && valorMedido !== '' 
    ? (parseFloat(valorMedido) < (pccActual.limite_min || 0) || parseFloat(valorMedido) > (pccActual.limite_max || 100))
    : false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pccActual) return;

    setGuardando(true);
    setMensaje('');

    const registro = {
      id_pcc: pccActual.id_pcc,
      id_usuario: 'cocinero001', // Reemplazar con usuario real de la sesión
      hotel_id: '00000000-0000-0000-0000-000000000001', // Reemplazar con hotel_id real
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
        // Limpiar formulario
        setValorMedido('');
        setAccionCorrectora('');
        setFotoEvidencia('');
        setCumpleSiNo('SÍ');
        
        // Recargar para actualizar la lista
        setTimeout(() => {
          setMensaje('');
          cargarPendientes();
        }, 2500);
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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          📝 Registro HACCP
        </h1>
        
        {loading ? (
          <div className="text-center py-8 text-gray-500">Cargando controles...</div>
        ) : pendientes.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl text-green-600 font-bold mb-2">¡Todo completado!</h2>
            <p className="text-gray-600 mb-4">No hay PCC pendientes para hoy.</p>
            <button 
              onClick={cargarPendientes}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              🔄 Recargar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Resumen de estado */}
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

            {/* Selector de PCC */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Selecciona el PCC a registrar:</label>
              <select 
                value={pccSeleccionado}
                onChange={(e) => {
                  setPccSeleccionado(e.target.value);
                  setValorMedido('');
                  setAccionCorrectora('');
                  setFotoEvidencia('');
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

            {/* Campo de Valor Medido (para Numérico o Proceso) */}
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
                  <p className="text-red-600 text-sm mt-1 font-semibold">⚠️ Valor fuera de rango. Se requiere acción correctora.</p>
                )}
              </div>
            )}

            {/* Campo Cualitativo (Sí/No) */}
            {pccActual && pccActual.tipo_control === 'CUALITATIVO' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">¿Cumple con el estándar?</label>
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

            {/* Campos de Incidencia (Solo si está fuera de rango o es NO) */}
            {(estaFueraDeRango || cumpleSiNo === 'NO') && (
              <div className="space-y-4 p-4 bg-red-50 border border-red-200 rounded-lg animate-fade-in">
                <h3 className="font-semibold text-red-800 flex items-center gap-2">
                  ⚠️ Incidencia Detectada
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Acción Correctora (Obligatorio):</label>
                  <textarea
                    value={accionCorrectora}
                    onChange={(e) => setAccionCorrectora(e.target.value)}
                    className="w-full p-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    rows={3}
                    placeholder="Describe qué acción se tomó para corregir el problema..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL de Foto de Evidencia (Opcional):</label>
                  <input
                    type="text"
                    value={fotoEvidencia}
                    onChange={(e) => setFotoEvidencia(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="https://... o dejar en blanco por ahora"
                  />
                  <p className="text-xs text-gray-500 mt-1">* La subida directa de archivos se puede integrar después.</p>
                </div>
              </div>
            )}

            {/* Botón de Guardar */}
            <button
              type="submit"
              disabled={guardando}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition flex items-center justify-center gap-2 ${
                guardando ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {guardando ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </>
              ) : (
                '✅ Guardar Control'
              )}
            </button>

            {/* Mensaje de éxito/error */}
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
