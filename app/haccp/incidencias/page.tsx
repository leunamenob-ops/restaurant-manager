'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Incidencia {
  id_registro: string;
  id_pcc: string;
  nombre_pcc: string;
  categoria_nombre: string;
  valor_medido: number | null;
  unidad: string | null;
  accion_correctora: string | null;
  foto_evidencia: string | null;
  fecha_hora: string;
  id_usuario: string;
  nombre_usuario?: string;
}

export default function IncidenciasPage() {
  const router = useRouter();
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incidenciaSeleccionada, setIncidenciaSeleccionada] = useState<Incidencia | null>(null);

  useEffect(() => {
    cargarIncidencias();
  }, []);

  async function cargarIncidencias() {
    setLoading(true);
    setError(null);
    try {
      const hoy = new Date().toISOString().split('T')[0];
      const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      console.log('📡 Cargando incidencias desde:', hace30Dias, 'hasta:', hoy);
      
      const res = await fetch(`/api/haccp/incidencias?inicio=${hace30Dias}&fin=${hoy}`);
      
      if (!res.ok) {
        throw new Error(`Error HTTP: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('📦 Datos recibidos de la API:', data);
      
      // Si la API devuelve un objeto con error, lo mostramos
      if (data.error) {
        setError(data.error);
        setIncidencias([]);
      } else {
        setIncidencias(Array.isArray(data) ? data : []);
      }
    } catch (err: any) {
      console.error('❌ Error cargando incidencias:', err);
      setError('No se pudieron cargar las incidencias. Verifica la conexión o el servidor.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-8 h-8 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-slate-500 font-medium animate-pulse">Cargando incidencias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/haccp')}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Incidencias HACCP</h1>
                <p className="text-sm text-slate-500">
                  {error ? 'Error al cargar los datos' : `${incidencias.length} incidencias en los últimos 30 días`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={cargarIncidencias}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                title="Recargar datos"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => router.push('/haccp/dashboard')}
                className="px-4 py-2 text-sm font-medium text-cyan-600 bg-cyan-50 rounded-lg hover:bg-cyan-100 transition-all"
              >
                Ver Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mensaje de Error */}
        {error && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-medium text-sm">{error}</p>
            </div>
            <button onClick={cargarIncidencias} className="text-sm font-semibold underline hover:no-underline">Reintentar</button>
          </div>
        )}

        {/* Estado Vacío (Sin errores y sin datos) */}
        {incidencias.length === 0 && !error ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Sin incidencias!</h2>
            <p className="text-slate-600">No se han registrado incidencias en los últimos 30 días.</p>
          </div>
        ) : !error ? (
          /* Grid de Incidencias */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {incidencias.map((inc) => (
              <button
                key={inc.id_registro}
                onClick={() => setIncidenciaSeleccionada(inc)}
                className="bg-white rounded-2xl border border-rose-200 shadow-sm p-6 text-left hover:shadow-lg transition-all hover:-translate-y-1 w-full"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-left">{inc.nombre_pcc}</h3>
                      <p className="text-xs text-slate-500 text-left">{inc.categoria_nombre}</p>
                    </div>
                  </div>
                  {inc.foto_evidencia && (
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="truncate">{new Date(inc.fecha_hora).toLocaleString('es-ES')}</span>
                  </div>
                  {inc.valor_medido !== null && (
                    <div className="flex items-center gap-2 text-rose-600 font-semibold">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                      </svg>
                      <span>Valor: {inc.valor_medido} {inc.unidad}</span>
                    </div>
                  )}
                  {inc.accion_correctora && (
                    <p className="text-slate-600 line-clamp-2 text-left">{inc.accion_correctora}</p>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Click para ver detalles
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </main>

      {/* Modal de detalles */}
      {incidenciaSeleccionada && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setIncidenciaSeleccionada(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-slate-900">Detalle de Incidencia</h2>
              <button onClick={() => setIncidenciaSeleccionada(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Info del PCC */}
              <div className="bg-slate-50 p-4 rounded-xl">
                <h3 className="text-lg font-bold text-slate-900 mb-2">{incidenciaSeleccionada.nombre_pcc}</h3>
                <p className="text-sm text-slate-600">{incidenciaSeleccionada.categoria_nombre}</p>
              </div>

              {/* Detalles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase">Fecha/Hora</p>
                  <p className="text-sm font-semibold">{new Date(incidenciaSeleccionada.fecha_hora).toLocaleString('es-ES')}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Usuario</p>
                  <p className="text-sm font-semibold">{incidenciaSeleccionada.id_usuario}</p>
                </div>
                {incidenciaSeleccionada.valor_medido !== null && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-slate-500 uppercase">Valor Medido</p>
                    <p className="text-sm font-semibold text-rose-600">
                      {incidenciaSeleccionada.valor_medido} {incidenciaSeleccionada.unidad}
                    </p>
                  </div>
                )}
              </div>

              {/* Acción Correctora */}
              {incidenciaSeleccionada.accion_correctora && (
                <div>
                  <p className="text-xs text-slate-500 uppercase mb-2">Acción Correctora</p>
                  <p className="text-sm text-slate-900 bg-rose-50 p-4 rounded-xl border border-rose-200">
                    {incidenciaSeleccionada.accion_correctora}
                  </p>
                </div>
              )}

              {/* Foto de Evidencia */}
              {incidenciaSeleccionada.foto_evidencia && (
                <div>
                  <p className="text-xs text-slate-500 uppercase mb-2">Foto de Evidencia</p>
                  <div className="relative group">
                    <img 
                      src={incidenciaSeleccionada.foto_evidencia} 
                      alt="Evidencia" 
                      className="w-full h-auto max-h-96 object-contain rounded-xl border border-slate-200 bg-slate-100"
                    />
                    <a 
                      href={incidenciaSeleccionada.foto_evidencia} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="absolute bottom-4 right-4 px-4 py-2 bg-white/90 backdrop-blur rounded-lg shadow-lg flex items-center gap-2 hover:bg-white transition-all text-sm font-medium text-slate-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Abrir en nueva pestaña
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
