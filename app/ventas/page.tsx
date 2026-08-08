'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function VentasHubPage() {
  const router = useRouter();
  const [numMenus, setNumMenus] = useState(0);
  const [numImports, setNumImports] = useState(0);

  useEffect(() => {
    (async () => {
      const [mRes, iRes] = await Promise.all([
        supabase.from('menus').select('id', { count: 'exact', head: true }),
        supabase.from('ventas_imports').select('id', { count: 'exact', head: true }),
      ]);
      setNumMenus(mRes.count || 0);
      setNumImports(iRes.count || 0);
    })();
  }, []);

  const pasos = [
    {
      n: 1,
      emoji: '📋',
      titulo: 'Gestión de Menús',
      desc: 'Crea los menús y aliméntalos con tu base de Recetas',
      href: '/ventas/menus',
      badge: `${numMenus} menús`,
      border: 'border-emerald-200 hover:border-emerald-400',
      num: 'bg-emerald-500',
    },
    {
      n: 2,
      emoji: '🎯',
      titulo: 'Menu Engineering',
      desc: 'Elige menú, sube el cierre del TPV y ve la matriz con sugerencias',
      href: '/ventas/menu-engineering',
      badge: `${numImports} cierres`,
      border: 'border-amber-200 hover:border-amber-400',
      num: 'bg-amber-500',
    },
    {
      n: 3,
      emoji: '📊',
      titulo: 'Informes',
      desc: 'Rentabilidad, top 5 y medidas a tomar por menú',
      href: '/ventas/informes',
      badge: 'P&L',
      border: 'border-blue-200 hover:border-blue-400',
      num: 'bg-blue-600',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition"
          >
            <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">📈 Ventas & Menu Engineering</h1>
            <p className="text-sm text-slate-500">Define → mide → analiza → decide</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-4">
        {pasos.map((p) => (
          <button
            key={p.n}
            onClick={() => router.push(p.href)}
            className={`w-full bg-white rounded-2xl shadow-sm border-2 ${p.border} p-5 text-left transition flex items-center gap-4 active:scale-[0.99]`}
          >
            <span className={`w-12 h-12 ${p.num} text-white rounded-2xl flex items-center justify-center text-xl font-bold shrink-0`}>
              {p.n}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900">
                {p.emoji} {p.titulo}
              </p>
              <p className="text-xs text-slate-500">{p.desc}</p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-3 py-1 shrink-0">
              {p.badge}
            </span>
          </button>
        ))}
      </main>
    </div>
  );
}
