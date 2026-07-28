'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

interface DetalleReceta {
  tipo: 'ingrediente' | 'subreceta';
  nombre: string;
  cantidad: number;
  unidad: string;
  coste: number;
}

export default function VerReceta() {
  const router = useRouter();
  const params = useParams();
  const recetaId = params.id as string;
  
  const [receta, setReceta] = useState<any>(null);
  const [detalles, setDetalles] = useState<DetalleReceta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarReceta();
  }, []);

  async function cargarReceta() {
    const { data: recetaData } = await supabase
      .from('recetas')
      .select('*')
      .eq('id', recetaId)
      .single();

    if (recetaData) setReceta(recetaData);

    const { data: detallesData } = await supabase
      .from('receta_detalle')
      .select('*')
      .eq('receta_id', recetaId);

    if (detallesData && detallesData.length > 0) {
      const detallesCompletos: DetalleReceta[] = [];

      for (const detalle of detallesData) {
        if (detalle.ingrediente_id) {
          const { data: ing } = await supabase
            .from('ingredientes')
            .select('nombre, unidad_compra')
            .eq('id', detalle.ingrediente_id)
            .single();
          
          if (ing) {
            detallesCompletos.push({
              tipo: 'ingrediente',
              nombre: ing.nombre,
              cantidad: detalle.cantidad_necesaria,
              unidad: detalle.unidad || ing.unidad_compra,
              coste: detalle.coste_linea
            });
          }
        } else if (detalle.subreceta_id) {
          const { data: sub } = await supabase
            .from('recetas')
            .select('nombre')
            .eq('id', detalle.subreceta_id)
            .single();
          
          if (sub) {
            detallesCompletos.push({
              tipo: 'subreceta',
              nombre: sub.nombre,
              cantidad: detalle.cantidad_necesaria,
              unidad: 'gr',
              coste: detalle.coste_linea
            });
          }
        }
      }

      setDetalles(detallesCompletos);
    }

    setLoading(false);
  }

  function calcularFoodCost() {
    if (!receta || receta.precio_venta <= 0) return 0;
    return (receta.coste_total / receta.precio_venta) * 100;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-200 border-t-emerald-600 mb-3"></div>
          <p className="text-slate-600 font-medium">Cargando receta...</p>
        </div>
      </div>
    );
  }

  if (!receta) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Receta no encontrada</h2>
          <p className="text-slate-600 mb-6">La receta que buscas no existe o fue eliminada.</p>
          <button onClick={() => router.push('/recetas')} className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-all">
            Volver al listado
          </button>
        </div>
      </div>
    );
  }

  const foodCost = calcularFoodCost();

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 print:bg-white print:p-0">
      
      {/* BARRA DE NAVEGACIÓN (NO SE IMPRIME) */}
      <div className="max-w-[210mm] mx-auto mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print print:hidden">
        <button
          onClick={() => router.push('/recetas')}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-all text-sm flex items-center gap-2 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Volver al listado
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/recetas/${recetaId}/editar`)}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium transition-all text-sm flex items-center gap-2 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            Editar
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium transition-all text-sm flex items-center gap-2 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Imprimir / PDF
          </button>
        </div>
      </div>

      {/* FICHA A4 */}
      <div className="ficha-a4 max-w-[210mm] mx-auto bg-white shadow-xl print:shadow-none print:max-w-none" style={{ minHeight: '297mm' }}>
        
        {/* HEADER */}
        <div className="flex items-start gap-5 px-8 pt-8 pb-5 border-b-2 border-slate-900">
          {receta.foto_url && (
            <div className="flex-shrink-0">
              <img
                src={receta.foto_url}
                alt={receta.nombre}
                className="w-28 h-28 object-cover rounded-xl border-2 border-slate-200 shadow-sm"
              />
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                receta.tipo === 'sub_receta' 
                  ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                  : 'bg-cyan-100 text-cyan-800 border border-cyan-200'
              }`}>
                {receta.tipo === 'sub_receta' ? 'Sub-receta' : 'Plato Principal'}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-tight leading-tight">
              {receta.nombre}
            </h1>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-600">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <strong className="text-slate-700">Porciones:</strong> {receta.porciones}
              </span>
              {receta.produccion_gramos && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-3-1m-6 2l-3 9a5.002 5.002 0 006.001 0M18 7l3 9" /></svg>
                  <strong className="text-slate-700">Producción:</strong> {parseFloat(receta.produccion_gramos)}g
                </span>
              )}
            </div>
          </div>
        </div>

        {/* CONTENIDO EN 2 COLUMNAS */}
        <div className="px-8 py-6 grid grid-cols-2 gap-6">
          
          {/* COLUMNA IZQUIERDA: INGREDIENTES */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b-2 border-slate-900 pb-2 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              Ingredientes
            </h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-300">
                  <th className="text-left py-2 font-semibold text-slate-700 uppercase text-[10px] tracking-wider">Ingrediente</th>
                  <th className="text-right py-2 font-semibold text-slate-700 uppercase text-[10px] tracking-wider">Cant.</th>
                  <th className="text-right py-2 font-semibold text-slate-700 uppercase text-[10px] tracking-wider">Coste</th>
                </tr>
              </thead>
              <tbody>
                {detalles.map((detalle, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 print:hover:bg-transparent">
                    <td className="py-2 text-slate-900 font-medium">
                      {detalle.nombre}
                      {detalle.tipo === 'subreceta' && (
                        <span className="ml-1.5 text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-semibold">SUB</span>
                      )}
                    </td>
                    <td className="text-right py-2 text-slate-600 font-mono">{detalle.cantidad} {detalle.unidad}</td>
                    <td className="text-right py-2 text-slate-600 font-mono">{detalle.coste.toFixed(3)} €</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900 font-bold">
                  <td className="py-2 text-slate-900 uppercase text-[10px] tracking-wider">Total</td>
                  <td></td>
                  <td className="text-right py-2 text-slate-900 font-mono text-sm">{receta.coste_total.toFixed(2)} €</td>
                </tr>
              </tfoot>
            </table>

            {/* RESUMEN ECONÓMICO */}
            <div className="mt-5 bg-slate-50 rounded-xl p-4 border border-slate-200">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                Datos Económicos
              </h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white rounded-lg p-2 border border-slate-200">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Coste</p>
                  <p className="text-sm font-bold text-cyan-700 mt-0.5">{receta.coste_total.toFixed(2)} €</p>
                </div>
                <div className="bg-white rounded-lg p-2 border border-slate-200">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">P. Venta</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{receta.precio_venta.toFixed(2)} €</p>
                </div>
                <div className={`rounded-lg p-2 border ${foodCost < 25 ? 'bg-emerald-50 border-emerald-200' : foodCost <= 33 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                  <p className="text-[10px] uppercase tracking-wider font-semibold ${foodCost < 25 ? 'text-emerald-700' : foodCost <= 33 ? 'text-amber-700' : 'text-red-700'}">Food Cost</p>
                  <p className={`text-sm font-bold mt-0.5 ${foodCost < 25 ? 'text-emerald-700' : foodCost <= 33 ? 'text-amber-700' : 'text-red-700'}`}>
                    {foodCost.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: PROCEDIMIENTO */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b-2 border-slate-900 pb-2 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              {receta.tipo === 'sub_receta' ? 'Procedimiento' : 'Descripción / Ejecución'}
            </h2>
            {receta.procedimiento ? (
              <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-xl p-4 border border-slate-200 min-h-[200px]">
                {receta.procedimiento}
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic bg-slate-50 rounded-xl p-4 border border-dashed border-slate-300 min-h-[200px] flex items-center justify-center">
                Sin procedimiento definido
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-8 pb-6 pt-4 border-t border-slate-200 mt-auto">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span className="flex items-center gap-2">
              <div className="w-5 h-5 bg-gradient-to-br from-emerald-600 to-cyan-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-[10px]">K</span>
              </div>
              Ficha técnica generada el {new Date().toLocaleDateString('es-ES')}
            </span>
            <span className="font-semibold text-slate-700">KOST Software™</span>
          </div>
        </div>
      </div>

      {/* ESTILOS PARA IMPRESIÓN */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print, .print\\:hidden {
            display: none !important;
          }
          .ficha-a4 {
            box-shadow: none !important;
            max-width: 100% !important;
            min-height: auto !important;
            margin: 0 !important;
          }
          .hover\\:bg-slate-50:hover {
            background-color: transparent !important;
          }
        }
      `}</style>
    </div>
  );
}
