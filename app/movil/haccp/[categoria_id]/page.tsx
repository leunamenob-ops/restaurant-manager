'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

const CATEGORIAS_INFO: Record<string, { nombre: string; icono: string; grad: string }> = {
  CAT_01: { nombre: 'Refrigeración y Equipos de Frío', icono: '❄️', grad: 'from-cyan-500 to-blue-600' },
  CAT_02: { nombre: 'Cocción y Procesos', icono: '🔥', grad: 'from-orange-500 to-red-600' },
  CAT_03: { nombre: 'Limpieza y Desinfección', icono: '🧼', grad: 'from-emerald-500 to-teal-600' },
  CAT_04: { nombre: 'Recepción de Mercancías', icono: '🚚', grad: 'from-purple-500 to-indigo-600' },
  CAT_05: { nombre: 'Almacenamiento y FIFO', icono: '📦', grad: 'from-amber-500 to-orange-600' },
  CAT_06: { nombre: 'Buffet y Exposición', icono: '🍽️', grad: 'from-pink-500 to-rose-600' },
};

export default function MovilCategoriaPage() {
  const router = useRouter();
  const params = useParams();
  const categoriaId = params.categoria_id as string;

  const [pccs, setPccs] = useState<any[]>([]);
  const [hechos, setHechos] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const cat = CATEGORIAS_INFO[categoriaId] || { nombre: 'Categoría', icono: '📋', grad: 'from-slate-500 to-slate-700' };

  useEffect(() => {
    cargar();
  }, [categoriaId]);

  async function cargar() {
    setLoading(true);
    try {
      const hoy = new Date().toISOString().split('T')[0];

      const [resPcc, resReg] = await Promise.all([
        fetch(`/api/haccp/pcc?categoria=${categoriaId}`),
        fetch(`/api/haccp/registros?inicio=${hoy}&fin=${hoy}`),
      ]);

      const pccData = (await resPcc.json()) || [];
      const regData = (await resReg.json()) || [];

      setPccs(pccData);
      setHechos(new Set(regData.map((r: any) => r.id_pcc)));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  const completados = pccs.filter((p) => hechos.has(p.id_pcc)).length;
  const pendientes = pccs.length - completados;

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <div className="max-w-md mx-auto px-4 py-6 pb-10">
        {/* Cabecera */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/movil')}
            className="w-11 h-11 bg-white shadow-sm border border-slate-200 rounded-xl flex items-center justify-center text-xl active:scale-95 transition"
          >
            🏠
          </button>
          <button
            onClick={() => router.push('/movil/haccp')}
            className="w-11 h-11 bg-white shadow-sm border border-slate-200 rounded-xl flex items-center justify-center active:scale-95 transition"
          >
            <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-slate-900 leading-tight">
              {cat.icono} {cat.nombre}
            </h1>
            <p className="text-xs text-slate-500">
              {completados} de {pccs.length} completados
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <p className="text-2xl font-bold text-slate-900">{pccs.length}</p>
            <p className="text-[10px] text-slate-500 font-semibold uppercase">Total</p>
          </div>
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{completados}</p>
            <p className="text-[10px] text-emerald-600 font-semibold uppercase">Hechos</p>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{pendientes}</p>
            <p className="text-[10px] text-amber-600 font-semibold uppercase">Pendientes</p>
          </div>
        </div>

        {/* Lista de PCCs */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-teal-200 border-t-teal-600"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {pccs.map((p) => {
              const hecho = hechos.has(p.id_pcc);
              return (
                <button
                  key={p.id_pcc}
                  onClick={() =>
                    router.push(`/movil/haccp/${categoriaId}/${p.id_pcc}/registro`)
                  }
                  className={`w-full text-left rounded-2xl p-4 shadow-sm border-2 transition active:scale-[0.98] ${
                    hecho
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-base leading-tight ${hecho ? 'text-emerald-800' : 'text-slate-900'}`}>
                        {p.nombre_pcc}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {p.tipo_control === 'NUMERICO' && p.limite_min !== null ? (
                          <>Rango: <strong>{p.limite_min} – {p.limite_max} {p.unidad}</strong></>
                        ) : (
                          <>Frecuencia: {p.frecuencia || 'Diaria'}</>
                        )}
                      </p>
                      {hecho && (
                        <p className="text-xs text-emerald-600 font-semibold mt-1">✅ Registrado hoy</p>
                      )}
                    </div>
                    <span className="text-2xl">{hecho ? '✅' : '⏳'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
