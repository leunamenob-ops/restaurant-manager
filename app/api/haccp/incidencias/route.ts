import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inicio = searchParams.get('inicio');
    const fin = searchParams.get('fin');
    const categoria = searchParams.get('categoria');
    const id_pcc = searchParams.get('id_pcc');

    if (!inicio || !fin) {
      return NextResponse.json({ error: 'Fechas requeridas' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    let query = supabase
      .from('haccp_registros')
      .select(`
        *,
        haccp_pcc (
          nombre_pcc,
          categoria_id
        )
      `)
      .eq('estado', 'NO_OK')
      .gte('fecha_hora', `${inicio}T00:00:00`)
      .lte('fecha_hora', `${fin}T23:59:59`);

    if (categoria && categoria !== 'todas') {
      query = query.eq('haccp_pcc.categoria_id', categoria);
    }

    if (id_pcc && id_pcc !== 'todas') {
      query = query.eq('id_pcc', id_pcc);
    }

    query = query.order('fecha_hora', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    // Aplanar datos para el frontend
    const incidenciasAplanadas = data?.map(inc => ({
      ...inc,
      nombre_pcc: inc.haccp_pcc?.nombre_pcc || inc.nombre_pcc || 'Desconocido',
      categoria_nombre: inc.categoria_nombre || 'Sin Categoría'
    })) || [];

    return NextResponse.json(incidenciasAplanadas);

  } catch (error: any) {
    console.error('❌ Error obteniendo incidencias:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
