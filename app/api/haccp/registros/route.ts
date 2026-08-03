import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inicio = searchParams.get('inicio');
    const fin = searchParams.get('fin');
    const categoria = searchParams.get('categoria'); // Es el ID de la categoría (ej: 'CAT_01')
    const id_pcc = searchParams.get('id_pcc');
    const limite = searchParams.get('limite');

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
      .gte('fecha_hora', `${inicio}T00:00:00`)
      .lte('fecha_hora', `${fin}T23:59:59`);

    // Filtro por Categoría (usando el ID de la categoría en la tabla pcc)
    if (categoria && categoria !== 'todas') {
      query = query.eq('haccp_pcc.categoria_id', categoria);
    }

    // Filtro por PCC específico
    if (id_pcc && id_pcc !== 'todas') {
      query = query.eq('id_pcc', id_pcc);
    }

    query = query.order('fecha_hora', { ascending: false });

    if (limite) {
      query = query.limit(parseInt(limite));
    }

    const { data, error } = await query;

    if (error) throw error;

    // Aplanar los datos para que el frontend pueda acceder a reg.nombre_pcc directamente
    const registrosAplanados = data?.map(reg => ({
      ...reg,
      nombre_pcc: reg.haccp_pcc?.nombre_pcc || reg.nombre_pcc || 'Desconocido',
      categoria_nombre: reg.categoria_nombre || 'Sin Categoría'
    })) || [];

    return NextResponse.json(registrosAplanados);

  } catch (error: any) {
    console.error('❌ Error obteniendo registros:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
