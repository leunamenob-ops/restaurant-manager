'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORIAS = [
  { id: 'CAT_01', nombre: 'Refrigeración', icono: '❄️', color: 'bg-blue-500' },
  { id: 'CAT_02', nombre: 'Cocción', icono: '🔥', color: 'bg-orange-500' },
  { id: 'CAT_03', nombre: 'Limpieza', icono: '🧹', color: 'bg-emerald-500' },
  { id: 'CAT_04', nombre: 'Recepción', icono: '', color: 'bg-purple-500' },
  { id: 'CAT_05', nombre: 'Almacenamiento', icono: '🗄️', color: 'bg-amber-500' },
];

export default function HACCPDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [pccFiltro, setPccFiltro] = useState('todas');

  const [stats, setStats] = useState({
    totalRegistros: 0,
    registrosOK: 0,
    registrosNOK: 0,
    porcentajeCumplimiento: 0,
    incidenciasHoy: 0
  });

  const [incidencias, setIncidencias] = useState<any[]>([]);
  const [pccs, setPccs] = useState<any[]>([]);
  const [registrosPorCategoria, setRegistrosPorCategoria] = useState<any>({});
  const [errorConexion, setErrorConexion] = useState('');

  useEffect(() => {
    const hoy = new Date().toISOString().split('T')[0];
    const hace7Dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setFechaInicio(hace7Dias);
    setFechaFin(hoy);
    cargarDatos(hace7Dias, hoy, 'todas', 'todas');
  }, []);

  async function cargarPCCs(categoriaId: string) {
    try {
      let url = '/api/haccp/pcc';
      if (categoriaId && categoriaId !== 'todas') {
        url += `?categoria=${categoriaId}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setPccs(Array.isArray(data) ? data : []);
      setPccFiltro('todas');
    } catch (error) {
      console.error('Error cargando PCCs:', error);
      setPccs([]);
    }
  }

  async function cargarDatos(inicio: string, fin: string, categoria: string = 'todas', pcc: string = 'todas') {
    setLoading(true);
    setErrorConexion('');

    try {
      let urlStats = `/api/haccp/estadisticas?inicio=${inicio}&fin=${fin}`;
      let urlRegistros = `/api/haccp/registros?inicio=${inicio}&fin=${fin}&limite=100`;
      let urlIncidencias = `/api/haccp/incidencias?inicio=${inicio}&fin=${fin}`;

      if (categoria !== 'todas') {
        urlStats += `&categoria=${categoria}`;
        urlRegistros += `&categoria=${categoria}`;
        urlIncidencias += `&categoria=${categoria}`;
      }
      if (pcc !== 'todas') {
        urlStats += `&id_pcc=${pcc}`;
        urlRegistros += `&id_pcc=${pcc}`;
        urlIncidencias += `&id_pcc=${pcc}`;
      }

      const resStats = await fetch(urlStats);
      const dataStats = await resStats.json();
      if (!dataStats.error) setStats(dataStats);

      const resRegistros = await fetch(urlRegistros);
      const dataRegistros = await resRegistros.json();
      const registros = Array.isArray(dataRegistros) ? dataRegistros : [];

      const catMap: any = {};
      CATEGORIAS.forEach(c => { catMap[c.id] = c.nombre; });

      const porCategoria: any = {};
      registros.forEach((reg: any) => {
        const catId = reg.haccp_pcc?.categoria_id || reg.categoria_id;
        const catNombre = catMap[catId] || 'Sin Categoría';
        if (!porCategoria[catNombre]) porCategoria[catNombre] = [];
        porCategoria[catNombre].push(reg);
      });
      setRegistrosPorCategoria(porCategoria);

      const resIncidencias = await fetch(urlIncidencias);
      const dataIncidencias = await resIncidencias.json();
      setIncidencias(Array.isArray(dataIncidencias) ? dataIncidencias : []);

    } catch (error) {
      console.error('Error cargando datos:', error);
      setErrorConexion('Error al cargar datos.');
    } finally {
      setLoading(false);
    }
  }

  async function handleFiltrar() {
    await cargarDatos(fechaInicio, fechaFin, categoriaFiltro, pccFiltro);
  }

  async function handleCategoriaClick(categoriaId: string) {
    const nuevaCategoria = categoriaFiltro === categoriaId ? 'todas' : categoriaId;
    setCategoriaFiltro(nuevaCategoria);
    setPccFiltro('todas');
    await cargarPCCs(nuevaCategoria);
    await cargarDatos(fechaInicio, fechaFin, nuevaCategoria, 'todas');
  }

  async function handleLimpiarFiltros() {
    const hoy = new Date().toISOString().split('T')[0];
    const hace7Dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setFechaInicio(hace7Dias);
    setFechaFin(hoy);
    setCategoriaFiltro('todas');
    setPccFiltro('todas');
    await cargarPCCs('todas');
    await cargarDatos(hace7Dias, hoy, 'todas', 'todas');
  }

  async function handleExportarPDF() {
    let url = `/api/haccp/reporte-pdf?inicio=${fechaInicio}&fin=${fechaFin}`;
    if (categoriaFiltro !== 'todas') url += `&categoria=${categoriaFiltro}`;
    if (pccFiltro !== 'todas') url += `&id_pcc=${pccFiltro}`;
    window.open(url, '_blank');
  }

  // Datos para gráfico de tarta cumplimiento
  const cumplimientoOK = stats.porcentajeCumplimiento;
  const cumplimientoNOK = 100 - cumplimientoOK;

  // Simulación de datos diarios (últimos 7 días) - en producción vendría de la API
  const datosDiarios = [
    { dia: 'Lun', cumplimiento: 95 },
    { dia: 'Mar', cumplimiento: 88 },
    { dia: 'Mié', cumplimiento: 100 },
    { dia: 'Jue', cumplimiento: 75 },
    { dia: 'Vie', cumplimiento: 92 },
    { dia: 'Sáb', cumplimiento: 85 },
    { dia: 'Dom', cumplimiento: 90 },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <p className="text-slate-600 font-medium animate-pulse">Cargando panel HACCP...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* HEADER CON BOTÓN VOLVER */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 gap-4">
            <div className="flex items-center gap-4">
              {/* Botón volver al dashboard principal */}
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition text-slate-600"
                title="Volver al Dashboard Principal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Dashboard HACCP</h1>
                <p className="text-sm text-slate-500">Control, seguimiento y reportes de puntos críticos</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                Dashboard Principal
              </button>
              <button
                onClick={() => router.push('/haccp')}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-medium transition-all shadow-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Ir a Registro
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {errorConexion && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center justify-between">
            <p className="font-medium">{errorConexion}</p>
            <button onClick={() => cargarDatos(fechaInicio, fechaFin, categoriaFiltro, pccFiltro)} className="text-sm font-semibold underline">Reintentar</button>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard title="Total Registros" value={stats.totalRegistros} icon="" color="blue" />
          <KpiCard title="Registros OK" value={stats.registrosOK} icon="✅" color="emerald" />
          <KpiCard title="Incidencias" value={stats.registrosNOK} icon="⚠️" color="rose" />
          <KpiCard title="% Cumplimiento" value={`${stats.porcentajeCumplimiento}%`} icon="📈" color={stats.porcentajeCumplimiento >= 95 ? 'emerald' : stats.porcentajeCumplimiento >= 85 ? 'amber' : 'rose'} />
          <KpiCard title="Incidencias Hoy" value={stats.incidenciasHoy} icon="🕐" color="orange" />
        </div>

        {/* GRÁFICOS DE CUMPLIMIENTO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gráfico de tarta - Cumplimiento General */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-600 flex items-center justify-center">🎯</span>
              Cumplimiento del Período
            </h3>
            <div className="flex items-center justify-center gap-8">
              {/* Tarta con conic-gradient */}
              <div className="relative">
                <div
                  className="w-40 h-40 rounded-full shadow-lg"
                  style={{
                    background: `conic-gradient(#10b981 0% ${cumplimientoOK}%, #ef4444 ${cumplimientoOK}% 100%)`
                  }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                    <span className="text-2xl font-bold text-slate-900">{stats.porcentajeCumplimiento}%</span>
                    <span className="text-xs text-slate-500">OK</span>
                  </div>
                </div>
              </div>
              {/* Leyenda */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-emerald-500"></div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">OK</p>
                    <p className="text-xs text-slate-500">{stats.registrosOK} registros</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-rose-500"></div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">NO_OK</p>
                    <p className="text-xs text-slate-500">{stats.registrosNOK} registros</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-xs text-slate-500">Total: <span className="font-bold text-slate-900">{stats.totalRegistros}</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico de barras - Cumplimiento Diario */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">📅</span>
              Cumplimiento Diario (7 días)
            </h3>
            <div className="space-y-3">
              {datosDiarios.map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-600 w-8">{d.dia}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                      style={{
                        width: `${d.cumplimiento}%`,
                        background: d.cumplimiento >= 95 ? 'linear-gradient(90deg, #10b981, #34d399)' :
                                    d.cumplimiento >= 85 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' :
                                    'linear-gradient(90deg, #ef4444, #f87171)'
                      }}
                    >
                      <span className="text-xs font-bold text-white">{d.cumplimiento}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500"></span> ≥95%</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500"></span> 85-94%</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-500"></span> &lt;85%</span>
              </div>
            </div>
          </div>
        </div>

        {/* FILTROS */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              Filtros de Búsqueda
            </h2>
            <button onClick={handleLimpiarFiltros} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-all flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Limpiar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Fecha Inicio</label>
              <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Fecha Fin</label>
              <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm" />
            </div>
          </div>

          {/* Botones de categoría */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Categoría</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleCategoriaClick('todas')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  categoriaFiltro === 'todas' ? 'bg-cyan-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                📊 Todas
              </button>
              {CATEGORIAS.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoriaClick(cat.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    categoriaFiltro === cat.id ? 'bg-cyan-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat.icono} {cat.nombre}
                </button>
              ))}
            </div>
          </div>

          {/* PCC */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Punto de Control (PCC)</label>
            <select value={pccFiltro} onChange={(e) => setPccFiltro(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm">
              <option value="todas">Todos los PCCs</option>
              {pccs.map((pcc: any) => (
                <option key={pcc.id_pcc} value={pcc.id_pcc}>{pcc.nombre_pcc}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button onClick={handleFiltrar} className="flex-1 px-4 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-semibold transition-all flex items-center justify-center gap-2 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              Filtrar
            </button>
            <button onClick={handleExportarPDF} className="px-4 py-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-semibold transition-all flex items-center gap-2 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Reporte PDF
            </button>
          </div>
        </div>

        {/* INCIDENCIAS */}
        {incidencias.length > 0 && (
          <div className="bg-white rounded-2xl border border-rose-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-rose-100 bg-rose-50/50 flex items-center gap-2">
              <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <h2 className="text-lg font-bold text-rose-900">Incidencias Detectadas <span className="text-rose-600 font-normal">({incidencias.length})</span></h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-6 py-3">Fecha/Hora</th>
                    <th className="px-6 py-3">PCC</th>
                    <th className="px-6 py-3">Valor</th>
                    <th className="px-6 py-3">Acción Correctora</th>
                    <th className="px-6 py-3">Usuario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {incidencias.map((inc: any, index: number) => (
                    <tr key={inc.id_registro || index} className="hover:bg-rose-50/30">
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{new Date(inc.fecha_hora).toLocaleString('es-ES')}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">{inc.nombre_pcc}</td>
                      <td className="px-6 py-4 font-semibold text-rose-600">{inc.valor_medido || inc.temp_final || '-'} {inc.unidad || ''}</td>
                      <td className="px-6 py-4 text-slate-600 max-w-xs truncate">{inc.accion_correctora || 'No documentada'}</td>
                      <td className="px-6 py-4 text-slate-500">{inc.id_usuario}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REGISTROS POR CATEGORÍA */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Registros por Categoría</h2>
            <span className="text-sm text-slate-500">{Object.keys(registrosPorCategoria).length} categorías</span>
          </div>

          {Object.keys(registrosPorCategoria).length > 0 ? (
            Object.entries(registrosPorCategoria).map(([catNombre, regs]: [string, any]) => {
              const catOK = (regs as any[]).filter((r: any) => r.estado === 'OK').length;
              const catNOK = (regs as any[]).filter((r: any) => r.estado === 'NO_OK').length;
              const catTotal = (regs as any[]).length;
              const catPorcentaje = catTotal > 0 ? Math.round((catOK / catTotal) * 100) : 0;
              return (
                <div key={catNombre} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-cyan-50 to-teal-50 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">📁 {catNombre}</h3>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold">✅ {catOK}</span>
                      {catNOK > 0 && <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-700 font-semibold">⚠️ {catNOK}</span>}
                      <span className="text-slate-500">Total: {catTotal} · {catPorcentaje}% OK</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                        <tr>
                          <th className="px-6 py-3">Fecha/Hora</th>
                          <th className="px-6 py-3">PCC</th>
                          <th className="px-6 py-3">Valor</th>
                          <th className="px-6 py-3">Estado</th>
                          <th className="px-6 py-3">Usuario</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(regs as any[]).map((reg: any, index: number) => (
                          <tr key={index} className="hover:bg-slate-50/80">
                            <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{new Date(reg.fecha_hora).toLocaleString('es-ES')}</td>
                            <td className="px-6 py-4 font-medium text-slate-900">{reg.nombre_pcc}</td>
                            <td className="px-6 py-4 text-slate-600">{reg.valor_medido || reg.temp_final || '-'} {reg.unidad || ''}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${reg.estado === 'OK' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                {reg.estado === 'OK' ? '✓ ' : '⚠ '}{reg.estado}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-500">{reg.id_usuario}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
              <p className="text-slate-500 text-lg">No hay registros en el período seleccionado.</p>
              <button onClick={handleLimpiarFiltros} className="mt-4 px-4 py-2 text-cyan-600 font-medium hover:underline">
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function KpiCard({ title, value, icon, color }: { title: string, value: string | number, icon: string, color: string }) {
  const colors: any = {
    blue: 'from-blue-500 to-cyan-500',
    emerald: 'from-emerald-500 to-teal-500',
    rose: 'from-rose-500 to-pink-500',
    amber: 'from-amber-500 to-orange-500',
    orange: 'from-orange-500 to-red-500',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className={`text-3xl font-bold bg-gradient-to-r ${colors[color]} bg-clip-text text-transparent`}>{value}</p>
    </div>
  );
}
