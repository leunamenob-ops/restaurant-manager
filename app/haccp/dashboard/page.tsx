'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HACCPDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
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
  const [registrosRecentes, setRegistrosRecentes] = useState<any[]>([]);
  const [incidencias, setIncidencias] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);

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
    try {
      // Cargar estadísticas
      const resStats = await fetch(`/api/haccp/estadisticas?inicio=${inicio}&fin=${fin}`);
      const dataStats = await resStats.json();
      setStats(dataStats);

      // Cargar registros recientes
      const resRegistros = await fetch(`/api/haccp/registros?inicio=${inicio}&fin=${fin}&limite=10`);
      const dataRegistros = await resRegistros.json();
      setRegistrosRecentes(dataRegistros);

      // Cargar incidencias NO_OK
      const resIncidencias = await fetch(`/api/haccp/incidencias?inicio=${inicio}&fin=${fin}`);
      const dataIncidencias = await resIncidencias.json();
      setIncidencias(dataIncidencias);

      // Cargar categorías
      const resCategorias = await fetch('/api/haccp/categorias');
      const dataCategorias = await resCategorias.json();
      setCategorias(dataCategorias);

    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleFiltrar() {
    await cargarDatos(fechaInicio, fechaFin);
  }

  async function handleExportarCSV() {
    try {
      const res = await fetch(`/api/haccp/exportar-csv?inicio=${fechaInicio}&fin=${fechaFin}&categoria=${categoriaFiltro}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-haccp-${fechaInicio}-${fechaFin}.csv`;
      a.click();
    } catch (error) {
      console.error('Error exportando:', error);
      alert('Error al exportar el reporte');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando dashboard...</p>
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
              <p className="text-cyan-100 mt-1">Control y seguimiento de puntos críticos</p>
            </div>
            <button
              onClick={() => router.push('/haccp')}
              className="px-6 py-3 bg-white/20 rounded-lg hover:bg-white/30 transition font-semibold"
            >
              ← Registro
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">📅 Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Inicio:</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Fin:</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoría:</label>
              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
              >
                <option value="todas">Todas las categorías</option>
                {categorias.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleFiltrar}
                className="flex-1 px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-semibold transition"
              >
                🔍 Filtrar
              </button>
              <button
                onClick={handleExportarCSV}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition"
              >
                📥 CSV
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
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              ️ Incidencias Detectadas ({incidencias.length})
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
                  {incidencias.map((inc: any) => (
                    <tr key={inc.id_registro} className="hover:bg-red-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(inc.fecha_hora).toLocaleString('es-ES')}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{inc.nombre_pcc}</td>
                      <td className="px-4 py-3 text-sm text-red-600 font-semibold">
                        {inc.valor_medido || inc.temp_final} {inc.unidad}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{inc.accion_correctora}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{inc.id_usuario}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Registros Recientes */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📋 Registros Recientes</h2>
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
                {registrosRecentes.map((reg: any) => (
                  <tr key={reg.id_registro} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(reg.fecha_hora).toLocaleString('es-ES')}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{reg.nombre_pcc}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {reg.valor_medido || reg.temp_final} {reg.unidad}
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
