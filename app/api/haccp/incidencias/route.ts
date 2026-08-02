import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inicio = searchParams.get('inicio');
    const fin = searchParams.get('fin');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let query = supabase
      .from('haccp_registros')
      .select('*')
      .eq('estado', 'NO_OK')
      .order('fecha_hora', { ascending: false });

    if (inicio && fin) {
      query = query
        .gte('fecha_hora', `${inicio}T00:00:00`)
        .lte('fecha_hora', `${fin}T23:59:59`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error en incidencias:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Obtener nombres de PCC para cada incidencia
    const incidenciasConNombre = await Promise.all(
      (data || []).map(async (inc: any) => {
        const { data: pccData } = await supabase
          .from('haccp_pcc')
          .select('nombre_pcc, unidad')
          .eq('id_pcc', inc.id_pcc)
          .single();

        return {
          ...inc,
          nombre_pcc: pccData?.nombre_pcc || 'PCC desconocido',
          unidad: pccData?.unidad || inc.unidad || ''
        };
      })
    );

    return NextResponse.json(incidenciasConNombre);

  } catch (error: any) {
    console.error('Error obteniendo incidencias:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
