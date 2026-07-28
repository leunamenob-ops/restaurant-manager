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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">{receta.nombre}</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/recetas/${recetaId}/editar`)}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
            >
              ✏️ Editar
            </button>
            <button
              onClick={() => router.push('/recetas')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              ← Volver
            </button>
          </div>
        </div>

        {receta.foto_url && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <img src={receta.foto_url} alt={receta.nombre} className="w-full max-w-2xl mx-auto rounded-lg" />
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">📋 Datos básicos</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Tipo</p>
              <p className="font-semibold">{receta.tipo === 'plato' ? '🍽️ Plato' : '🥘 Sub-receta'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Porciones</p>
              <p className="font-semibold">{receta.porciones}</p>
            </div>
            {receta.produccion_gramos && (
              <div>
                <p className="text-sm text-gray-600">Producción</p>
                <p className="font-semibold">{parseFloat(receta.produccion_gramos)}g</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Precio Venta</p>
              <p className="font-semibold">{receta.precio_venta.toFixed(2)}€</p>
            </div>
          </div>
        </div>

        {receta.procedimiento && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4">📝 {receta.tipo === 'sub_receta' ? 'Procedimiento' : 'Descripción'}</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{receta.procedimiento}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">🥬 Ingredientes</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Ingrediente</th>
                <th className="text-right py-2">Cantidad</th>
                <th className="text-right py-2">Coste</th>
              </tr>
            </thead>
            <tbody>
              {detalles.map((detalle, idx) => (
                <tr key={idx} className="border-b">
                  <td className="py-3">{detalle.nombre}</td>
                  <td className="text-right">{detalle.cantidad} {detalle.unidad}</td>
                  <td className="text-right">{detalle.coste.toFixed(4)}€</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className="py-3">TOTAL</td>
                <td></td>
                <td className="text-right">{receta.coste_total.toFixed(2)}€</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">💰 Resumen</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <p className="text-sm text-blue-600">Coste Total</p>
              <p className="text-2xl font-bold text-blue-900">{receta.coste_total.toFixed(2)}€</p>
            </div>
            <div className={`p-4 rounded-lg text-center ${calcularFoodCost() < 25 ? 'bg-green-50' : 'bg-yellow-50'}`}>
              <p className="text-sm">Food Cost</p>
              <p className={`text-2xl font-bold ${calcularFoodCost() < 25 ? 'text-green-900' : 'text-yellow-900'}`}>
                {calcularFoodCost().toFixed(1)}%
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-600">Precio Venta</p>
              <p className="text-2xl font-bold">{receta.precio_venta.toFixed(2)}€</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="w-full py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg"
        >
           Imprimir / Descargar PDF
        </button>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .max-w-4xl, .max-w-4xl * { visibility: visible; }
          .max-w-4xl { position: absolute; left: 0; top: 0; width: 100%; }
          button { display: none !important; }
        }
      `}</style>
    </div>
  );
}
