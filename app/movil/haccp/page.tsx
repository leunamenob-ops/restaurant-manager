'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORIAS_BASE = [
  {
    id: 'CAT_01',
    nombre: 'Refrigeración y Frío',
    desc: 'Neveras, cámaras y equipos de frío',
    emoji: '❄️',
    color: 'from-cyan-500 to-blue-600',
  },
  {
    id: 'CAT_02',
    nombre: 'Cocción y Procesos',
    desc: 'Cocción, recalentado, enfriamiento',
    emoji: '🔥',
    color: 'from-orange-500 to-red-600',
  },
  {
    id: 'CAT_03',
    nombre: 'Limpieza y Desinfección',
    desc: 'Superficies, equipos y utensilios',
    emoji: '🧼',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'CAT_04',
    nombre: 'Recepción de Mercancías',
    desc: 'Recepción y transporte',
    emoji: '🚚',
    color: 'from-purple-500 to-indigo-600',
  },
  {
    id: 'CAT_05',
    nombre: 'Almacenamiento y FIFO',
    desc: 'Rotación, basuras y plagas',
    emoji: '📦',
    color: 'from-amber-500 to-orange-600',
  },
  {
    id: 'CAT_06',
    nombre: 'Buffet y Exposición',
    desc: 'Buffet caliente y frío',
    emoji: '🍽️',
    color: 'from-pink-500 to-rose-600',
  },
];

export default function MovilHaccpPage() {
  const router = useRouter();
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    try {
      const hoy = new Date().toISOString().split('T')[0];

      const [resReg, resPcc] = await Promise.all([
        fetch(`/api/haccp/registros?inicio=${hoy}&fin=${hoy}`),
        fetch('/api/haccp/pcc'),
      ]);

      const registrosHoy = await resReg.json();
      const allPCCs = await resPcc.json();

      const cats = CATEGORIAS_BASE.map((base) => {
        const totalPCCs = (allPCCs || []).filter(
          (p: any) => p.categoria_id === base.id
        ).length;

        const completados = new Set(
          (registrosHoy || [])
            .filter((r: any) => r.haccp_pcc?.categoria_id === base.id)
            .map((r: any) => r.id_pcc)
        ).size;

        const pct = totalPCCs > 0 ? Math.round((completados / totalPCCs) * 100) : 0;

        return { ...base, totalPCCs, completados, pct };
      });

      setCategorias(cats);
    } catch (e) {
      console.error('Error cargando HACCP:', e);
    } finally {
      setLoading(false);
    }
  }

  const totalPCCs = categorias.reduce((s, c) => s + c.totalPCCs, 0);
  const totalHechos = categorias.reduce((s, c) => s + c.completados, 0);
  const pctGlobal = totalPCCs > 0 ? Math.round((totalHechos / totalPCCs) * 100) : 0;

  const fechaHoy = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <div className="max-w-md mx-auto px-4 py-6 pb-10">
        {/* Cabecera con casa */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/movil')}
            className="w-11 h-11 bg-white shadow-sm border border-slate-200 rounded-xl flex items-center justify-center text-xl active:scale-95 transition"
          >
            🏠
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">🌡️ HACCP Rápido</h1>
            <p className="text-xs text-slate-500 capitalize">{fechaHoy}</p>
          </div>
        </div>

        {/* Progreso global del día */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-5">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-semibold text-slate-700">Controles de hoy</p>
            <p className="text-sm font-bold text-slate-900">
              {totalHechos}/{totalPCCs}
            </p>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                pctGlobal >= 100
                  ? 'bg-emerald-500'
                  : pctGlobal >= 50
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${pctGlobal}%` }}
            ></div>
          </div>
          {pctGlobal >= 100 && (
            <p className="text-xs text-emerald-600 font-bold mt-2 text-center">
              ✅ Día completado — buen trabajo
            </p>
          )}
        </div>

        {/* Categorías */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-teal-200 border-t-teal-600"></div>
            <p className="text-sm text-slate-500 mt-3">Cargando controles...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {categorias.map((cat) => (
              <button
                key={cat.id}
                onClick={() => router.push(`/haccp/${cat.id}`)}
                className={`w-full bg-gradient-to-br ${cat.color} rounded-2xl p-4 text-left text-white shadow-lg active:scale-[0.98] transition-transform`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{cat.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base leading-tight">{cat.nombre}</p>
                    <p className="text-[11px] text-white/80 mt-0.5">{cat.desc}</p>
                    <div className="mt-2 h-2 bg-white/25 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full transition-all duration-500"
                        style={{ width: `${cat.pct}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {cat.pct >= 100 ? (
                      <span className="w-9 h-9 bg-white/25 rounded-full flex items-center justify-center text-lg">
                        ✅
                      </span>
                    ) : (
                      <>
                        <p className="text-xl font-bold">{cat.pct}%</p>
                        <p className="text-[10px] text-white/80">
                          {cat.completados}/{cat.totalPCCs}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <p className="text-center text-[11px] text-slate-400 mt-8">
          Los registros se guardan con tu usuario y hora · APPCC
        </p>
      </div>
    </div>
  );
}
