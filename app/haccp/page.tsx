'use client';

import { useEffect, useState } from 'react';

export default function HACCPPage() {
  const [pendientes, setPendientes] = useState([]);
  const [completados, setCompletados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    cargarPendientes();
  }, []);

  async function cargarPendientes() {
    try {
      const res = await fetch('/api/haccp/pcc-pendientes?usuario=cocinero001');
      const data = await res.json();
      setPendientes(data.pendientes || []);
      setCompletados(data.completados || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">📝 Registro HACCP</h1>
        
        {loading ? (
          <p>Cargando...</p>
        ) : pendientes.length === 0 ? (
          <div className="text-center py-8">
            <h2 className="text-2xl text-green-600 mb-2">✅ ¡Todo completado!</h2>
            <p>No hay PCC pendientes para hoy.</p>
            <button 
              onClick={cargarPendientes}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg"
            >
              🔄 Recargar
            </button>
          </div>
        ) : (
          <div>
            <div className="bg-blue-50 p-3 rounded-lg mb-4">
              <p className="text-blue-800 font-semibold">
                 Tienes {pendientes.length} PCC pendiente(s)
              </p>
            </div>

            {completados.length > 0 && (
              <div className="bg-green-50 p-3 rounded-lg mb-4">
                <p className="text-green-800 font-semibold">
                  ✅ {completados.length} controles ya registrados hoy
                </p>
              </div>
            )}

            <div className="space-y-2">
              {pendientes.map((pcc: any) => (
                <div key={pcc.id_pcc} className="p-4 border rounded-lg hover:bg-gray-50">
                  <h3 className="font-semibold text-gray-900">{pcc.nombre_pcc}</h3>
                  <p className="text-sm text-gray-600">Frecuencia: {pcc.frecuencia}</p>
                  {pcc.limite_min !== null && pcc.limite_max !== null && (
                    <p className="text-sm text-gray-600">
                      Rango: {pcc.limite_min} - {pcc.limite_max} {pcc.unidad}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {mensaje && (
          <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-lg text-center">
            {mensaje}
          </div>
        )}
      </div>
    </div>
  );
}