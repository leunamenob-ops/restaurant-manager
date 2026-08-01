'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

export default function FacturasPage() {
  const router = useRouter();
  const [facturas, setFacturas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    cargarFacturas();
  }, []);

  async function cargarFacturas() {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Faltan variables de entorno de Supabase');
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await supabase
        .from('facturas')
        .select(`
          *,
          facturas_lineas (
            count
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setFacturas(data || []);
    } catch (err: any) {
      console.error('Error cargando facturas:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function eliminarFactura(id: string, numero: string) {
    if (!confirm(`¿Estás seguro de eliminar la factura ${numero}?\n\nSe eliminarán también todas sus líneas de producto.`)) {
      return;
    }

    setDeleting(id);
    setError('');

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error } = await supabase
        .from('facturas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setFacturas(facturas.filter(f => f.id !== id));
      
    } catch (err: any) {
      console.error('Error eliminando factura:', err);
      setError(`Error al eliminar: ${err.message}`);
    } finally {
      setDeleting(null);
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
          <p className="text-slate-600 font-medium animate-pulse">Cargando facturas...</p>
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
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all text-sm font-medium shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Volver al Dashboard
              </button>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Facturas</h1>
                <p className="text-sm text-slate-500">Gestión inteligente de facturas con IA</p>
              </div>
            </div>
            
            <button
              onClick={() => router.push('/facturas/upload')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Subir Factura
            </button>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 shadow-sm">
            ❌ Error: {error}
          </div>
        )}

        {facturas.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No hay facturas guardadas</h3>
            <p className="text-slate-600 mb-6">Comienza subiendo tu primera factura y deja que la IA extraiga los datos automáticamente.</p>
            <button
              onClick={() => router.push('/facturas/upload')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-md hover:shadow-lg"
            >
              Subir primera factura
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-b border-slate-200">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-sm text-slate-600 mb-1">Total Facturas</p>
                <p className="text-2xl font-bold text-slate-900">{facturas.length}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-sm text-slate-600 mb-1">Base Imponible</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {facturas.reduce((sum, f) => sum + (parseFloat(f.base_imponible) || 0), 0).toFixed(2)} €
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-sm text-slate-600 mb-1">Total IVA</p>
                <p className="text-2xl font-bold text-amber-600">
                  {facturas.reduce((sum, f) => sum + (parseFloat(f.iva_importe) || 0), 0).toFixed(2)} €
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-sm text-slate-600 mb-1">Importe Total</p>
                <p className="text-2xl font-bold text-blue-600">
                  {facturas.reduce((sum, f) => sum + (parseFloat(f.total) || 0), 0).toFixed(2)} €
                </p>
              </div>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Número</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Proveedor</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Base</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">IVA</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Líneas</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {facturas.map((factura) => (
                    <tr 
                      key={factura.id} 
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td 
                        className="px-6 py-4 cursor-pointer"
                        onClick={() => router.push(`/facturas/${factura.id}`)}
                      >
                        <span className="text-sm font-semibold text-slate-900">
                          {factura.numero_factura || 'N/A'}
                        </span>
                      </td>
                      <td 
                        className="px-6 py-4 cursor-pointer"
                        onClick={() => router.push(`/facturas/${factura.id}`)}
                      >
                        <span className="text-sm text-slate-600">
                          {factura.proveedor_nombre || 'Sin proveedor'}
                        </span>
                      </td>
                      <td 
                        className="px-6 py-4 cursor-pointer"
                        onClick={() => router.push(`/facturas/${factura.id}`)}
                      >
                        <span className="text-sm text-slate-600">
                          {factura.fecha ? new Date(factura.fecha).toLocaleDateString('es-ES') : '-'}
                        </span>
                      </td>
                      <td 
                        className="px-6 py-4 text-right cursor-pointer"
                        onClick={() => router.push(`/facturas/${factura.id}`)}
                      >
                        <span className="text-sm font-medium text-slate-900">
                          {factura.base_imponible ? `${parseFloat(factura.base_imponible).toFixed(2)} €` : '-'}
                        </span>
                      </td>
                      <td 
                        className="px-6 py-4 text-right cursor-pointer"
                        onClick={() => router.push(`/facturas/${factura.id}`)}
                      >
                        <span className="text-sm font-medium text-amber-600">
                          {factura.iva_importe ? `${parseFloat(factura.iva_importe).toFixed(2)} €` : '-'}
                        </span>
                      </td>
                      <td 
                        className="px-6 py-4 text-right cursor-pointer"
                        onClick={() => router.push(`/facturas/${factura.id}`)}
                      >
                        <span className="text-sm font-bold text-emerald-600">
                          {factura.total ? `${parseFloat(factura.total).toFixed(2)} €` : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {factura.facturas_lineas?.[0]?.count || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          factura.estado === 'procesada' 
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {factura.estado || 'pendiente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => eliminarFactura(factura.id, factura.numero_factura)}
                          disabled={deleting === factura.id}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
                          title="Eliminar factura"
                        >
                          {deleting === factura.id ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600 mx-auto"></div>
                          ) : (
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              className="h-5 w-5" 
                              fill="none" 
                              viewBox="0 0 24 24" 
                              stroke="currentColor"
                            >
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                              />
                            </svg>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}