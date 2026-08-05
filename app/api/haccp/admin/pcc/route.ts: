import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET - Obtener todos los PCCs y categorías
export async function GET() {
  try {
    const { data: pccs, error: errorPccs } = await supabase
      .from('haccp_pcc')
      .select('*')
      .order('categoria_id', { ascending: true })
      .order('nombre_pcc', { ascending: true });

    if (errorPccs) {
      console.error('Error obteniendo PCCs:', errorPccs);
      return NextResponse.json({ error: errorPccs.message, pccs: [], categorias: [] }, { status: 500 });
    }

    const { data: categorias, error: errorCats } = await supabase
      .from('haccp_categorias')
      .select('id, nombre')
      .order('id');

    if (errorCats) {
      console.error('Error obteniendo categorías:', errorCats);
    }

    return NextResponse.json({ 
      pccs: pccs || [], 
      categorias: categorias || [] 
    });

  } catch (error: any) {
    console.error('Error en API admin PCC:', error);
    return NextResponse.json({ 
      error: error.message, 
      pccs: [], 
      categorias: [] 
    }, { status: 500 });
  }
}

// POST - Crear nuevo PCC
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { 
      id_pcc, 
      nombre_pcc, 
      categoria_id, 
      tipo_control, 
      limite_min, 
      limite_max, 
      unidad, 
      frecuencia,
      descripcion 
    } = body;

    if (!id_pcc || !nombre_pcc || !categoria_id) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('haccp_pcc')
      .insert({
        id_pcc,
        nombre_pcc,
        categoria_id,
        tipo_control: tipo_control || 'NUMERICO',
        limite_min: limite_min !== null && limite_min !== undefined ? limite_min : null,
        limite_max: limite_max !== null && limite_max !== undefined ? limite_max : null,
        unidad: unidad || null,
        frecuencia: frecuencia || 'Diaria',
        descripcion: descripcion || null
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ya existe un PCC con ese ID' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Actualizar PCC
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    const { 
      id_pcc, 
      nombre_pcc, 
      categoria_id, 
      tipo_control, 
      limite_min, 
      limite_max, 
      unidad, 
      frecuencia,
      descripcion 
    } = body;

    if (!id_pcc) {
      return NextResponse.json({ error: 'ID del PCC requerido' }, { status: 400 });
    }

    const updateData: any = {};
    if (nombre_pcc !== undefined) updateData.nombre_pcc = nombre_pcc;
    if (categoria_id !== undefined) updateData.categoria_id = categoria_id;
    if (tipo_control !== undefined) updateData.tipo_control = tipo_control;
    if (limite_min !== undefined) updateData.limite_min = limite_min;
    if (limite_max !== undefined) updateData.limite_max = limite_max;
    if (unidad !== undefined) updateData.unidad = unidad;
    if (frecuencia !== undefined) updateData.frecuencia = frecuencia;
    if (descripcion !== undefined) updateData.descripcion = descripcion;

    const { data, error } = await supabase
      .from('haccp_pcc')
      .update(updateData)
      .eq('id_pcc', id_pcc)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Eliminar PCC
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id_pcc = searchParams.get('id_pcc');

    if (!id_pcc) {
      return NextResponse.json({ error: 'ID del PCC requerido' }, { status: 400 });
    }

    const { error } = await supabase
      .from('haccp_pcc')
      .delete()
      .eq('id_pcc', id_pcc);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
