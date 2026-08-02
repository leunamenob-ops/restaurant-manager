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

    const incidencias = (data || []).map((inc: any) => ({
      ...inc,
      nombre_pcc: inc.haccp_pcc?.nombre_pcc || 'PCC desconocido',
      unidad: inc.haccp_pcc?.unidad || ''
    }));

    return NextResponse.json(incidencias);
  } catch (error: any) {
    console.error('Error obteniendo incidencias:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
