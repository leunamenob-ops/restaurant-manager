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
        id_registro,
        id_pcc,
        valor_medido,
        unidad,
        accion_correctora,
        foto_evidencia,
        fecha_hora,
        id_usuario,
        estado,
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

    if (error) {
      console.error('Error en Supabase:', error);
      throw error;
    }

    // 🔥 APLANAR DATOS CORRECTAMENTE
    const incidenciasAplanadas = (data || []).map((inc: any) => {
      // haccp_pcc viene como array de una sola posición
      const pccArray = inc.haccp_pcc;
      const pcc = Array.isArray(pccArray) && pccArray.length > 0 ? pccArray[0] : pccArray;
      
      // haccp_categorias también viene como array
      const catArray = pcc?.haccp_categorias;
      const categoria = Array.isArray(catArray) && catArray.length > 0 ? catArray[0] : catArray;
      
      return {
        id_registro: inc.id_registro,
        id_pcc: inc.id_pcc,
        nombre_pcc: pcc?.nombre_pcc || 'Desconocido',
        categoria_nombre: categoria?.nombre || 'Sin Categoría',
        valor_medido: inc.valor_medido,
        unidad: inc.unidad,
        accion_correctora: inc.accion_correctora,
        foto_evidencia: inc.foto_evidencia,
        fecha_hora: inc.fecha_hora,
        id_usuario: inc.id_usuario,
        estado: inc.estado
      };
    });

    console.log('✅ Incidencias encontradas:', incidenciasAplanadas.length);
    return NextResponse.json(incidenciasAplanadas);

  } catch (error: any) {
    console.error('❌ Error obteniendo incidencias:', error);
    return NextResponse.json({ 
      error: error.message,
      details: error.hint || error.details 
    }, { status: 500 });
  }
}
