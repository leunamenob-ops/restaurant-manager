'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Categoria {
  id: string;
  nombre: string;
  descripcion: string;
  icono: React.ReactNode;
  color: string;
  border: string;
  iconBg: string;
  totalPCCs: number;
  pccsCompletadosHoy: number;
}

const CATEGORIAS_DATA = [
  { 
    id: 'CAT_01', 
    nombre: 'Refrigeración', 
    descripcion: 'Control de temperaturas de cámaras y equipos de frío',
    icono: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    color: 'from-cyan-50 to-white',
    border: 'border-cyan-200',
    iconBg: 'bg-cyan-500'
  },
  { 
    id: 'CAT_02', 
    nombre: 'Cocción', 
    descripcion: 'Control de temperaturas de cocción y productos cocinados',
    icono: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>,
    color: 'from-orange-50 to-white',
    border: 'border-orange-200',
    iconBg: 'bg-orange-500'
  },
  { 
    id: 'CAT_03', 
    nombre: 'Limpieza', 
    descripcion: 'Control de limpieza y desinfección de superficies y equipos',
    icono: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>,
    color: 'from-emerald-50 to-white',
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-500'
  },
  { 
    id: 'CAT_04', 
    nombre: 'Recepción', 
    descripcion: 'Control de recepción de mercancías y productos',
    icono: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
    color: 'from-purple-50 to-white',
    border: 'border-purple-200',
    iconBg: 'bg-purple-500'
  },
  { 
    id: 'CAT_05', 
    nombre: 'Almacenamiento', 
    descripcion: 'Control de almacenamiento y FIFO',
    icono: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>,
    color: 'from-amber-50 to-white',
    border: 'border-amber-200',
    iconBg: 'bg-amber-500'
  },
];

export default function HACCPHome() {
  const router = useRouter();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarCategorias();
  }, []);

  async function cargarCategorias() {
    try {
      const hoy = new Date().toISOString().split('T')[0];
      
      // Obtener categorías con conteo de PCCs
      const resCategorias = await fetch('/api/haccp/categorias');
      const dataCategorias = await resCategorias.json();

      // Obtener registros de hoy
      const resRegistros = await fetch(`/api/haccp/registros?inicio=${hoy}&fin=${hoy}`);
      const registrosHoy = await resRegistros.json();

      // Calcular estadísticas por categoría
      const categoriasConStats = dataCategorias.map((cat: any) => {
        const pccsCompletados = new Set(
          registrosHoy
            .filter((r: any) => r.haccp_pcc?.categoria_id === cat.id)
            .map((r: any) => r.id_pcc)
        ).size;

        return {
          ...cat,
          totalPCCs: 0, // Se calculará en el siguiente paso
          pccsCompletadosHoy: pccsCompletados
        };
      });

      // Obtener total de PCCs por categoría
      const resPCCs = await fetch('/api/haccp/pcc');
      const allPCCs = await resPCCs.json();

      const categoriasFinales = categoriasConStats.map((cat: any) => {
        const totalPCCs = allPCCs.filter((pcc: any) => pcc.categoria_id === cat.id).length;
        return {
          ...cat,
          totalPCCs,
          porcentajeCompletado: totalPCCs > 0 ? Math.round((cat.pccsCompletadosHoy / totalPCCs) * 100) : 0
        };
      });

      setCategorias(categoriasFinales);
    } catch (error) {
      console.error('Error cargando categorías:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <p className="text-slate-500 font-medium animate-pulse">Cargando módulos HACCP...</p>
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
                onClick={() => window.history.back()}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Control HACCP</h1>
                <p className="text-sm text-slate-500">Selecciona una categoría para comenzar</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/haccp/dashboard')}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-all"
            >
              Ver Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categorias.map((categoria) => {
            const porcentaje = categoria.porcentajeCompletado || 0;
            const estaCompleto = porcentaje === 100;
            
            return (
              <button
                key={categoria.id}
                onClick={() => router.push(`/haccp/${categoria.id}`)}
                className={`group relative p-6 bg-gradient-to-br ${categoria.color} rounded-2xl border ${categoria.border} hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-left overflow-hidden`}
              >
                {/* Indicador de completado */}
                {estaCompleto && (
                  <div className="absolute top-4 right-4 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                <div className="relative z-10">
                  <div className={`w-12 h-12 ${categoria.iconBg} rounded-xl flex items-center justify-center shadow-md mb-4 group-hover:scale-110 transition-transform`}>
                    {categoria.icono}
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    {categoria.nombre}
                  </h3>
                  
                  <p className="text-sm text-slate-600 mb-4">
                    {categoria.descripcion}
                  </p>

                  {/* Barra de progreso */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">
                        {categoria.pccsCompletadosHoy} de {categoria.totalPCCs} PCCs
                      </span>
                      <span className={`font-bold ${porcentaje >= 100 ? 'text-emerald-600' : porcentaje >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {porcentaje}%
                      </span>
                    </div>
                    <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          porcentaje >= 100 ? 'bg-emerald-500' : 
                          porcentaje >= 50 ? 'bg-amber-500' : 
                          'bg-rose-500'
                        }`}
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
