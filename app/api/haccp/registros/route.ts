import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inicio = searchParams.get('inicio');
    const fin = searchParams.get('fin');
    const limite = parseInt(searchParams.get('limite') || '10');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    const registros = (data || []).map((reg: any) => ({
      ...reg,
      nombre_pcc: reg.haccp_pcc?.nombre_pcc || 'PCC desconocido'
    }));

    return NextResponse.json(registros);
  } catch (error: any) {
    console.error('Error obteniendo registros:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
