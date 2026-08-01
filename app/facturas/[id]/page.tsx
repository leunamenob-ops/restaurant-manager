'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

export default function FacturaDetallePage() {
  const router = useRouter();
  const params = useParams();
  const facturaId = params.id as string;

  const [factura, setFactura] = useState<any>(null);
  const [lineas, setLineas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (facturaId) {
      cargarFactura();
    }
  }, [facturaId]);

  async function cargarFactura() {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: facturaData, error: facturaError } = await supabase
        .from('facturas')
        .select('*')
        .eq('id', facturaId)
        .single();

      if (facturaError) throw facturaError;
      setFactura(facturaData);

      const { data: lineasData, error: lineasError } = await supabase
        .from('facturas_lineas')
        .select('*')
        .eq('factura_id', facturaId)
        .order('id', { ascending: true });

      if (lineasError) throw lineasError;
      setLineas(lineasData || []);

    } catch (err: any) {
      console.error('Error cargando factura:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-slate-600 font-medium animate-pulse">Cargando detalle de la factura...</p>
        </div>
      </div>
    );
  }

  if (error || !factura) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3 mb-6">
            <button onClick={() => router.push('/dashboard')} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium transition text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" /></svg>
              Dashboard
            </button>
            <button onClick={() => router.push('/facturas')} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium transition text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Volver a Facturas
            </button>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-800 shadow-sm flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold">Error al cargar</p>
              <p className="text-sm">{error || 'No se pudo encontrar la factura solicitada.'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-sans text-slate-900">
      {/* HEADER MODERNO */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all text-sm font-medium shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
                </svg>
                Dashboard
              </button>
              <button
                onClick={() => router.push('/facturas')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all text-sm font-medium shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Volver a Facturas
              </button>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-md ml-2">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Detalle de Factura</h1>
                <p className="text-sm text-slate-500">{factura.numero_factura || 'Sin número asignado'}</p>
              </div>
            </div>
            
            <span className={`px-4 py-2 rounded-full text-sm font-semibold shadow-sm ${
              factura.estado === 'procesada' 
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                : 'bg-amber-100 text-amber-700 border border-amber-200'
            }`}>
              {factura.estado === 'procesada' ? '✅ Procesada' : '⏳ Pendiente'}
            </span>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        
        {/* TARJETA DE INFORMACIÓN GENERAL */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Información General
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Proveedor</p>
              <p className="text-base font-semibold text-slate-900">{factura.proveedor_nombre || 'No especificado'}</p>
              {factura.proveedor_nif && <p className="text-sm text-slate-600 mt-1">NIF: {factura.proveedor_nif}</p>}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Nº de Factura</p>
              <p className="text-base font-semibold text-slate-900">{factura.numero_factura || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Fecha de Emisión</p>
              <p className="text-base font-semibold text-slate-900">
                {factura.fecha ? new Date(factura.fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Registrada el</p>
              <p className="text-sm text-slate-600">
                {new Date(factura.created_at).toLocaleDateString('es-ES')} a las {new Date(factura.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>

        {/* TARJETA DE IMPORTES */}
        <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl shadow-sm border border-emerald-200 overflow-hidden">
          <div className="p-6 border-b border-emerald-100">
            <h2 className="text-lg font-bold text-emerald-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Desglose Económico
            </h2>
          </div>
          <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
              <p className="text-sm text-emerald-700 mb-1">Base Imponible</p>
              <p className="text-2xl font-bold text-slate-900">
                {factura.base_imponible ? `${parseFloat(factura.base_imponible).toFixed(2)} €` : '0.00 €'}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
              <p className="text-sm text-emerald-700 mb-1">IVA ({factura.iva_porcentaje || 0}%)</p>
              <p className="text-2xl font-bold text-amber-600">
                {factura.iva_importe ? `${parseFloat(factura.iva_importe).toFixed(2)} €` : '0.00 €'}
              </p>
            </div>
            <div className="bg-emerald-600 p-4 rounded-xl shadow-md md:col-span-2 flex flex-col justify-center">
              <p className="text-sm text-emerald-100 mb-1 font-medium">TOTAL FACTURA</p>
              <p className="text-3xl font-bold text-white">
                {factura.total ? `${parseFloat(factura.total).toFixed(2)} €` : '0.00 €'}
              </p>
            </div>
          </div>
        </div>

        {/* TARJETA DE LÍNEAS DE PRODUCTO */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Líneas de Producto
            </h2>
            <span className="px-3 py-1 bg-slate-200 text-slate-700 rounded-full text-xs font-bold">
              {lineas.length} artículos
            </span>
          </div>
          
          {lineas.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-slate-600 font-medium">No hay líneas de producto registradas para esta factura.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-slate-700 w-16">#</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-700">Descripción del Producto</th>
                    <th className="px-6 py-4 text-right font-semibold text-slate-700 w-32">Cantidad</th>
                    <th className="px-6 py-4 text-right font-semibold text-slate-700 w-40">Precio Unit.</th>
                    <th className="px-6 py-4 text-right font-semibold text-slate-700 w-40">Total Línea</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {lineas.map((linea, index) => (
                    <tr key={linea.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-500 font-medium">{index + 1}</td>
                      <td className="px-6 py-4 text-slate-900 font-medium">
                        {linea.descripcion || <span className="text-slate-400 italic">Sin descripción</span>}
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-right font-mono">
                        {linea.cantidad ? parseFloat(linea.cantidad).toFixed(2) : '-'}
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-right font-mono">
                        {linea.precio_unitario ? `${parseFloat(linea.precio_unitario).toFixed(2)} €` : '-'}
                      </td>
                      <td className="px-6 py-4 text-emerald-700 font-bold text-right font-mono bg-emerald-50/30">
                        {linea.total_linea ? `${parseFloat(linea.total_linea).toFixed(2)} €` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Footer de la tabla con suma total de líneas (opcional, pero buen detalle) */}
                <tfoot className="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-right font-semibold text-slate-700">Suma de líneas:</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900 font-mono">
                      {lineas.reduce((sum, l) => sum + (parseFloat(l.total_linea) || 0), 0).toFixed(2)} €
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* METADATA / FOOTER */}
        <div className="text-center pb-8">
          <p className="text-xs text-slate-400 font-mono">
            ID Interno: {factura.id}
          </p>
        </div>

      </main>
    </div>
  );
}