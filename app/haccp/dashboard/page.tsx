'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HACCPDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  
  const [stats, setStats] = useState({ totalRegistros: 0, registrosOK: 0, registrosNOK: 0, porcentajeCumplimiento: 0, incidenciasHoy: 0 });
  const [registrosRecientes, setRegistrosRecientes] = useState<any[]>([]);
  const [incidencias, setIncidencias] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [registrosPorCategoria, setRegistrosPorCategoria] = useState<any>({});
  const [errorConexion, setErrorConexion] = useState('');

  useEffect(() => {
    const hoy = new Date().toISOString().split('T')[0];
    const hace7Dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setFechaInicio(hace7Dias);
    setFechaFin(hoy);
    cargarCategorias(); // Cargar categorías al inicio
    cargarDatos(hace7Dias, hoy, 'todas');
  }, []);

  async function cargarCategorias() {
    try {
      const res = await fetch('/api/haccp/categorias');
      const data = await res.json();
      setCategorias(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error cargando categorías:', error);
    }
  }

  async function cargarDatos(inicio: string, fin: string, categoria: string = 'todas') {
    setLoading(true);
    setErrorConexion('');
    try {
      let urlRegistros = `/api/haccp/registros?inicio=${inicio}&fin=${fin}&limite=100`;
      let urlIncidencias = `/api/haccp/incidencias?inicio=${inicio}&fin=${fin}`;
      
      if (categoria !== 'todas') {
        urlRegistros += `&categoria=${categoria}`;
        urlIncidencias += `&categoria=${categoria}`;
      }

      // 1. Estadísticas
      let urlStats = `/api/haccp/estadisticas?inicio=${inicio}&fin=${fin}`;
      if (categoria !== 'todas') urlStats += `&categoria=${categoria}`;
      const resStats = await fetch(urlStats);
      const dataStats = await resStats.json();
      if (!dataStats.error) setStats(dataStats);

      // 2. Registros
      const resRegistros = await fetch(urlRegistros);
      const dataRegistros = await resRegistros.json();
      const registros = Array.isArray(dataRegistros) ? dataRegistros : [];
      setRegistrosRecientes(registros);

      // Agrupar por categoría (usando el nombre si existe, o fallback)
      const porCategoria: any = {};
      registros.forEach((reg: any) => {
        // Intenta usar categoria_nombre, si no, usa un fallback basado en el ID del PCC si estuviera disponible
        let catNombre = reg.categoria_nombre || 'Sin Categoría';
        if (!porCategoria[catNombre]) porCategoria[catNombre] = [];
        porCategoria[catNombre].push(reg);
      });
      setRegistrosPorCategoria(porCategoria);

      // 3. Incidencias
      const resIncidencias = await fetch(urlIncidencias);
      const dataIncidencias = await resIncidencias.json();
      setIncidencias(Array.isArray(dataIncidencias) ? dataIncidencias : []);

    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      setErrorConexion('Error al cargar datos. Verifica la conexión.');
    } finally {
      setLoading(false);
    }
  }

  async function handleFiltrar() {
    await cargarDatos(fechaInicio, fechaFin, categoriaFiltro);
  }

  async function handleExportarPDF() {
    const catParam = categoriaFiltro === 'todas' ? '' : `&categoria=${categoriaFiltro}`;
    const url = `/api/haccp/reporte-pdf?inicio=${fechaInicio}&fin=${fechaFin}${catParam}`;
    window.open(url, '_blank');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <p className="text-slate-600 font-medium animate-pulse">Cargando panel...</p>
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
                <p className="text-sm text-slate-500">Control, seguimiento y reportes</p>
              </div>
            </div>
            <button onClick={() => router.push('/haccp')} className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-medium transition-all shadow-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Ir a Registro
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {errorConexion && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center justify-between">
            <p className="font-medium">{errorConexion}</p>
            <button onClick={() => cargarDatos(fechaInicio, fechaFin, categoriaFiltro)} className="text-sm font-semibold underline">Reintentar</button>
          </div>
        )}

        {/* FILTROS */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Fecha Inicio</label>
              <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Fecha Fin</label>
              <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Categoría</label>
              <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm">
                <option value="todas">Todas las categorías</option>
                {categorias.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button onClick={handleFiltrar} className="flex-1 px-4 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-semibold transition-all text-sm">Filtrar</button>
              <button onClick={handleExportarPDF} className="px-4 py-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-semibold transition-all text-sm">📄 Reporte</button>
            </div>
          </div>
        </div>

        {/* ESTADÍSTICAS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Registros" value={stats.totalRegistros} color="blue" />
          <StatCard title="Registros OK" value={stats.registrosOK} color="emerald" />
          <StatCard title="Incidencias NO_OK" value={stats.registrosNOK} color="rose" />
          <StatCard title="% Cumplimiento" value={`${stats.porcentajeCumplimiento}%`} color={stats.porcentajeCumplimiento >= 95 ? 'emerald' : 'amber'} />
        </div>

        {/* REGISTROS AGRUPADOS POR CATEGORÍA */}
        <div className="space-y-6">
          {Object.keys(registrosPorCategoria).length > 0 ? (
            Object.entries(registrosPorCategoria).map(([catNombre, regs]: [string, any]) => {
              const catOK = (regs as any[]).filter((r: any) => r.estado === 'OK').length;
              const catNOK = (regs as any[]).filter((r: any) => r.estado === 'NO_OK').length;
              
              return (
                <div key={catNombre} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-cyan-50 to-teal-50 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">📁 {catNombre}</h3>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold">✅ {catOK}</span>
                      {catNOK > 0 && <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-700 font-semibold">⚠️ {catNOK}</span>}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                        <tr><th className="px-6 py-3">Fecha/Hora</th><th className="px-6 py-3">PCC</th><th className="px-6 py-3">Valor</th><th className="px-6 py-3">Estado</th><th className="px-6 py-3">Usuario</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(regs as any[]).map((reg: any, index: number) => (
                          <tr key={index} className="hover:bg-slate-50/80 transition-colors">
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
              <p className="text-slate-500">No hay registros en el período seleccionado.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, color }: { title: string, value: string | number, color: string }) {
  const colors: any = { blue: 'text-blue-600', emerald: 'text-emerald-600', rose: 'text-rose-600', amber: 'text-amber-600' };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
      <p className={`text-3xl font-bold ${colors[color] || 'text-slate-900'}`}>{value}</p>
    </div>
  );
}
