'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RevisarFacturaPage() {
  const router = useRouter();
  const [datos, setDatos] = useState<any>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    const datosGuardados = sessionStorage.getItem('factura_datos');
    if (datosGuardados) {
      setDatos(JSON.parse(datosGuardados));
    } else {
      router.push('/facturas/upload');
    }
  }, [router]);

  const updateField = (section: string, field: string, value: any) => {
    setDatos((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const updateLinea = (index: number, field: string, value: any) => {
    setDatos((prev: any) => {
      const nuevasLineas = [...prev.lineas];
      nuevasLineas[index] = {
        ...nuevasLineas[index],
        [field]: value
      };
      return { ...prev, lineas: nuevasLineas };
    });
  };

  async function handleGuardar() {
    setGuardando(true);
    setMensaje('');

    try {
      const response = await fetch('/api/facturas/guardar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al guardar');
      }

      setMensaje('✅ Factura guardada correctamente en el sistema');
      sessionStorage.removeItem('factura_datos');
      
      setTimeout(() => {
        router.push('/facturas');
      }, 2000);

    } catch (err: any) {
      setMensaje(`❌ Error: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  }

  const renderField = (label: string, value: any, section: string, field: string, type: string = 'text') => (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => updateField(section, field, type === 'number' ? (e.target.value === '' ? null : parseFloat(e.target.value)) : e.target.value)}
        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm text-slate-900 placeholder-slate-400"
        placeholder={`Introduce ${label.toLowerCase()}`}
      />
    </div>
  );

  if (!datos) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <p className="text-slate-600 font-medium animate-pulse">Cargando datos de la factura...</p>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Revisar Factura</h1>
                <p className="text-sm text-slate-500">Verifica y corrige los datos extraídos por IA</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Mensajes */}
        {mensaje && (
          <div className={`mb-6 p-4 rounded-xl shadow-sm flex items-start gap-3 ${
            mensaje.includes('✅') 
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mensaje.includes('✅') ? "M5 13l4 4L19 7" : "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"} />
            </svg>
            <p className="font-medium">{mensaje}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 sm:p-8 space-y-8">
            
            {/* PROVEEDOR */}
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-slate-900">Datos del Proveedor</h2>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {renderField('Nombre / Razón Social', datos.proveedor?.nombre, 'proveedor', 'nombre')}
                {renderField('NIF / CIF', datos.proveedor?.nif, 'proveedor', 'nif')}
                {renderField('Dirección', datos.proveedor?.direccion, 'proveedor', 'direccion')}
                {renderField('Teléfono', datos.proveedor?.telefono, 'proveedor', 'telefono')}
                {renderField('Email', datos.proveedor?.email, 'proveedor', 'email')}
              </div>
            </section>

            <div className="border-t border-slate-200"></div>

            {/* FACTURA */}
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-slate-900">Datos de la Factura</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4 max-w-md">
                {renderField('Número de Factura', datos.factura?.numero, 'factura', 'numero')}
                {renderField('Fecha de Emisión', datos.factura?.fecha, 'factura', 'fecha', 'date')}
              </div>
            </section>

            <div className="border-t border-slate-200"></div>

            {/* IMPORTES */}
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-slate-900">Importes</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Base Imponible</label>
                  <input
                    type="number"
                    step="0.01"
                    value={datos.importes?.base_imponible || ''}
                    onChange={(e) => updateField('importes', 'base_imponible', e.target.value === '' ? null : parseFloat(e.target.value))}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">IVA (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={datos.importes?.iva || ''}
                    onChange={(e) => updateField('importes', 'iva', e.target.value === '' ? null : parseFloat(e.target.value))}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cuota IVA</label>
                  <input
                    type="number"
                    step="0.01"
                    value={datos.importes?.total_iva || ''}
                    onChange={(e) => updateField('importes', 'total_iva', e.target.value === '' ? null : parseFloat(e.target.value))}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-emerald-700 mb-1.5">TOTAL FACTURA</label>
                  <input
                    type="number"
                    step="0.01"
                    value={datos.importes?.total || ''}
                    onChange={(e) => updateField('importes', 'total', e.target.value === '' ? null : parseFloat(e.target.value))}
                    className="w-full px-4 py-2.5 bg-emerald-50 border-2 border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm font-bold text-emerald-900"
                  />
                </div>
              </div>
            </section>

            <div className="border-t border-slate-200"></div>

            {/* LÍNEAS DE PRODUCTO */}
            {datos.lineas && datos.lineas.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">Líneas de Producto</h2>
                  </div>
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
                    {datos.lineas.length} artículos
                  </span>
                </div>
                
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700 w-16">#</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Descripción del Producto</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-700 w-32">Cantidad</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-700 w-32">Precio Unit.</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-700 w-32">Total Línea</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {datos.lineas.map((linea: any, index: number) => (
                          <tr key={index} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-slate-500 font-medium">{index + 1}</td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={linea.descripcion || ''}
                                onChange={(e) => updateLinea(index, 'descripcion', e.target.value)}
                                className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-slate-900"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                step="0.01"
                                value={linea.cantidad || ''}
                                onChange={(e) => updateLinea(index, 'cantidad', e.target.value === '' ? null : parseFloat(e.target.value))}
                                className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-slate-900 text-right"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                step="0.01"
                                value={linea.precio_unitario || ''}
                                onChange={(e) => updateLinea(index, 'precio_unitario', e.target.value === '' ? null : parseFloat(e.target.value))}
                                className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-slate-900 text-right"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                step="0.01"
                                value={linea.total || ''}
                                onChange={(e) => updateLinea(index, 'total', e.target.value === '' ? null : parseFloat(e.target.value))}
                                className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-semibold text-emerald-700 text-right bg-emerald-50/50"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {/* BOTONES DE ACCIÓN */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleGuardar}
                disabled={guardando}
                className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg disabled:shadow-none flex items-center justify-center gap-2"
              >
                {guardando ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Guardando en el sistema...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Guardar Factura
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  sessionStorage.removeItem('factura_datos');
                  router.push('/facturas/upload');
                }}
                className="px-8 py-3.5 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancelar
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}