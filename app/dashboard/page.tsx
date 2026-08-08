'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function VentasPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<any>(null);

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
    } catch (e: any) {
      setError(e.message);
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition"
          >
            <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">📈 Ventas del TPV</h1>
            <p className="text-sm text-slate-500">Importa el cierre de ACI Dalí (XLS, TXT, CSV)</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Upload */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <input
            ref={fileRef}
            type="file"
            accept=".xls,.xlsx,.txt,.csv"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center hover:border-blue-400 hover:bg-blue-50/40 transition"
          >
            <span className="text-5xl block mb-3">📊</span>
            <p className="font-semibold text-slate-900">
              {file ? file.name : 'Selecciona el reporte de ventas del TPV'}
            </p>
            <p className="text-xs text-slate-500 mt-1">XLS · XLSX · TXT · CSV</p>
          </button>

          <button
            onClick={procesar}
            disabled={!file || procesando}
            className="w-full mt-4 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-cyan-700 disabled:from-slate-300 disabled:to-slate-300 transition flex items-center justify-center gap-2"
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
        </div>

        {/* Resultado */}
        {resultado && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-semibold">Artículos</p>
                <p className="text-2xl font-bold mt-1">{resultado.lineas_count}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-semibold">Unidades</p>
                <p className="text-2xl font-bold mt-1">{Number(resultado.totales.unidades).toFixed(0)}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p className="text-xs text-slate-500 uppercase font-semibold">Ventas</p>
                <p className="text-2xl font-bold mt-1 text-blue-700">
                  {Number(resultado.totales.base).toLocaleString('es-ES', { maximumFractionDigits: 0 })} €
                </p>
              </div>
              <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-sm">
                <p className="text-xs text-emerald-700 uppercase font-semibold">Margen</p>
                <p className="text-2xl font-bold mt-1 text-emerald-700">
                  {Number(resultado.totales.margen).toLocaleString('es-ES', { maximumFractionDigits: 0 })} €
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
                <h2 className="font-bold">🏆 Top 10 por margen</h2>
                <span className="text-xs text-slate-400">
                  {resultado.meta?.punto_venta || ''} · {resultado.meta?.fecha_desde || ''} – {resultado.meta?.fecha_hasta || ''}
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-3">Artículo</th>
                    <th className="px-3 py-3 text-right">Uds</th>
                    <th className="px-3 py-3 text-right">Margen/ud</th>
                    <th className="px-6 py-3 text-right">Margen total</th>
                  </tr>
                </thead>
                <tbody>
                  {(resultado.top || []).map((l: any, i: number) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-6 py-3 font-semibold">{l.nombre_articulo}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{Number(l.unidades).toFixed(0)}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{Number(l.margen_unitario).toFixed(2)} €</td>
                      <td className="px-6 py-3 text-right font-bold text-emerald-700">
                        {Number(l.total_margen).toLocaleString('es-ES', { maximumFractionDigits: 2 })} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
