'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HACCPDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  
  // Estadísticas
  const [stats, setStats] = useState({
    totalRegistros: 0,
    registrosOK: 0,
    registrosNOK: 0,
    porcentajeCumplimiento: 0,
    incidenciasHoy: 0
  });

  // Datos
  const [registrosRecientes, setRegistrosRecientes] = useState<any[]>([]);
  const [incidencias, setIncidencias] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [errorConexion, setErrorConexion] = useState('');

  useEffect(() => {
    // Establecer fechas por defecto (últimos 7 días)
    const hoy = new Date().toISOString().split('T')[0];
    const hace7Dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setFechaInicio(hace7Dias);
    setFechaFin(hoy);
    
    cargarDatos(hace7Dias, hoy);
  }, []);

  async function cargarDatos(inicio: string, fin: string) {
    setLoading(true);
    setErrorConexion('');
    
    try {
      console.log('🔍 Cargando datos HACCP desde:', inicio, 'hasta:', fin);
      
      // Cargar estadísticas
      const resStats = await fetch(`/api/haccp/estadisticas?inicio=${inicio}&fin=${fin}`);
      const dataStats = await resStats.json();
      
      if (dataStats.error) {
        throw new Error(dataStats.error);
      }
      
      setStats({
        totalRegistros: dataStats.totalRegistros || 0,
        registrosOK: dataStats.registrosOK || 0,
        registrosNOK: dataStats.registrosNOK || 0,
        porcentajeCumplimiento: dataStats.porcentajeCumplimiento || 0,
        incidenciasHoy: dataStats.incidenciasHoy || 0
      });

      // Cargar registros recientes
      const resRegistros = await fetch(`/api/haccp/registros?inicio=${inicio}&fin=${fin}&limite=10`);
      const dataRegistros = await resRegistros.json();
      setRegistrosRecientes(Array.isArray(dataRegistros) ? dataRegistros : []);

      // Cargar incidencias NO_OK
      const resIncidencias = await fetch(`/api/haccp/incidencias?inicio=${inicio}&fin=${fin}`);
      const dataIncidencias = await resIncidencias.json();
      setIncidencias(Array.isArray(dataIncidencias) ? dataIncidencias : []);

      // Cargar categorías para el filtro
      const resCategorias = await fetch('/api/haccp/categorias');
      const dataCategorias = await resCategorias.json();
      setCategorias(Array.isArray(dataCategorias) ? dataCategorias : []);

    } catch (error) {
      console.error('❌ Error cargando datos del dashboard:', error);
      setErrorConexion('Error al cargar datos. Verifica la conexión o reintenta.');
    } finally {
      setLoading(false);
    }
  }

  async function handleFiltrar() {
    await cargarDatos(fechaInicio, fechaFin);
  }

  async function handleExportarPDF() {
    try {
      const catParam = categoriaFiltro === 'todas' ? '' : `&categoria=${categoriaFiltro}`;
      // NOTA: Apunta a la nueva ruta que usa @react-pdf/renderer
      const url = `/api/haccp/reporte-pdf?inicio=${fechaInicio}&fin=${fechaFin}${catParam}`;
      
      // Abrir en nueva pestaña para descargar el PDF generado
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error exportando PDF:', error);
      alert('Error al generar el PDF');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando dashboard HACCP...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                🛡️ Dashboard HACCP
              </h1>
              <p className="text-cyan-100 mt-1">Control, seguimiento y reportes de puntos críticos</p>
            </div>
            <button
              onClick={() => router.push('/haccp')}
              className="px-6 py-3 bg-white/20 rounded-lg hover:bg-white/30 transition font-semibold flex items-center gap-2"
            >
              <span>📝</span> Ir a Registro
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Mensaje de error de conexión */}
        {errorConexion && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            <p className="font-semibold">⚠️ {errorConexion}</p>
            <button 
              onClick={() => cargarDatos(fechaInicio, fechaFin)}
              className="mt-2 text-sm underline hover:no-underline"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-slate-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>📅</span> Filtros de Búsqueda
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Inicio:</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Fin:</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoría:</label>
              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white"
              >
                <option value="todas">Todas las categorías</option>
                {Array.isArray(categorias) && categorias.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleFiltrar}
                className="flex-1 px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-semibold transition shadow-sm flex items-center justify-center gap-2"
              >
                <span>🔍</span> Filtrar
              </button>
              <button
                onClick={handleExportarPDF}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition shadow-sm flex items-center gap-2"
                title="Descargar reporte en PDF"
              >
                <span>📄</span> PDF
              </button>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <p className="text-gray-600 text-sm font-medium mb-1">Total Registros</p>
            <p className="text-3xl font-bold text-blue-600">{stats.totalRegistros}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <p className="text-gray-600 text-sm font-medium mb-1">Registros OK</p>
            <p className="text-3xl font-bold text-green-600">{stats.registrosOK}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
            <p className="text-gray-600 text-sm font-medium mb-1">Incidencias NO_OK</p>
            <p className="text-3xl font-bold text-red-600">{stats.registrosNOK}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
            <p className="text-gray-600 text-sm font-medium mb-1">% Cumplimiento</p>
            <p className={`text-3xl font-bold ${stats.porcentajeCumplimiento >= 95 ? 'text-green-600' : stats.porcentajeCumplimiento >= 85 ? 'text-yellow-600' : 'text-red-600'}`}>
              {stats.porcentajeCumplimiento}%
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
            <p className="text-gray-600 text-sm font-medium mb-1">Incidencias Hoy</p>
            <p className="text-3xl font-bold text-orange-600">{stats.incidenciasHoy}</p>
          </div>
        </div>

        {/* Incidencias Críticas */}
        {incidencias.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6 border border-red-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-red-600">⚠️</span> Incidencias Detectadas ({incidencias.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-red-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-red-800">Fecha/Hora</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-red-800">PCC</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-red-800">Valor</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-red-800">Acción Correctora</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-red-800">Usuario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {incidencias.map((inc: any, index: number) => (
                    <tr key={inc.id_registro || index} className="hover:bg-red-50 transition">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(inc.fecha_hora).toLocaleString('es-ES')}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{inc.nombre_pcc}</td>
                      <td className="px-4 py-3 text-sm text-red-600 font-semibold">
                        {inc.valor_medido || inc.temp_final || '-'} {inc.unidad || ''}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate" title={inc.accion_correctora}>
                        {inc.accion_correctora || 'No documentada'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{inc.id_usuario}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Registros Recientes */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-slate-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>📋</span> Registros Recientes
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fecha/Hora</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">PCC</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Valor</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {registrosRecientes.length > 0 ? (
                  registrosRecientes.map((reg: any, index: number) => (
                    <tr key={reg.id_registro || index} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(reg.fecha_hora).toLocaleString('es-ES')}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{reg.nombre_pcc}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {reg.valor_medido || reg.temp_final || '-'} {reg.unidad || ''}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          reg.estado === 'OK' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {reg.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{reg.id_usuario}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No hay registros en el período seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}