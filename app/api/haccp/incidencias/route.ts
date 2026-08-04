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

    // 🔥 CONSULTA ACTUALIZADA CON foto_evidencia Y haccp_categorias
    let query = supabase
      .from('haccp_registros')
      .select(`
        id_registro,
        id_pcc,
        valor_medido,
        unidad,
        accion_correctora,
        foto_evidencia,
        fecha_hora,
        id_usuario,
        haccp_pcc (
          nombre_pcc,
          categoria_id,
          haccp_categorias (
            nombre
          )
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

    // 🔥 APLANAR DATOS PARA EL FRONTEND (extrayendo correctamente el nombre de la categoría)
    const incidenciasAplanadas = data?.map(inc => ({
      id_registro: inc.id_registro,
      id_pcc: inc.id_pcc,
      nombre_pcc: inc.haccp_pcc?.nombre_pcc || 'Desconocido',
      categoria_nombre: inc.haccp_pcc?.haccp_categorias?.nombre || 'Sin Categoría',
      valor_medido: inc.valor_medido,
      unidad: inc.unidad,
      accion_correctora: inc.accion_correctora,
      foto_evidencia: inc.foto_evidencia,
      fecha_hora: inc.fecha_hora,
      id_usuario: inc.id_usuario
    })) || [];

    return NextResponse.json(incidenciasAplanadas);

  } catch (error: any) {
    console.error('❌ Error obteniendo incidencias:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
