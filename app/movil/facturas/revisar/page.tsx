'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MovilRevisarFacturaPage() {
  const router = useRouter();
  const [datos, setDatos] = useState<any>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    const guardado = sessionStorage.getItem('factura_datos');
    if (guardado) {
      setDatos(JSON.parse(guardado));
    } else {
      router.replace('/movil/facturas');
    }
  }, [router]);

  const updateField = (section: string, field: string, value: any) => {
    setDatos((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const updateLinea = (index: number, field: string, value: any) => {
    setDatos((prev: any) => {
      const nuevas = [...prev.lineas];
      nuevas[index] = { ...nuevas[index], [field]: value };
      return { ...prev, lineas: nuevas };
    });
  };

  const num = (v: string) => (v === '' ? null : parseFloat(v));

  const lineasIncompletas = (datos?.lineas || []).filter(
    (l: any) => !l.descripcion || l.cantidad == null || l.precio_unitario == null
  ).length;

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

      setMensaje('✅ Factura guardada correctamente');
      sessionStorage.removeItem('factura_datos');

      setTimeout(() => {
        router.push('/movil');
      }, 1500);
    } catch (err: any) {
      setMensaje(`❌ Error: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  }

  if (!datos) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <div className="max-w-md mx-auto px-4 py-6 pb-28">
        {/* Cabecera */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/movil')}
            className="w-11 h-11 bg-white shadow-sm border border-slate-200 rounded-xl flex items-center justify-center text-xl active:scale-95 transition"
          >
            🏠
          </button>
          <button
            onClick={() => router.push('/movil/facturas')}
            className="w-11 h-11 bg-white shadow-sm border border-slate-200 rounded-xl flex items-center justify-center active:scale-95 transition"
          >
            <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-slate-900 leading-tight">🧾 Revisar Factura</h1>
            <p className="text-[11px] text-slate-500">Verifica los datos extraídos por IA</p>
          </div>
        </div>

        {/* Aviso de líneas incompletas */}
        {lineasIncompletas > 0 && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3 mb-4 text-[12px] text-amber-800 font-semibold">
            ⚠️ {lineasIncompletas} línea{lineasIncompletas > 1 ? 's' : ''} con datos sin extraer —
            complétalas a mano o vuelve atrás y repite la foto con más luz.
          </div>
        )}

        {/* Mensaje */}
        {mensaje && (
          <div className={`p-3 rounded-xl mb-4 text-center text-sm font-bold ${
            mensaje.includes('✅') ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {mensaje}
          </div>
        )}

        {/* PROVEEDOR */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
            🏢 Proveedor
          </h2>
          <div className="space-y-3">
            <input
              type="text"
              value={datos.proveedor?.nombre || ''}
              onChange={(e) => updateField('proveedor', 'nombre', e.target.value)}
              placeholder="⚠️ Nombre no extraído — escribe aquí"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={datos.proveedor?.nif || ''}
                onChange={(e) => updateField('proveedor', 'nif', e.target.value)}
                placeholder="NIF/CIF"
                className="px-3 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="text"
                value={datos.proveedor?.telefono || ''}
                onChange={(e) => updateField('proveedor', 'telefono', e.target.value)}
                placeholder="Teléfono"
                className="px-3 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* FACTURA */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
            📄 Factura
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Número</label>
              <input
                type="text"
                value={datos.factura?.numero || ''}
                onChange={(e) => updateField('factura', 'numero', e.target.value)}
                placeholder="Nº factura"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Fecha</label>
              <input
                type="date"
                value={datos.factura?.fecha || ''}
                onChange={(e) => updateField('factura', 'fecha', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* IMPORTES */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
            💶 Importes
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Base</label>
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={datos.importes?.base_imponible ?? ''}
                onChange={(e) => updateField('importes', 'base_imponible', num(e.target.value))}
                placeholder="0.00"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 text-right focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">IVA %</label>
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={datos.importes?.iva ?? ''}
                onChange={(e) => updateField('importes', 'iva', num(e.target.value))}
                placeholder="21"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 text-right focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Cuota IVA</label>
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={datos.importes?.total_iva ?? ''}
                onChange={(e) => updateField('importes', 'total_iva', num(e.target.value))}
                placeholder="0.00"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 text-right focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-1">TOTAL</label>
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={datos.importes?.total ?? ''}
                onChange={(e) => updateField('importes', 'total', num(e.target.value))}
                placeholder="0.00"
                className="w-full px-3 py-2.5 bg-emerald-50 border-2 border-emerald-300 rounded-xl text-sm font-bold text-emerald-900 text-right focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* LÍNEAS */}
        {datos.lineas && datos.lineas.length > 0 && (
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 px-1">
              📦 Líneas ({datos.lineas.length})
            </h2>
            <div className="space-y-3">
              {datos.lineas.map((linea: any, index: number) => {
                const incompleta = !linea.descripcion || linea.cantidad == null || linea.precio_unitario == null;

                return (
                  <div
                    key={index}
                    className={`bg-white rounded-2xl shadow-sm p-4 border-2 ${
                      incompleta ? 'border-amber-300' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={linea.descripcion || ''}
                        onChange={(e) => updateLinea(index, 'descripcion', e.target.value)}
                        placeholder="⚠️ Descripción no extraída"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase mb-1">Cant.</label>
                        <input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          value={linea.cantidad ?? ''}
                          onChange={(e) => updateLinea(index, 'cantidad', num(e.target.value))}
                          placeholder="0"
                          className="w-full px-2 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 text-right focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase mb-1">Precio</label>
                        <input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          value={linea.precio_unitario ?? ''}
                          onChange={(e) => updateLinea(index, 'precio_unitario', num(e.target.value))}
                          placeholder="0.00"
                          className="w-full px-2 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 text-right focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-emerald-600 uppercase mb-1">Total</label>
                        <input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          value={linea.total ?? ''}
                          onChange={(e) => updateLinea(index, 'total', num(e.target.value))}
                          placeholder="0.00"
                          className="w-full px-2 py-2 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-900 text-right focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Barra fija de acciones */}
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-slate-200 p-4">
          <div className="max-w-md mx-auto flex gap-2">
            <button
              onClick={() => {
                sessionStorage.removeItem('factura_datos');
                router.push('/movil/facturas');
              }}
              disabled={guardando}
              className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold text-sm active:scale-[0.98] transition disabled:opacity-50"
            >
              ✖ Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={guardando}
              className="flex-[2] py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-2xl font-bold text-sm active:scale-[0.98] transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {guardando ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Guardando...
                </>
              ) : (
                <>💾 Guardar factura</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
