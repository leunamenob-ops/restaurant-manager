import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get('categoria');

    console.log('📂 API /api/haccp/pcc - Categoría:', categoria);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 🔥 IMPORTANTE: Seleccionar TODAS las columnas necesarias
    let query = supabase
      .from('haccp_pcc')
      .select('id_pcc, nombre_pcc, categoria_id, tipo_control, limite_min, limite_max, unidad, frecuencia, descripcion, categoria_nombre')
      .order('nombre_pcc');

    // Si se especifica categoría, filtrar
    if (categoria && categoria !== 'todas') {
      console.log('🔍 Filtrando por categoría:', categoria);
      query = query.eq('categoria_id', categoria);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error en Supabase:', error);
      throw error;
    }

    console.log('✅ PCCs encontrados:', data?.length || 0);
    console.log('📋 Primer PCC:', data?.[0]);

    return NextResponse.json(data || []);

  } catch (error: any) {
    console.error('❌ Error en API de PCCs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
