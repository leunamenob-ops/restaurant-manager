'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface PCC {
  id_pcc: string;
  nombre_pcc: string;
  categoria_id: string;
  frecuencia: string;
  tipo_control: string;
  limite_min: number | null;
  limite_max: number | null;
  unidad: string;
  descripcion: string;
  categoria_nombre: string;
  estaCompletado: boolean;
  ultimoRegistro: string | null;
}

const CATEGORIAS_INFO: Record<string, { nombre: string; icono: string; color: string; bg: string }> = {
  'CAT_01': { nombre: 'Refrigeración y Equipos de Frío', icono: '❄️', color: 'text-cyan-600', bg: 'bg-cyan-500' },
  'CAT_02': { nombre: 'Cocción y Procesos', icono: '🔥', color: 'text-orange-600', bg: 'bg-orange-500' },
  'CAT_03': { nombre: 'Limpieza y Desinfección', icono: '🧹', color: 'text-emerald-600', bg: 'bg-emerald-500' },
  'CAT_04': { nombre: 'Recepción de Mercancías', icono: '📦', color: 'text-purple-600', bg: 'bg-purple-500' },
  'CAT_05': { nombre: 'Almacenamiento y FIFO', icono: '🗄️', color: 'text-amber-600', bg: 'bg-amber-500' },
  'CAT_06': { nombre: 'Buffet y Exposición', icono: '🍽️', color: 'text-pink-600', bg: 'bg-pink-500' },
};

export default function CategoriaPCCsPage() {
  const router = useRouter();
  const params = useParams();
  const categoriaId = params.categoria_id as string;
  
  const [pccs, setPCCs] = useState<PCC[]>([]);
  const [loading, setLoading] = useState(true);

  const catInfo = CATEGORIAS_INFO[categoriaId] || { nombre: 'Categoría', icono: '', color: 'text-slate-600', bg: 'bg-slate-500' };

  useEffect(() => {
    cargarPCCs();
  }, [categoriaId]);

  async function cargarPCCs() {
    setLoading(true);
    try {
      const hoy = new Date().toISOString().split('T')[0];
      
      const resPCCs = await fetch(`/api/haccp/pcc?categoria=${categoriaId}`);
      const dataPCCs = await resPCCs.json();

      const resRegistros = await fetch(`/api/haccp/registros?inicio=${hoy}&fin=${hoy}`);
      const registrosHoy = await resRegistros.json();

      const pccsConEstado: PCC[] = dataPCCs.map((pcc: any) => {
        const registroHoy = registrosHoy?.find((r: any) => r.id_pcc === pcc.id_pcc);
        return {
          ...pcc,
          estaCompletado: !!registroHoy,
          ultimoRegistro: registroHoy?.fecha_hora || null
        };
      });

      setPCCs(pccsConEstado);
    } catch (error) {
      console.error('Error cargando PCCs:', error);
    } finally {
      setLoading(false);
    }
  }

  const completados = pccs.filter(p => p.estaCompletado).length;
  const pendientes = pccs.length - completados;
  const porcentaje = pccs.length > 0 ? Math.round((completados / pccs.length) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-3xl">{catInfo.icono}</span>
          </div>
          <p className="text-slate-500 font-medium animate-pulse">Cargando PCCs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
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
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${catInfo.bg} rounded-xl flex items-center justify-center shadow-md`}>
                  <span className="text-xl">{catInfo.icono}</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">{catInfo.nombre}</h1>
                  <p className="text-sm text-slate-500">{completados} de {pccs.length} completados</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-xs text-slate-500 font-medium">Progreso</p>
                <p className={`text-2xl font-bold ${porcentaje === 100 ? 'text-emerald-600' : porcentaje >= 50 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {porcentaje}%
                </p>
              </div>
              <div className="relative w-14 h-14">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-200"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className={porcentaje === 100 ? 'text-emerald-500' : porcentaje >= 50 ? 'text-amber-500' : 'text-slate-400'}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${porcentaje}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-slate-700">{porcentaje}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{pccs.length}</p>
            <p className="text-xs text-slate-500 font-medium">Total PCCs</p>
          </div>
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{completados}</p>
            <p className="text-xs text-emerald-700 font-medium">Completados</p>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{pendientes}</p>
            <p className="text-xs text-amber-700 font-medium">Pendientes</p>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pccs.map((pcc) => (
            <button
              key={pcc.id_pcc}
              onClick={() => router.push(`/haccp/${categoriaId}/${pcc.id_pcc}/registro`)}
              className={`group p-5 bg-white rounded-xl border-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 text-left relative overflow-hidden ${
                pcc.estaCompletado 
                  ? 'border-emerald-200 bg-emerald-50/30' 
                  : 'border-slate-200 hover:border-cyan-300'
              }`}
            >
              {pcc.estaCompletado && (
                <div className="absolute top-3 right-3 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center shadow-md">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              <div className="pr-10">
                <h3 className={`font-bold mb-2 ${pcc.estaCompletado ? 'text-emerald-900' : 'text-slate-900'}`}>
                  {pcc.nombre_pcc}
                </h3>
                
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Frecuencia: {pcc.frecuencia || 'Diaria'}</span>
                  </div>

                  {pcc.tipo_control === 'NUMERICO' && pcc.limite_min !== null && pcc.limite_max !== null && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                      </svg>
                      <span>Rango: {pcc.limite_min} - {pcc.limite_max} {pcc.unidad || ''}</span>
                    </div>
                  )}

                  {pcc.estaCompletado && pcc.ultimoRegistro && (
                    <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Registrado hoy</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="absolute bottom-3 right-3 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
