'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface PCC {
  id_pcc: string;
  nombre_pcc: string;
  frecuencia: string;
  ultimoRegistro: string | null;
  estaCompletado: boolean;
}

export default function CategoriaPCCsPage() {
  const router = useRouter();
  const params = useParams();
  const categoriaId = params.categoria_id as string;
  
  const [pccs, setPCCs] = useState<PCC[]>([]);
  const [categoriaNombre, setCategoriaNombre] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarPCCs();
  }, [categoriaId]);

  async function cargarPCCs() {
    try {
      const hoy = new Date().toISOString().split('T')[0];
      
      // Obtener PCCs de esta categoría
      const resPCCs = await fetch(`/api/haccp/pcc?categoria=${categoriaId}`);
      const dataPCCs = await resPCCs.json();

      // Obtener registros de hoy
      const resRegistros = await fetch(`/api/haccp/registros?inicio=${hoy}&fin=${hoy}`);
      const registrosHoy = await resRegistros.json();

      // Obtener nombre de la categoría
      const categoriasMap: any = {
        'CAT_01': 'Refrigeración',
        'CAT_02': 'Cocción',
        'CAT_03': 'Limpieza',
        'CAT_04': 'Recepción',
        'CAT_05': 'Almacenamiento',
      };

      // Marcar PCCs completados
      const pccsConEstado = dataPCCs.map((pcc: any) => {
        const registroHoy = registrosHoy.find((r: any) => r.id_pcc === pcc.id_pcc);
        return {
          ...pcc,
          ultimoRegistro: registroHoy?.fecha_hora || null,
          estaCompletado: !!registroHoy
        };
      });

      setPCCs(pccsConEstado);
      setCategoriaNombre(categoriasMap[categoriaId] || 'Categoría');
    } catch (error) {
      console.error('Error cargando PCCs:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Cargando...</p>
      </div>
    );
  }

  const completados = pccs.filter(p => p.estaCompletado).length;
  const porcentaje = pccs.length > 0 ? Math.round((completados / pccs.length) * 100) : 0;

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
                <h1 className="text-xl font-bold text-slate-900">{categoriaNombre}</h1>
                <p className="text-sm text-slate-500">{completados} de {pccs.length} completados</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-xs text-slate-500">Progreso</p>
                <p className="text-lg font-bold text-slate-900">{porcentaje}%</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-4 border-slate-300 flex items-center justify-center">
                  <span className="text-xs font-bold text-slate-700">{porcentaje}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              {/* Check de completado */}
              {pcc.estaCompletado && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              <div className="pr-10">
                <h3 className={`font-bold mb-2 ${pcc.estaCompletado ? 'text-emerald-900' : 'text-slate-900'}`}>
                  {pcc.nombre_pcc}
                </h3>
                
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Frecuencia: {pcc.frecuencia || 'Diaria'}</span>
                </div>

                {pcc.ultimoRegistro && (
                  <div className="flex items-center gap-2 text-xs text-emerald-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Registrado hoy</span>
                  </div>
                )}
              </div>

              {/* Flecha */}
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
