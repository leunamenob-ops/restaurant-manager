// app/producciones/[id]/estado/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan variables de entorno de Supabase');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

// Convierte unidades de receta a unidades de compra (gr→Kg, ml→L)
function factorUnidad(u: string): number {
  const s = (u || '').toLowerCase().replace(/\./g, '').trim();
  if (['kg', 'kilo', 'kilos'].includes(s)) return 1000;
  if (['g', 'gr', 'gramo', 'gramos'].includes(s)) return 1;
  if (['l', 'litro', 'litros'].includes(s)) return 1000;
  if (['ml', 'mililitro', 'mililitros'].includes(s)) return 1;
  return 0;
}

function convertirAUnidadCompra(
  cantidad: number,
  unidadReceta: string,
  unidadCompra: string | null
) {
  const a = factorUnidad(unidadReceta);
  const b = factorUnidad(unidadCompra || '');
  if (a === 0 || b === 0) return cantidad;
  return cantidad * (a / b);
}

const TRANSICIONES: Record<string, string[]> = {
  planificada: ['en_proceso', 'cancelada'],
  en_proceso: ['terminada', 'cancelada'],
  terminada: [],
  cancelada: [],
};

export async function POST(request: Request, context: { params: any }) {
  try {
    const params = await Promise.resolve(context.params);
    const id = params.id;
    const supabase = getSupabase();

    const body = await request.json().catch(() => ({}));
    const nuevoEstado = body?.estado;
    const usuario = body?.usuario || 'Sistema Producciones';

    if (!nuevoEstado) {
      return NextResponse.json(
        { ok: false, error: 'Falta el campo estado' },
        { status: 400 }
      );
    }

    // 1. Cargar producción
    const { data: prod, error: errProd } = await supabase
      .from('producciones')
      .select('*')
      .eq('id_produccion', id)
      .single();

    if (errProd || !prod) {
      return NextResponse.json(
        { ok: false, error: 'Producción no encontrada' },
        { status: 404 }
      );
    }

    // 2. Validar transición
    const permitidos = TRANSICIONES[prod.estado] || [];
    if (!permitidos.includes(nuevoEstado)) {
      return NextResponse.json(
        { ok: false, error: `Transición no permitida: ${prod.estado} → ${nuevoEstado}` },
        { status: 400 }
      );
    }

    // 3. Actualizar estado
    const { error: errUpdate } = await supabase
      .from('producciones')
      .update({ estado: nuevoEstado })
      .eq('id_produccion', id);

    if (errUpdate) {
      return NextResponse.json({ ok: false, error: errUpdate.message }, { status: 500 });
    }

    // 4. CONSUMO DE INGREDIENTES (una sola vez)
    let consumoRealizado = false;
    const detallesConsumo: any[] = [];

    const debeConsumir =
      (nuevoEstado === 'en_proceso' || nuevoEstado === 'terminada') &&
      !prod.consumo_registrado;

    if (debeConsumir) {
      const { data: materiales } = await supabase
        .from('produccion_materiales')
        .select('*')
        .eq('produccion_id', id);

      for (const m of materiales || []) {
        if (!m.ingrediente_id) continue;

        const { data: ing } = await supabase
          .from('ingredientes')
          .select('id, nombre, unidad_compra')
          .eq('id', m.ingrediente_id)
          .single();

        const cantidadCompra = convertirAUnidadCompra(
          Number(m.cantidad_real || 0),
          m.unidad,
          ing?.unidad_compra || null
        );

        const { data: stk } = await supabase
          .from('stock')
          .select('id, cantidad_actual')
          .eq('ingrediente_id', m.ingrediente_id)
          .single();

        if (stk) {
          await supabase
            .from('stock')
            .update({
              cantidad_actual: (stk.cantidad_actual || 0) - cantidadCompra,
              updated_at: new Date().toISOString(),
            })
            .eq('id', stk.id);
        } else {
          await supabase.from('stock').insert({
            ingrediente_id: m.ingrediente_id,
            ingrediente_nombre: m.ingrediente_nombre,
            cantidad_actual: -cantidadCompra,
            stock_minimo: 0,
            stock_maximo: 0,
            hotel_id: prod.hotel_id,
          });
        }

        await supabase.from('movimientos_stock').insert({
          ingrediente_id: m.ingrediente_id,
          ingrediente_nombre: m.ingrediente_nombre,
          tipo: 'salida',
          cantidad: cantidadCompra,
          motivo: `Producción: ${prod.nombre}`,
          referencia: prod.lote_numero,
          usuario,
          hotel_id: prod.hotel_id,
        });

        detallesConsumo.push({
          ingrediente: m.ingrediente_nombre,
          cantidad: cantidadCompra,
          unidad_compra: ing?.unidad_compra || m.unidad,
        });
      }

      await supabase
        .from('producciones')
        .update({ consumo_registrado: true })
        .eq('id_produccion', id);

      consumoRealizado = true;
    }

    // 5. Entrada de stock de producto terminado
    let stockCreado = false;

    if (nuevoEstado === 'terminada') {
      const { data: existente } = await supabase
        .from('stock_producciones')
        .select('id')
        .eq('produccion_id', id)
        .eq('movimiento_tipo', 'entrada');

      if (!existente || existente.length === 0) {
        await supabase.from('stock_producciones').insert({
          produccion_id: id,
          producto_nombre: prod.nombre,
          cantidad_disponible: prod.cantidad_producida,
          cantidad_inicial: prod.cantidad_producida,
          unidad_medida: prod.unidad_medida,
          ubicacion: prod.ubicacion_almacen || 'GENERAL',
          fecha_entrada: prod.fecha_produccion,
          fecha_caducidad: prod.fecha_caducidad,
          lote_numero: prod.lote_numero,
          movimiento_tipo: 'entrada',
          responsable_movimiento: prod.responsable_nombre,
          observaciones: 'Entrada automática al terminar producción',
          hotel_id: prod.hotel_id,
        });
        stockCreado = true;
      }
    }

    return NextResponse.json({
      ok: true,
      estado: nuevoEstado,
      consumo_realizado: consumoRealizado,
      consumo: detallesConsumo,
      stock_terminado_creado: stockCreado,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Error al cambiar estado' },
      { status: 500 }
    );
  }
}
