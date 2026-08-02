import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inicio = searchParams.get('inicio');
    const fin = searchParams.get('fin');

    let query = supabase
      .from('haccp_registros')
      .select(`
        *,
        haccp_pcc (
          nombre_pcc,
          unidad
        )
      `)
      .eq('estado', 'NO_OK')
      .order('fecha_hora', { ascending: false });

    if (inicio && fin) {
      query = query.gte('fecha_hora', inicio).lte('fecha_hora', fin);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transformar datos
    const incidencias = data?.map(inc => ({
      ...inc,
      nombre_pcc: inc.haccp_pcc?.nombre_pcc || 'PCC desconocido',
      unidad: inc.haccp_pcc?.unidad || ''
    }));

    return NextResponse.json(incidencias || []);

  } catch (error: any) {
    console.error('Error obteniendo incidencias:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
