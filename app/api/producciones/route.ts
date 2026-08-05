// app/api/producciones/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const DEFAULT_HOTEL_ID = '00000000-0000-0000-0000-000000000001';

const ESTADOS_VALIDOS = [
  'planificada',
  'en_proceso',
  'terminada',
  'cancelada',
];

// =====================================================
// Cliente Supabase
// =====================================================
function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

// =====================================================
// Utilidades
// =====================================================
function generarLoteNumero() {
  const now = new Date();

  const fecha = now.toISOString().slice(0, 10).replace(/-/g, '');
  const hora = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const random = Math.random().toString(36).slice(2, 5).toUpperCase();

  return `PROD-${fecha}-${hora}-${random}`;
}

function round(n: number, decimales = 3) {
  const p = Math.pow(10, decimales);
  return Math.round(n * p) / p;
}

// Factor de escala según cantidad a producir
function calcularFactor(
  cantidad: number,
  unidad: string,
  gramosReceta: number,
  porciones: number
) {
  const u = (unidad || '').toLowerCase();

  if (gramosReceta > 0) {
    if (u.includes('kg') || u.includes('kilo')) {
      return (cantidad * 1000) / gramosReceta;
    }
    if (u.includes('gramo') || u === 'g' || u === 'gr') {
      return cantidad / gramosReceta;
    }
    if (u.includes('litro') || u === 'l' || u === 'ml') {
      const gramos = u === 'ml' ? cantidad : cantidad * 1000;
      return gramos / gramosReceta;
    }
  }

  if (porciones > 0) {
    return cantidad / porciones;
  }

  return 1;
}

// =====================================================
// GET /api/producciones
// =====================================================
export async function GET(request: Request) {
  try {
    const supabase = getSupabase();
    const url = new URL(request.url);

    const estado = url.searchParams.get('estado');
    const q = url.searchParams.get('q');
    const desde = url.searchParams.get('desde');
    const hasta = url.searchParams.get('hasta');
    const ubicacion = url.searchParams.get('ubicacion');

    let query = supabase
      .from('producciones')
      .select('*')
      .order('fecha_produccion', { ascending: false })
      .limit(200);

    if (estado && estado !== 'todas') {
      query = query.eq('estado', estado);
    }

    if (q) {
      query = query.ilike('nombre', `%${q}%`);
    }

    if (ubicacion) {
      query = query.ilike('ubicacion_almacen', `%${ubicacion}%`);
    }

    if (desde) {
      query = query.gte('fecha_produccion', desde);
    }

    if (hasta) {
      query = query.lte('fecha_produccion', hasta);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Error al listar producciones' },
      { status: 500 }
    );
  }
}

// =====================================================
// POST /api/producciones
// =====================================================
export async function POST(request: Request) {
  try {
    const supabase = getSupabase();

    let body: any;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: 'JSON inválido' },
        { status: 400 }
      );
    }

    const cantidad = Number(body?.cantidad_producida);

    if (!body?.nombre || !body?.fecha_caducidad || !cantidad || cantidad <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Campos obligatorios: nombre, fecha_caducidad y cantidad_producida mayor que 0',
        },
        { status: 400 }
      );
    }

    const estado = body?.estado || 'planificada';

    if (!ESTADOS_VALIDOS.includes(estado)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Estado inválido. Permitidos: ${ESTADOS_VALIDOS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const loteNumero = body?.lote_numero?.trim() || generarLoteNumero();

    const payloadProduccion = {
      nombre: body.nombre.trim(),
      sub_receta_id: body?.sub_receta_id || null,
      fecha_produccion: body?.fecha_produccion || new Date().toISOString(),
      fecha_caducidad: body.fecha_caducidad,
      cantidad_producida: cantidad,
      unidad_medida: body?.unidad_medida || 'unidades',
      lote_numero: loteNumero,
      responsable_id: body?.responsable_id || null,
      responsable_nombre: body?.responsable_nombre || null,
      ubicacion_almacen: body?.ubicacion_almacen || null,
      estado,
      merma_porcentaje: Number(body?.merma_porcentaje || 0),
      coste_real: Number(body?.coste_real || 0),
      observaciones: body?.observaciones || null,
      hotel_id: body?.hotel_id || DEFAULT_HOTEL_ID,
    };

    // --------------------------------------------------
    // 1. Crear producción
    // --------------------------------------------------
    const { data: produccion, error: errorProduccion } = await supabase
      .from('producciones')
      .insert(payloadProduccion)
      .select()
      .single();

    if (errorProduccion || !produccion) {
      return NextResponse.json(
        {
          ok: false,
          error: errorProduccion?.message || 'No se pudo crear la producción',
        },
        { status: 500 }
      );
    }

    const rollbackProduccion = async (mensaje: string, status = 500) => {
      await supabase
        .from('lotes')
        .delete()
        .eq('produccion_id', produccion.id_produccion);

      await supabase
        .from('produccion_materiales')
        .delete()
        .eq('produccion_id', produccion.id_produccion);

      await supabase
        .from('producciones')
        .delete()
        .eq('id_produccion', produccion.id_produccion);

      return NextResponse.json({ ok: false, error: mensaje }, { status });
    };

    // --------------------------------------------------
    // 2. Crear lote asociado (trazabilidad + QR)
    // --------------------------------------------------
    const qrData = {
      tipo: 'produccion',
      lote: loteNumero,
      producto: produccion.nombre,
      fecha_produccion: produccion.fecha_produccion,
      fecha_caducidad: produccion.fecha_caducidad,
      cantidad: produccion.cantidad_producida,
      unidad: produccion.unidad_medida,
      ubicacion: produccion.ubicacion_almacen,
    };

    const { error: errorLote } = await supabase.from('lotes').insert({
      lote_numero: loteNumero,
      produccion_id: produccion.id_produccion,
      fecha_produccion: produccion.fecha_produccion,
      fecha_caducidad: produccion.fecha_caducidad,
      cantidad_total: produccion.cantidad_producida,
      cantidad_consumida: 0,
      estado: 'activo',
      temperatura_conservacion: body?.temperatura_conservacion || null,
      alergen_info: body?.alergen_info || null,
      qr_data: qrData,
      hotel_id: payloadProduccion.hotel_id,
    });

    if (errorLote) {
      return await rollbackProduccion(
        `Producción creada pero falló el lote: ${errorLote.message}`
      );
    }

    // --------------------------------------------------
    // 3. DESPIECE AUTOMÁTICO desde la sub-receta
    // --------------------------------------------------
    let factorAplicado = 1;
    let materialesGenerados = 0;

    if (payloadProduccion.sub_receta_id) {
      const { data: receta } = await supabase
        .from('recetas')
        .select('id, nombre, porciones, produccion_gramos')
        .eq('id', payloadProduccion.sub_receta_id)
        .single();

      if (receta) {
        const { data: lineas } = await supabase
          .from('receta_detalle')
          .select('*')
          .or(`receta_id.eq.${receta.id},subreceta_id.eq.${receta.id}`);

        const lineasValidas = (lineas || []).filter((l: any) =>
          /^[0-9a-fA-F-]{36}$/.test(String(l.ingrediente_id || ''))
        );

        const ids = Array.from(
          new Set(lineasValidas.map((l: any) => l.ingrediente_id))
        );

        const nombres: Record<string, string> = {};

        if (ids.length > 0) {
          const { data: ings } = await supabase
            .from('ingredientes')
            .select('id, nombre')
            .in('id', ids);

          (ings || []).forEach((i: any) => {
            nombres[i.id] = i.nombre;
          });
        }

        const gramosReceta =
          parseFloat(
            String(receta.produccion_gramos || '').replace(',', '.')
          ) || 0;
        const porciones = Number(receta.porciones || 0);

        factorAplicado = calcularFactor(
          cantidad,
          payloadProduccion.unidad_medida,
          gramosReceta,
          porciones
        );

        const materialesAuto = lineasValidas.map((l: any) => {
          const cantTeorica =
            Number(l.cantidad_necesaria || 0) * factorAplicado;

          const costeUnitario =
            Number(l.cantidad_necesaria) > 0
              ? Number(l.coste_linea || 0) / Number(l.cantidad_necesaria)
              : 0;

          return {
            produccion_id: produccion.id_produccion,
            ingrediente_id: l.ingrediente_id,
            ingrediente_nombre:
              nombres[l.ingrediente_id] || 'Ingrediente sin nombre',
            cantidad_teorica: round(cantTeorica),
            cantidad_real: round(cantTeorica),
            unidad: l.unidad || 'ud',
            coste_unitario: round(costeUnitario, 6),
            hotel_id: payloadProduccion.hotel_id,
          };
        });

        if (materialesAuto.length > 0) {
          const { error: errorAuto } = await supabase
            .from('produccion_materiales')
            .insert(materialesAuto);

          if (errorAuto) {
            return await rollbackProduccion(
              `Falló el despiece automático: ${errorAuto.message}`
            );
          }

          materialesGenerados = materialesAuto.length;
        }
      }
    }

    // --------------------------------------------------
    // 4. Materiales manuales (opcionales)
    // --------------------------------------------------
    if (Array.isArray(body?.materiales) && body.materiales.length > 0) {
      const manuales = body.materiales
        .filter((m: any) => m?.ingrediente_nombre)
        .map((m: any) => ({
          produccion_id: produccion.id_produccion,
          ingrediente_id: m?.ingrediente_id || null,
          ingrediente_nombre: m.ingrediente_nombre,
          cantidad_teorica: Number(m?.cantidad_teorica || 0),
          cantidad_real: Number(m?.cantidad_real || m?.cantidad_teorica || 0),
          unidad: m?.unidad || 'ud',
          coste_unitario: Number(m?.coste_unitario || 0),
          hotel_id: payloadProduccion.hotel_id,
        }));

      if (manuales.length > 0) {
        const { error: errorManuales } = await supabase
          .from('produccion_materiales')
          .insert(manuales);

        if (errorManuales) {
          return await rollbackProduccion(
            `Falló la creación de materiales manuales: ${errorManuales.message}`
          );
        }
      }
    }

    // --------------------------------------------------
    // 5. Recalcular coste real con todos los materiales
    // --------------------------------------------------
    const { data: materialesCreados } = await supabase
      .from('produccion_materiales')
      .select('coste_total')
      .eq('produccion_id', produccion.id_produccion);

    if (materialesCreados && materialesCreados.length > 0) {
      const costeReal = materialesCreados.reduce(
        (total: number, item: any) => total + Number(item?.coste_total || 0),
        0
      );

      await supabase
        .from('producciones')
        .update({ coste_real: round(costeReal, 2) })
        .eq('id_produccion', produccion.id_produccion);
    }

    // --------------------------------------------------
    // 6. Si está terminada → entrada de stock automática
    // --------------------------------------------------
    if (estado === 'terminada') {
      const { error: errorStock } = await supabase
        .from('stock_producciones')
        .insert({
          produccion_id: produccion.id_produccion,
          producto_nombre: produccion.nombre,
          cantidad_disponible: produccion.cantidad_producida,
          cantidad_inicial: produccion.cantidad_producida,
          unidad_medida: produccion.unidad_medida,
          ubicacion: produccion.ubicacion_almacen || 'GENERAL',
          fecha_entrada: produccion.fecha_produccion,
          fecha_caducidad: produccion.fecha_caducidad,
          lote_numero: loteNumero,
          movimiento_tipo: 'entrada',
          responsable_movimiento: produccion.responsable_nombre || null,
          observaciones: 'Entrada automática por producción terminada',
          hotel_id: payloadProduccion.hotel_id,
        });

      if (errorStock) {
        return await rollbackProduccion(
          `Falló la entrada de stock: ${errorStock.message}`
        );
      }
    }

    // --------------------------------------------------
    // 7. Respuesta final
    // --------------------------------------------------
    const { data: produccionFinal } = await supabase
      .from('producciones')
      .select('*')
      .eq('id_produccion', produccion.id_produccion)
      .single();

    return NextResponse.json(
      {
        ok: true,
        message: 'Producción creada correctamente',
        data: produccionFinal || produccion,
        lote_numero: loteNumero,
        factor_aplicado: round(factorAplicado, 4),
        materiales_generados: materialesGenerados,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Error al crear la producción' },
      { status: 500 }
    );
  }
}
