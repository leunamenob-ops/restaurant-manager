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
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<any>(null);
  const [imports, setImports] = useState<any[]>([]);
  const [numMenus, setNumMenus] = useState(0);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    const [impRes, meRes] = await Promise.all([
      supabase.from('ventas_imports').select('*').order('created_at', { ascending: false }),
      supabase.from('menus').select('id', { count: 'exact', head: true }),
    ]);
    setImports(impRes.data || []);
    setNumMenus(meRes.count || 0);
  }

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
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      cargarDatos();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setProcesando(false);
    }
  }

  const eur = (n: number) =>
    Number(n || 0).toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' €';

  const ultimo = imports[0];

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

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        {/* ═══════════ PASO 1: MENÚS ═══════════ */}
        <button
          onClick={() => router.push('/ventas/menu-engineering/menus')}
          className="w-full bg-white rounded-2xl shadow-sm border-2 border-emerald-200 hover:border-emerald-400 p-5 text-left transition flex items-center gap-4 active:scale-[0.99]"
        >
          <span className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center text-xl font-bold shrink-0">
            1
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900">📋 Menús</p>
            <p className="text-xs text-slate-500">
              Monta el menú desde tu base de Recetas · food cost y margen en vivo
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 shrink-0">
            {numMenus} menús
          </span>
        </button>

        {/* ═══════════ PASO 2: IMPORTAR CIERRE TPV ═══════════ */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-amber-200 p-5">
          <div className="flex items-center gap-4 mb-4">
            <span className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center text-xl font-bold shrink-0">
              2
            </span>
            <div>
              <p className="font-bold text-slate-900">📥 Importar cierre del TPV (ACI Dalí)</p>
              <p className="text-xs text-slate-500">Se guarda por periodo y alimenta la matriz</p>
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".xls,.xlsx,.txt,.csv"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-amber-400 hover:bg-amber-50/40 transition"
          >
            <p className="font-semibold text-slate-800 text-sm">
              {file ? `📄 ${file.name}` : 'Selecciona el reporte de ventas'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">XLS · XLSX · TXT · CSV</p>
          </button>

          <button
            onClick={procesar}
            disabled={!file || procesando}
            className="w-full mt-3 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-bold text-sm hover:from-amber-700 hover:to-orange-700 disabled:from-slate-300 disabled:to-slate-300 transition flex items-center justify-center gap-2"
          >
            {procesando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Leyendo reporte...
              </>
            ) : (
              <>🚀 Importar ventas</>
            )}
          </button>

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
              ❌ {error}
            </div>
          )}

          {resultado && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-[10px] text-slate-500 uppercase">Artículos</p>
                <p className="font-bold">{resultado.lineas_count}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-2">
                <p className="text-[10px] text-blue-700 uppercase">Ventas</p>
                <p className="font-bold text-blue-700">{eur(resultado.totales.base)}</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-2">
                <p className="text-[10px] text-emerald-700 uppercase">Margen</p>
                <p className="font-bold text-emerald-700">{eur(resultado.totales.margen)}</p>
              </div>
            </div>
          )}

          {/* Histórico de periodos */}
          {imports.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Periodos importados</p>
              <div className="space-y-1.5">
                {imports.slice(0, 5).map((i) => (
                  <div key={i.id} className="flex justify-between items-center text-xs bg-slate-50 rounded-lg px-3 py-2">
                    <span className="text-slate-600 truncate">
                      {i.punto_venta || i.nombre_archivo} · {i.fecha_desde || ''} – {i.fecha_hasta || ''}
                    </span>
                    <span className="font-bold text-blue-700 shrink-0 ml-2">{eur(Number(i.total_base))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ═══════════ PASO 3: MENU ENGINEERING ═══════════ */}
        <button
          onClick={() => router.push('/ventas/menu-engineering')}
          className="w-full bg-white rounded-2xl shadow-sm border-2 border-orange-200 hover:border-orange-400 p-5 text-left transition flex items-center gap-4 active:scale-[0.99]"
        >
          <span className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center text-xl font-bold shrink-0">
            3
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900">🎯 Menu Engineering</p>
            <p className="text-xs text-slate-500">
              Matriz popularidad × rentabilidad + sugerencia por plato
            </p>
          </div>
          {ultimo && (
            <span className="text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-3 py-1 shrink-0">
              {ultimo.fecha_desde || ''}…{ultimo.fecha_hasta || ''}
            </span>
          )}
        </button>

        {/* ═══════════ PASO 4: INFORME ═══════════ */}
        <button
          onClick={() => router.push('/ventas/informes')}
          className="w-full bg-white rounded-2xl shadow-sm border-2 border-blue-200 hover:border-blue-400 p-5 text-left transition flex items-center gap-4 active:scale-[0.99]"
        >
          <span className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-xl font-bold shrink-0">
            4
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900">📊 Informe Ejecutivo</p>
            <p className="text-xs text-slate-500">
              P&L: ventas TPV × compras reales × food cost mensual
            </p>
          </div>
          <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-3 py-1 shrink-0">
            {eur(imports.reduce((s, i) => s + Number(i.total_base || 0), 0))}
          </span>
        </button>
      </main>
    </div>
  );
}
