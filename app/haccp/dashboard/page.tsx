'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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

  const [registrosRecientes, setRegistrosRecientes] = useState<any[]>([]);
  const [incidencias, setIncidencias] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [pccs, setPccs] = useState<any[]>([]);
  const [registrosPorCategoria, setRegistrosPorCategoria] = useState<any>({});
  const [errorConexion, setErrorConexion] = useState('');

  // 🔥 Inicialización secuencial
  useEffect(() => {
    const hoy = new Date().toISOString().split('T')[0];
    const hace7Dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setFechaInicio(hace7Dias);
    setFechaFin(hoy);
    
    const iniciar = async () => {
      await cargarCategorias();
      await cargarPCCs('todas');
      await cargarDatos(hace7Dias, hoy, 'todas', 'todas');
    };
    iniciar();
  }, []);

  // 🔥 Cargar categorías
  async function cargarCategorias() {
    try {
      const res = await fetch('/api/haccp/categorias', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setCategorias(data);
      }
    } catch (error) {
      console.error('Error cargando categorías:', error);
      setCategorias([]);
    }
  }

  // 🔥 Cargar PCCs
  async function cargarPCCs(categoriaId: string) {
    try {
      let url = '/api/haccp/pcc';
      if (categoriaId && categoriaId !== 'todas') {
        url += `?categoria=${categoriaId}`;
      }
      
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      setPccs(Array.isArray(data) ? data : []);
      setPccFiltro('todas');
    } catch (error) {
      console.error('Error cargando PCCs:', error);
      setPccs([]);
    }
  }

  // 🔥 Cargar datos (registros, stats, incidencias)
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
      setRegistrosRecientes(registros);

      // 🔥 Mapeo seguro de categorías usando el diccionario cargado
      const porCategoria: any = {};
      const catMap: any = {};
      categorias.forEach((c: any) => { catMap[c.id] = c.nombre; });

      registros.forEach((reg: any) => {
        const catId = reg.haccp_pcc?.categoria_id || reg.categoria_id;
        let catNombre = catMap[catId] || reg.categoria_nombre || 'Sin Categoría';
        
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

  async function handleCategoriaChange(valor: string) {
    setCategoriaFiltro(valor);
    setPccFiltro('todas');
    await cargarPCCs(valor);
    await cargarDatos(fechaInicio, fechaFin, valor, 'todas');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <p className="text-slate-600 font-medium animate-pulse">Cargando panel de control HACCP...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Dashboard HACCP</h1>
                <p className="text-sm text-slate-500">Control, seguimiento y reportes de puntos críticos</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/haccp')}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Ir a Registro
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {errorConexion && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="font-medium">{errorConexion}</p>
            </div>
            <button onClick={() => cargarDatos(fechaInicio, fechaFin, categoriaFiltro, pccFiltro)} className="text-sm font-semibold underline hover:no-underline">Reintentar</button>
          </div>
        )}

        {/* FILTROS */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              Filtros de Búsqueda
            </h2>
            <button
              onClick={handleLimpiarFiltros}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Limpiar Filtros
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Fecha Inicio</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Fecha Fin</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Categoría</label>
              <select
                value={categoriaFiltro}
                onChange={(e) => handleCategoriaChange(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all text-sm"
              >
                <option value="todas">Todas las categorías</option>
                {categorias.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Punto de Control (PCC)</label>
              <select
                value={pccFiltro}
                onChange={(e) => setPccFiltro(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all text-sm"
                disabled={categoriaFiltro === 'todas'}
              >
                <option value="todas">Todos los PCCs</option>
                {pccs.map((pcc: any) => (
                  <option key={pcc.id_pcc} value={pcc.id_pcc}>{pcc.nombre_pcc}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleFiltrar}
              className="flex-1 px-4 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-semibold transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              Filtrar
            </button>
            <button
              onClick={handleExportarPDF}
              className="px-4 py-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-semibold transition-all shadow-sm hover:shadow-md flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Reporte
            </button>
          </div>
        </div>

        {/* ESTADÍSTICAS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Total Registros" value={stats.totalRegistros} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} color="blue" />
          <StatCard title="Registros OK" value={stats.registrosOK} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} color="emerald" />
          <StatCard title="Incidencias NO_OK" value={stats.registrosNOK} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} color="rose" />
          <StatCard title="% Cumplimiento" value={`${stats.porcentajeCumplimiento}%`} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} color={stats.porcentajeCumplimiento >= 95 ? 'emerald' : stats.porcentajeCumplimiento >= 85 ? 'amber' : 'rose'} />
          <StatCard title="Incidencias Hoy" value={stats.incidenciasHoy} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} color="orange" />
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
                    <tr key={inc.id_registro || index} className="hover:bg-rose-50/30 transition-colors">
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
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M17 16h.01" /></svg>
              Registros por Categoría
            </h2>
            <span className="text-sm text-slate-500">{Object.keys(registrosPorCategoria).length} categorías con registros</span>
          </div>

          {Object.keys(registrosPorCategoria).length > 0 ? (
            Object.entries(registrosPorCategoria).map(([catNombre, regs]: [string, any]) => {
              const catOK = (regs as any[]).filter((r: any) => r.estado === 'OK').length;
              const catNOK = (regs as any[]).filter((r: any) => r.estado === 'NO_OK').length;
              
              return (
                <div key={catNombre} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-cyan-50 to-teal-50 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-cyan-600 text-white flex items-center justify-center text-sm">📁</span>
                      {catNombre}
                    </h3>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold">✅ {catOK} OK</span>
                      {catNOK > 0 && (
                        <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-700 font-semibold">⚠️ {catNOK} NO_OK</span>
                      )}
                      <span className="text-slate-500">Total: {(regs as any[]).length}</span>
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
                          <tr key={reg.id_registro || index} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{new Date(reg.fecha_hora).toLocaleString('es-ES')}</td>
                            <td className="px-6 py-4 font-medium text-slate-900">{reg.nombre_pcc}</td>
                            <td className="px-6 py-4 text-slate-600">{reg.valor_medido || reg.temp_final || '-'} {reg.unidad || ''}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                reg.estado === 'OK' 
                                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                                  : 'bg-rose-100 text-rose-700 border border-rose-200'
                              }`}>
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
              <div className="flex flex-col items-center gap-2">
                <svg className="w-16 h-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <p className="text-slate-500 text-lg">No hay registros en el período seleccionado.</p>
                <button onClick={handleLimpiarFiltros} className="mt-4 px-4 py-2 text-cyan-600 font-medium hover:underline">
                  Limpiar filtros y ver todos los registros
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
  };

  const textColorMap: Record<string, string> = {
    blue: 'text-blue-700',
    emerald: 'text-emerald-700',
    rose: 'text-rose-700',
    amber: 'text-amber-700',
    orange: 'text-orange-700',
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
          <p className={`text-3xl font-bold ${textColorMap[color] || 'text-slate-900'}`}>{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
