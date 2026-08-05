import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const DEFAULT_HOTEL_ID = '00000000-0000-0000-0000-000000000001';

const ESTADOS_VALIDOS = [
  'planificada',
  'en_proceso',
  'terminada',
  'cancelada',
];

async function getSupabase() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: '', ...options });
      },
    },
  });
}

function generarLoteNumero() {
  const now = new Date();

  const fecha = now.toISOString().slice(0, 10).replaceAll('-', '');
  const hora = now.toTimeString().slice(0, 8).replaceAll(':', '');
  const random = Math.random().toString(36).slice(2, 5).toUpperCase();

  return `PROD-${fecha}-${hora}-${random}`;
}

// =====================================================
// GET /api/producciones
// =====================================================
export async function GET(request: Request) {
  try {
    const supabase = await getSupabase();

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
        {
          ok: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Error al listar producciones',
      },
      { status: 500 }
    );
  }
}

// =====================================================
// POST /api/producciones
// =====================================================
export async function POST(request: Request) {
  try {
    const supabase = await getSupabase();

    let body: any;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: 'JSON inválido',
        },
        { status: 400 }
      );
    }

    const cantidad = Number(body?.cantidad_producida);

    if (!body?.nombre || !body?.fecha_caducidad || !cantidad || cantidad <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Campos obligatorios: nombre, fecha_caducidad y cantidad_producida mayor que 0',
        },
        { status: 400 }
      );
    }

    const estado = body?.estado || 'planificada';

    if (!ESTADOS_VALIDOS.includes(estado)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Estado inválido. Estados permitidos: ${ESTADOS_VALIDOS.join(', ')}`,
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

    // =====================================================
    // 1. Crear producción
    // =====================================================
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

      return NextResponse.json(
        {
          ok: false,
          error: mensaje,
        },
        { status }
      );
    };

    // =====================================================
    // 2. Crear lote asociado
    // =====================================================
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

    const { error: errorLote } = await supabase
      .from('lotes')
      .insert({
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
      return rollbackProduccion(
        `Producción creada pero falló la creación del lote: ${errorLote.message}`
      );
    }

    // =====================================================
    // 3. Materiales opcionales
    // =====================================================
    if (Array.isArray(body?.materiales) && body.materiales.length > 0) {
      const materiales = body.materiales
        .filter((material: any) => material?.ingrediente_nombre)
        .map((material: any) => ({
          produccion_id: produccion.id_produccion,
          ingrediente_id: material?.ingrediente_id || null,
          ingrediente_nombre: material.ingrediente_nombre,
          cantidad_teorica: Number(material?.cantidad_teorica || 0),
          cantidad_real: Number(
            material?.cantidad_real || material?.cantidad_teorica || 0
          ),
          unidad: material?.unidad || 'ud',
          coste_unitario: Number(material?.coste_unitario || 0),
          hotel_id: payloadProduccion.hotel_id,
        }));

      if (materiales.length > 0) {
        const { error: errorMateriales } = await supabase
          .from('produccion_materiales')
          .insert(materiales);

        if (errorMateriales) {
          return rollbackProduccion(
            `Falló la creación de materiales: ${errorMateriales.message}`
          );
        }

        // Recalcular coste real según materiales
        const { data: materialesCreados } = await supabase
          .from('produccion_materiales')
          .select('coste_total')
          .eq('produccion_id', produccion.id_produccion);

        const costeReal =
          materialesCreados?.reduce(
            (total: number, item: any) =>
              total + Number(item?.coste_total || 0),
            0
          ) || 0;

        await supabase
          .from('producciones')
          .update({ coste_real: costeReal })
          .eq('id_produccion', produccion.id_produccion);
      }
    }

    // =====================================================
    // 4. Si está terminada, generar stock de entrada
    // =====================================================
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
        return rollbackProduccion(
          `Falló la creación del stock de producto terminado: ${errorStock.message}`
        );
      }
    }

    return NextResponse.json(
      {
        ok: true,
        message: 'Producción creada correctamente',
        data: produccion,
        lote_numero: loteNumero,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Error al crear la producción',
      },
      { status: 500 }
    );
  }
}
