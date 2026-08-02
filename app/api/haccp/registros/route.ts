import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inicio = searchParams.get('inicio');
    const fin = searchParams.get('fin');
    const limite = parseInt(searchParams.get('limite') || '10');

    let query = supabase
      .from('haccp_registros')
      .select(`
        *,
        haccp_pcc (
          nombre_pcc
        )
      `)
      .order('fecha_hora', { ascending: false })
      .limit(limite);

    if (inicio && fin) {
      query = query.gte('fecha_hora', inicio).lte('fecha_hora', fin);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transformar datos
    const registros = data?.map(reg => ({
      ...reg,
      nombre_pcc: reg.haccp_pcc?.nombre_pcc || 'PCC desconocido'
    }));

    return NextResponse.json(registros || []);

  } catch (error: any) {
    console.error('Error obteniendo registros:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
