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

    if (recetaData) {
      setReceta(recetaData);
    }

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

  if (loading) return <div className="p-8 text-center">Cargando...</div>;
  if (!receta) return <div className="p-8 text-center text-red-600">Receta no encontrada</div>;

  const foodCost = calcularFoodCost();

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      {/* Botones de navegación (no se imprimen) */}
      <div className="max-w-[210mm] mx-auto mb-4 flex justify-between items-center no-print">
        <button
          onClick={() => router.push('/recetas')}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
        >
          ← Volver al listado
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/recetas/${recetaId}/editar`)}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm"
          >
            ✏️ Editar
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            📄 Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Ficha A4 */}
      <div className="ficha-a4 max-w-[210mm] mx-auto bg-white shadow-lg" style={{ minHeight: '297mm' }}>
        
        {/* HEADER */}
        <div className="flex items-start gap-4 px-6 pt-6 pb-4 border-b-2 border-gray-800">
          {receta.foto_url && (
            <div className="flex-shrink-0">
              <img
                src={receta.foto_url}
                alt={receta.nombre}
                className="w-24 h-24 object-cover rounded-lg border-2 border-gray-300"
              />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">
              {receta.nombre}
            </h1>
            <div className="flex gap-4 mt-2 text-sm text-gray-600">
              <span>
                <strong>Tipo:</strong> {receta.tipo === 'plato' ? 'Plato Principal' : 'Sub-receta'}
              </span>
              <span>
                <strong>Porciones:</strong> {receta.porciones}
              </span>
              {receta.produccion_gramos && (
                <span>
                  <strong>Producción:</strong> {parseFloat(receta.produccion_gramos)}g
                </span>
              )}
            </div>
          </div>
        </div>

        {/* CONTENIDO EN 2 COLUMNAS */}
        <div className="px-6 py-4 grid grid-cols-2 gap-4">
          
          {/* COLUMNA IZQUIERDA: INGREDIENTES */}
          <div>
            <h2 className="text-sm font-bold text-gray-800 uppercase border-b border-gray-400 pb-1 mb-2">
              🥬 Ingredientes
            </h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-1 font-semibold text-gray-700">Ingrediente</th>
                  <th className="text-right py-1 font-semibold text-gray-700">Cant.</th>
                  <th className="text-right py-1 font-semibold text-gray-700">Coste</th>
                </tr>
              </thead>
              <tbody>
                {detalles.map((detalle, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-1 text-gray-800">{detalle.nombre}</td>
                    <td className="text-right py-1 text-gray-600">{detalle.cantidad} {detalle.unidad}</td>
                    <td className="text-right py-1 text-gray-600">{detalle.coste.toFixed(3)}€</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-400 font-bold">
                  <td className="py-1 text-gray-900">TOTAL</td>
                  <td></td>
                  <td className="text-right py-1 text-gray-900">{receta.coste_total.toFixed(2)}€</td>
                </tr>
              </tfoot>
            </table>

            {/* RESUMEN ECONÓMICO */}
            <div className="mt-4 bg-gray-50 rounded-lg p-3 border border-gray-200">
              <h3 className="text-xs font-bold text-gray-700 uppercase mb-2"> Datos Económicos</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-500">Coste</p>
                  <p className="text-sm font-bold text-blue-700">{receta.coste_total.toFixed(2)}€</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">P. Venta</p>
                  <p className="text-sm font-bold text-gray-900">{receta.precio_venta.toFixed(2)}€</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Food Cost</p>
                  <p className={`text-sm font-bold ${foodCost < 25 ? 'text-green-700' : foodCost <= 33 ? 'text-yellow-700' : 'text-red-700'}`}>
                    {foodCost.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: PROCEDIMIENTO */}
          <div>
            <h2 className="text-sm font-bold text-gray-800 uppercase border-b border-gray-400 pb-1 mb-2">
               {receta.tipo === 'sub_receta' ? 'Procedimiento' : 'Descripción / Ejecución'}
            </h2>
            {receta.procedimiento ? (
              <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                {receta.procedimiento}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">Sin procedimiento definido</p>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 pb-4 pt-2 border-t border-gray-300 mt-auto">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>Ficha técnica generada el {new Date().toLocaleDateString('es-ES')}</span>
            <span>Restaurant Manager</span>
          </div>
        </div>
      </div>
    </div>
  );
}
