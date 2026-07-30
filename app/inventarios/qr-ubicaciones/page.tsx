'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';

export default function QRUbicacionesPage() {
  const router = useRouter();
  const [ubicaciones, setUbicaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ubicacionesSeleccionadas, setUbicacionesSeleccionadas] = useState<string[]>([]);
  const [qrData, setQrData] = useState<{[key: string]: string}>({});
  const [vistaPrevia, setVistaPrevia] = useState(false);

  useEffect(() => {
    cargarUbicaciones();
  }, []);

  useEffect(() => {
    if (ubicacionesSeleccionadas.length > 0) {
      generarQRs();
    }
  }, [ubicacionesSeleccionadas]);

  async function cargarUbicaciones() {
    const { data } = await supabase
      .from('ubicaciones')
      .select('*')
      .eq('hotel_id', '00000000-0000-0000-0000-000000000001')
      .order('orden');
    
    if (data) setUbicaciones(data);
    setLoading(false);
  }

  async function generarQRs() {
    const qrs: {[key: string]: string} = {};
    
    for (const ub of ubicaciones.filter(u => ubicacionesSeleccionadas.includes(u.id))) {
      const qrData = JSON.stringify({
        tipo: 'ubicacion',
        id: ub.id,
        nombre: ub.nombre
      });
      qrs[ub.id] = await QRCode.toDataURL(qrData, { width: 200 });
    }
    
    setQrData(qrs);
  }

  function toggleSeleccion(id: string) {
    setUbicacionesSeleccionadas(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }

  function seleccionarTodas() {
    if (ubicacionesSeleccionadas.length === ubicaciones.length) {
      setUbicacionesSeleccionadas([]);
    } else {
      setUbicacionesSeleccionadas(ubicaciones.map(u => u.id));
    }
  }

  function imprimirEtiquetas() {
    setVistaPrevia(true);
    setTimeout(() => {
      window.print();
      setVistaPrevia(false);
    }, 500);
  }

  const tipoIcono = (tipo: string) => {
    const iconos: {[key: string]: string} = {
      camara: '🏪',
      nevera: '❄️',
      congelador: '',
      estanteria: '📦',
      otro: ''
    };
    return iconos[tipo] || '📍';
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Generador de QRs - Ubicaciones</h1>
                <p className="text-sm text-slate-500">Imprime etiquetas para cada ubicación</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/inventarios/ubicaciones')}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition text-sm"
              >
                ← Volver
              </button>
              {ubicacionesSeleccionadas.length > 0 && (
                <button
                  onClick={imprimirEtiquetas}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Imprimir {ubicacionesSeleccionadas.length} QRs
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Selecciona las ubicaciones para generar QRs</h2>
            <button
              onClick={seleccionarTodas}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              {ubicacionesSeleccionadas.length === ubicaciones.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ubicaciones.map((ub) => (
              <label
                key={ub.id}
                className={`p-4 border-2 rounded-xl cursor-pointer transition ${
                  ubicacionesSeleccionadas.includes(ub.id)
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-slate-200 hover:border-purple-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={ubicacionesSeleccionadas.includes(ub.id)}
                    onChange={() => toggleSeleccion(ub.id)}
                    className="w-5 h-5 text-purple-600 border-slate-300 rounded focus:ring-purple-500 mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{tipoIcono(ub.tipo)}</span>
                      <h3 className="font-semibold text-slate-900">{ub.nombre}</h3>
                    </div>
                    {ub.descripcion && (
                      <p className="text-sm text-slate-600 mt-1">{ub.descripcion}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-2">Orden: {ub.orden}</p>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </main>

      {/* VISTA PREVIA PARA IMPRESIÓN */}
      {vistaPrevia && (
        <div className="fixed inset-0 bg-white z-50 p-8 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-center mb-8">Etiquetas QR - Ubicaciones</h1>
            <div className="grid grid-cols-2 gap-8">
              {ubicacionesSeleccionadas.map((id) => {
                const ub = ubicaciones.find(u => u.id === id);
                if (!ub || !qrData[id]) return null;
                
                return (
                  <div key={id} className="border-2 border-slate-300 rounded-lg p-4 break-inside-avoid">
                    <div className="text-center">
                      <div className="text-4xl mb-2">{tipoIcono(ub.tipo)}</div>
                      <h3 className="font-bold text-lg mb-1">{ub.nombre}</h3>
                      {ub.descripcion && <p className="text-sm text-slate-600 mb-3">{ub.descripcion}</p>}
                      <img src={qrData[id]} alt="QR" className="mx-auto w-32 h-32" />
                      <p className="text-xs text-slate-400 mt-2">ID: {ub.id.substring(0, 8)}...</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
