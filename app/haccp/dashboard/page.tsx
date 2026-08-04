'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Definición de categorías con iconos SVG para aspecto profesional SaaS
const CATEGORIAS = [
  { 
    id: 'CAT_01', 
    nombre: 'Refrigeración y Equipos de Frío', 
    icono: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    color: 'text-cyan-600 bg-cyan-50 border-cyan-200'
  },
  { 
    id: 'CAT_02', 
    nombre: 'Cocción y Procesos', 
    icono: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>,
    color: 'text-orange-600 bg-orange-50 border-orange-200'
  },
  { 
    id: 'CAT_03', 
    nombre: 'Limpieza y Desinfección', 
    icono: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
  },
  { 
    id: 'CAT_04', 
    nombre: 'Recepción de Mercancías', 
    icono: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
    color: 'text-purple-600 bg-purple-50 border-purple-200'
  },
  { 
    id: 'CAT_05', 
    nombre: 'Almacenamiento y FIFO', 
    icono: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>,
    color: 'text-amber-600 bg-amber-50 border-amber-200'
  },
  { 
    id: 'CAT_06', 
    nombre: 'Buffet y Exposición', 
    icono: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
    color: 'text-pink-600 bg-pink-50 border-pink-200'
  },
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
      setErrorConexion('Error al cargar datos. Verifica la conexión.');
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

  const cumplimientoOK = stats.porcentajeCumplimiento;
  
  // Datos simulados para el gráfico diario (en producción vendrían de la API)
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
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse shadow-xl">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <p className="text-slate-500 font-medium animate-pulse text-sm tracking-wide">Cargando panel de control...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-900 selection:bg-cyan-100 selection:text-cyan-900">
      {/* HEADER CORREGIDO CON BOTÓN INCIDENCIAS */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200"
                title="Volver al Dashboard Principal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/10">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">Dashboard HACCP</h1>
                <p className="text-xs text-slate-500 font-medium">Control y seguimiento de puntos críticos</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* 🔥 NUEVO: Botón Ver Incidencias */}
              <button
                onClick={() => router.push('/haccp/incidencias')}
                className="px-4 py-2 text-sm font-medium text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition-all flex items-center gap-2 border border-rose-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Ver Incidencias
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 flex items-center gap-2 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                Dashboard Principal
              </button>
              <button
                onClick={() => router.push('/haccp')}
                className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-all duration-200 shadow-md shadow-slate-900/10 flex items-center gap-2 active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Nuevo Registro
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {errorConexion && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="font-medium text-sm">{errorConexion}</p>
            </div>
            <button onClick={() => cargarDatos(fechaInicio, fechaFin, categoriaFiltro, pccFiltro)} className="text-sm font-semibold underline hover:no-underline transition-colors">Reintentar</button>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard title="Total Registros" value={stats.totalRegistros} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} color="slate" />
          <KpiCard title="Registros OK" value={stats.registrosOK} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} color="emerald" />
          <KpiCard title="Incidencias" value={stats.registrosNOK} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} color="rose" />
          <KpiCard title="% Cumplimiento" value={`${stats.porcentajeCumplimiento}%`} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} color={stats.porcentajeCumplimiento >= 95 ? 'emerald' : stats.porcentajeCumplimiento >= 85 ? 'amber' : 'rose'} />
          <KpiCard title="Incidencias Hoy" value={stats.incidenciasHoy} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} color="orange" />
        </div>

        {/* GRÁFICOS DE CUMPLIMIENTO */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de tarta */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 hover:shadow-md transition-shadow duration-300">
            <h3 className="text-sm font-semibold text-slate-900 mb-6 flex items-center gap-2 uppercase tracking-wide">
              <span className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
              </span>
              Cumplimiento del Período
            </h3>
            <div className="flex items-center justify-center gap-8">
              <div className="relative">
                <div
                  className="w-40 h-40 rounded-full shadow-inner ring-4 ring-slate-50"
                  style={{
                    background: `conic-gradient(#10b981 0% ${cumplimientoOK}%, #f43f5e ${cumplimientoOK}% 100%)`
                  }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 bg-white rounded-full flex flex-col items-center justify-center shadow-sm">
                    <span className="text-2xl font-bold text-slate-900">{stats.porcentajeCumplimiento}%</span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">OK</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-100"></div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Conforme</p>
                    <p className="text-xs text-slate-500">{stats.registrosOK} registros</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-rose-500 ring-2 ring-rose-100"></div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">No Conforme</p>
                    <p className="text-xs text-slate-500">{stats.registrosNOK} registros</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-500">Total evaluado: <span className="font-bold text-slate-900">{stats.totalRegistros}</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico de barras */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 hover:shadow-md transition-shadow duration-300">
            <h3 className="text-sm font-semibold text-slate-900 mb-6 flex items-center gap-2 uppercase tracking-wide">
              <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </span>
              Tendencia Diaria (7 días)
            </h3>
            <div className="space-y-4">
              {datosDiarios.map((d, i) => (
                <div key={i} className="flex items-center gap-4 group">
                  <span className="text-xs font-semibold text-slate-500 w-8 group-hover:text-slate-900 transition-colors">{d.dia}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-7 overflow-hidden relative">
                    <div
                      className="h-full rounded-full flex items-center justify-end pr-3 transition-all duration-700 ease-out group-hover:brightness-110"
                      style={{
                        width: `${d.cumplimiento}%`,
                        background: d.cumplimiento >= 95 ? 'linear-gradient(90deg, #10b981, #34d399)' :
                                    d.cumplimiento >= 85 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' :
                                    'linear-gradient(90deg, #f43f5e, #fb7185)'
                      }}
                    >
                      <span className="text-[10px] font-bold text-white drop-shadow-md">{d.cumplimiento}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> ≥95% Óptimo</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> 85-94% Alerta</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> &lt;85% Crítico</span>
              </div>
            </div>
          </div>
        </div>

        {/* FILTROS */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
              <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              </span>
              Filtros de Búsqueda
            </h2>
            <button onClick={handleLimpiarFiltros} className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-all flex items-center gap-1.5 active:scale-95">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Restablecer
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Fecha Inicio</label>
              <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-sm transition-all outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Fecha Fin</label>
              <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-sm transition-all outline-none" />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Categoría</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleCategoriaClick('todas')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 border ${
                  categoriaFiltro === 'todas' 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/10' 
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                Todas
              </button>
              {CATEGORIAS.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoriaClick(cat.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 border ${
                    categoriaFiltro === cat.id 
                      ? `${cat.color} ring-2 ring-offset-1 ring-slate-200` 
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {cat.icono}
                  {cat.nombre}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Punto de Control (PCC)</label>
            <select value={pccFiltro} onChange={(e) => setPccFiltro(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-sm transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed">
              <option value="todas">Todos los PCCs</option>
              {pccs.map((pcc: any) => (
                <option key={pcc.id_pcc} value={pcc.id_pcc}>{pcc.nombre_pcc}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
            <button onClick={handleFiltrar} className="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-semibold transition-all flex items-center justify-center gap-2 text-sm shadow-md shadow-slate-900/10 active:scale-[0.98]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              Aplicar Filtros
            </button>
            <button onClick={handleExportarPDF} className="px-4 py-2.5 bg-white text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 font-semibold transition-all flex items-center justify-center gap-2 text-sm active:scale-[0.98]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Exportar PDF
            </button>
          </div>
        </div>

        {/* INCIDENCIAS */}
        {incidencias.length > 0 && (
          <div className="bg-white rounded-2xl border border-rose-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-rose-100 bg-rose-50/50 flex items-center gap-2">
              <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <h2 className="text-sm font-bold text-rose-900 uppercase tracking-wide">Incidencias Detectadas <span className="text-rose-600 font-normal normal-case">({incidencias.length})</span></h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
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
                    <tr key={inc.id_registro || index} className="hover:bg-rose-50/30 transition-colors">
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap font-mono text-xs">{new Date(inc.fecha_hora).toLocaleString('es-ES')}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">{inc.nombre_pcc}</td>
                      <td className="px-6 py-4 font-semibold text-rose-600">{inc.valor_medido || inc.temp_final || '-'} {inc.unidad || ''}</td>
                      <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={inc.accion_correctora}>{inc.accion_correctora || 'No documentada'}</td>
                      <td className="px-6 py-4 text-slate-500 font-mono text-xs">{inc.id_usuario}</td>
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
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M17 16h.01" /></svg>
              </span>
              Registros por Categoría
            </h2>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">{Object.keys(registrosPorCategoria).length} categorías activas</span>
          </div>

          {Object.keys(registrosPorCategoria).length > 0 ? (
            Object.entries(registrosPorCategoria).map(([catNombre, regs]: [string, any]) => {
              const catOK = (regs as any[]).filter((r: any) => r.estado === 'OK').length;
              const catNOK = (regs as any[]).filter((r: any) => r.estado === 'NO_OK').length;
              const catTotal = (regs as any[]).length;
              const catPorcentaje = catTotal > 0 ? Math.round((catOK / catTotal) * 100) : 0;
              
              return (
                <div key={catNombre} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
                      <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                      {catNombre}
                    </h3>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">✅ {catOK} OK</span>
                      {catNOK > 0 && <span className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 font-semibold border border-rose-100">⚠️ {catNOK} NO_OK</span>}
                      <span className="text-slate-500 font-medium ml-2">Total: {catTotal} · <span className="text-slate-900 font-bold">{catPorcentaje}%</span> conformidad</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
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
                          <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4 text-slate-600 whitespace-nowrap font-mono text-xs">{new Date(reg.fecha_hora).toLocaleString('es-ES')}</td>
                            <td className="px-6 py-4 font-medium text-slate-900">{reg.nombre_pcc}</td>
                            <td className="px-6 py-4 text-slate-600 font-mono text-xs">{reg.valor_medido || reg.temp_final || '-'} {reg.unidad || ''}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                                reg.estado === 'OK' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {reg.estado === 'OK' ? '✓ Conforme' : '⚠ No Conforme'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-500 font-mono text-xs">{reg.id_usuario}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <p className="text-slate-900 font-semibold text-lg">No hay registros en el período seleccionado</p>
              <p className="text-slate-500 text-sm mt-1 mb-4">Prueba a ampliar el rango de fechas o limpiar los filtros.</p>
              <button onClick={handleLimpiarFiltros} className="px-4 py-2 text-sm font-semibold text-cyan-700 bg-cyan-50 border border-cyan-200 rounded-lg hover:bg-cyan-100 transition-all">
                Restablecer filtros
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function KpiCard({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: string }) {
  const colorStyles: any = {
    slate: 'text-slate-600 bg-slate-50 border-slate-200',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    rose: 'text-rose-600 bg-rose-50 border-rose-200',
    amber: 'text-amber-600 bg-amber-50 border-amber-200',
    orange: 'text-orange-600 bg-orange-50 border-orange-200',
  };
  
  const valueColor: any = {
    slate: 'text-slate-900',
    emerald: 'text-emerald-600',
    rose: 'text-rose-600',
    amber: 'text-amber-600',
    orange: 'text-orange-600',
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{title}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors duration-300 group-hover:scale-110 ${colorStyles[color]}`}>
          {icon}
        </div>
      </div>
      <p className={`text-3xl font-bold tracking-tight ${valueColor[color]}`}>{value}</p>
    </div>
  );
}
