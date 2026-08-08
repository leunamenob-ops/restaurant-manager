'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

const CARDS = [
  {
    emoji: '🎯',
    titulo: 'Menu Engineering',
    desc: 'Matriz real por outlet: Estrellas, Caballos, Puzzles y Perros + plan de acción.',
    href: '/ventas/menu-engineering',
    grad: 'from-amber-500 to-orange-600',
  },
  {
    emoji: '🍽️',
    titulo: 'Platos & Menús',
    desc: 'Escandallos vivos, mapeo TPV y menús con food cost agregado.',
    href: '/ventas/menu-engineering/platos',
    grad: 'from-emerald-500 to-teal-600',
  },
  {
    emoji: '📊',
    titulo: 'Informe Ejecutivo',
    desc: 'P&L: ventas TPV × compras reales × food cost mensual.',
    href: '/ventas/informes',
    grad: 'from-blue-500 to-indigo-600',
  },
];

export default function VentasHubPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<any>(null);
  const [ultimo, setUltimo] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('ventas_imports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      setUltimo(data?.[0] || null);
    })();
  }, []);

  async function procesar() {
    if (!file) return;
    setProcesando(true);
    setError('');
    setResultado(null);

    try {
      const formData = new FormData();
      formData.append('archivo', file);

      const res = await fetch('/api/ventas/importar', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error al procesar');
      setResultado(data);
      setUltimo(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setProcesando(false);
    }
  }

  const eur = (n: number) =>
    Number(n || 0).toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' €';

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition"
          >
            <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight">📈 Ventas & Menu Engineering</h1>
            <p className="text-sm text-slate-500">
              {ultimo
                ? `Último cierre: ${ultimo.nombre_archivo} · ${eur(ultimo.total_base)}`
                : 'Importa tu primer cierre del TPV'}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* 3 tarjetas de navegación */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CARDS.map((c) => (
            <button
              key={c.href}
              onClick={() => router.push(c.href)}
              className={`bg-gradient-to-br ${c.grad} rounded-2xl p-5 text-left text-white shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform`}
            >
              <span className="text-4xl">{c.emoji}</span>
              <p className="font-bold text-lg mt-3 leading-tight">{c.titulo}</p>
              <p className="text-xs text-white/85 mt-1 leading-snug">{c.desc}</p>
            </button>
          ))}
        </div>

        {/* Import de cierre */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
            📥 Importar cierre del TPV (ACI Dalí)
          </h2>

          <input
            ref={fileRef}
            type="file"
            accept=".xls,.xlsx,.txt,.csv"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-amber-400 hover:bg-amber-50/40 transition"
          >
            <span className="text-4xl block mb-2">📊</span>
            <p className="font-semibold text-slate-900">
              {file ? file.name : 'Selecciona el reporte de ventas'}
            </p>
            <p className="text-xs text-slate-500 mt-1">XLS · XLSX · TXT · CSV</p>
          </button>

          <button
            onClick={procesar}
            disabled={!file || procesando}
            className="w-full mt-4 py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-bold hover:from-amber-700 hover:to-orange-700 disabled:from-slate-300 disabled:to-slate-300 transition flex items-center justify-center gap-2"
          >
            {procesando ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Leyendo reporte...
              </>
            ) : (
              <>🚀 Importar ventas</>
            )}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm font-semibold text-red-700">
              ❌ {error}
            </div>
          )}

          {resultado && (
            <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 text-center">
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Artículos</p>
                <p className="text-xl font-bold">{resultado.lineas_count}</p>
              </div>
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 text-center">
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Unidades</p>
                <p className="text-xl font-bold">{Number(resultado.totales.unidades).toFixed(0)}</p>
              </div>
              <div className="bg-blue-50 rounded-xl border border-blue-200 p-3 text-center">
                <p className="text-[10px] text-blue-700 uppercase font-semibold">Ventas</p>
                <p className="text-xl font-bold text-blue-700">{eur(resultado.totales.base)}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3 text-center">
                <p className="text-[10px] text-emerald-700 uppercase font-semibold">Margen</p>
                <p className="text-xl font-bold text-emerald-700">{eur(resultado.totales.margen)}</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
