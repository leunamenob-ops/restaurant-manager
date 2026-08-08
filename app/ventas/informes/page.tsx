'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

export default function InformesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [imports, setImports] = useState<any[]>([]);
  const [top, setTop] = useState<any[]>([]);
  const [kpi, setKpi] = useState({ ventas: 0, margen: 0, compras: 0 });
  const [meses, setMeses] = useState<any[]>([]);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    const [impRes, linRes, facRes] = await Promise.all([
      supabase.from('ventas_imports').select('*').order('created_at', { ascending: true }),
      supabase.from('ventas_lineas').select('nombre_articulo, unidades, total_margen, total_base'),
      supabase.from('facturas').select('total, fecha, created_at'),
    ]);

    const imps = impRes.data || [];
    const lins = linRes.data || [];
    const facs = facRes.data || [];

    setImports(imps);

    const ventas = lins.reduce((s: number, l: any) => s + Number(l.total_base || 0), 0);
    const margen = lins.reduce((s: number, l: any) => s + Number(l.total_margen || 0), 0);
    const compras = facs.reduce((s: number, f: any) => s + Number(f.total || 0), 0);
    setKpi({ ventas, margen, compras });

    // Top artículos fusionados por nombre (multi punto de venta)
    const map = new Map<string, any>();
    lins.forEach((l: any) => {
      const a = map.get(l.nombre_articulo) || {
        nombre: l.nombre_articulo,
        unidades: 0,
        margen: 0,
        base: 0,
      };
      a.unidades += Number(l.unidades || 0);
      a.margen += Number(l.total_margen || 0);
      a.base += Number(l.total_base || 0);
      map.set(l.nombre_articulo, a);
    });
    setTop(Array.from(map.values()).sort((a, b) => b.margen - a.margen).slice(0, 10));

    // Evolución mensual: ventas (imports) vs compras (facturas)
    const mesesMap = new Map<string, { ventas: number; compras: number }>();

    imps.forEach((i: any) => {
      const key = String(i.fecha_hasta || i.created_at || '').slice(0, 7);
      if (!key) return;
      const m = mesesMap.get(key) || { ventas: 0, compras: 0 };
      m.ventas += Number(i.total_base || 0);
      mesesMap.set(key, m);
    });

    facs.forEach((f: any) => {
      const key = String(f.fecha || f.created_at || '').slice(0, 7);
      if (!key) return;
      const m = mesesMap.get(key) || { ventas: 0, compras: 0 };
      m.compras += Number(f.total || 0);
      mesesMap.set(key, m);
    });

    setMeses(
      Array.from(mesesMap.entries())
        .map(([mes, d]) => ({
          mes,
          ...d,
          beneficio: d.ventas - d.compras,
          foodCost: d.ventas > 0 ? (d.compras / d.ventas) * 100 : 0,
        }))
        .sort((a, b) => a.mes.localeCompare(b.mes))
    );

    setLoading(false);
  }

  const beneficio = kpi.ventas - kpi.compras;
  const foodCost = kpi.ventas > 0 ? (kpi.compras / kpi.ventas) * 100 : 0;
  const maxTop = top.length > 0 ? top[0].margen : 1;

  function nombreMes(mes: string) {
    const d = new Date(mes + '-01');
    return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }

  const eur = (n: number) =>
    n.toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' €';

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
          <div>
            <h1 className="text-xl font-bold tracking-tight">📊 Informe Ejecutivo</h1>
            <p className="text-sm text-slate-500">Ventas TPV × Compras reales × Margen</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-200 border-t-orange-600"></div>
          </div>
        ) : (
          <>
            {/* KPIs GLOBALES */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm">
                <p className="text-xs text-blue-700 uppercase font-semibold">Ventas TPV</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{eur(kpi.ventas)}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-semibold">Compras (facturas)</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{eur(kpi.compras)}</p>
              </div>
              <div className={`rounded-xl border p-4 shadow-sm ${beneficio >= 0 ? 'bg-white border-emerald-200' : 'bg-red-50 border-red-300'}`}>
                <p className={`text-xs uppercase font-semibold ${beneficio >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  Beneficio bruto
                </p>
                <p className={`text-2xl font-bold mt-1 ${beneficio >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {eur(beneficio)}
                </p>
              </div>
              <div className={`rounded-xl border p-4 shadow-sm ${foodCost <= 35 ? 'bg-white border-emerald-200' : 'bg-red-50 border-red-300'}`}>
                <p className="text-xs text-slate-500 uppercase font-semibold">Food Cost %</p>
                <p className={`text-2xl font-bold mt-1 ${foodCost <= 35 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {foodCost.toFixed(1)}%
                </p>
                <p className="text-[11px] text-slate-400">objetivo: &lt; 30-35%</p>
              </div>
            </div>

            {/* EVOLUCIÓN MENSUAL */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-slate-900 text-white">
                <h2 className="font-bold">📅 Evolución mensual (ventas vs compras)</h2>
              </div>
              {meses.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Sin datos mensuales aún</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-200 bg-slate-50">
                        <th className="px-6 py-3">Mes</th>
                        <th className="px-3 py-3 text-right">Ventas</th>
                        <th className="px-3 py-3 text-right">Compras</th>
                        <th className="px-3 py-3 text-right">Beneficio</th>
                        <th className="px-6 py-3 text-right">Food Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meses.map((m) => (
                        <tr key={m.mes} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                          <td className="px-6 py-3 font-semibold capitalize">{nombreMes(m.mes)}</td>
                          <td className="px-3 py-3 text-right text-blue-700 font-semibold">{eur(m.ventas)}</td>
                          <td className="px-3 py-3 text-right text-slate-600">{eur(m.compras)}</td>
                          <td className={`px-3 py-3 text-right font-bold ${m.beneficio >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {eur(m.beneficio)}
                          </td>
                          <td className={`px-6 py-3 text-right font-bold ${m.foodCost <= 35 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {m.ventas > 0 ? m.foodCost.toFixed(1) + '%' : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* IMPORTS REGISTRADOS */}
            <div className="bg-white rounded-2xl shadow
