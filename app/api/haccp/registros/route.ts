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
      .select('*')
      .order('fecha_hora', { ascending: false })
      .limit(limite);

    if (inicio && fin) {
      query = query
        .gte('fecha_hora', `${inicio}T00:00:00`)
        .lte('fecha_hora', `${fin}T23:59:59`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error en registros:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Obtener nombres de PCC para cada registro
    const registrosConNombre = await Promise.all(
      (data || []).map(async (reg: any) => {
        const { data: pccData } = await supabase
          .from('haccp_pcc')
          .select('nombre_pcc')
          .eq('id_pcc', reg.id_pcc)
          .single();

        return {
          ...reg,
          nombre_pcc: pccData?.nombre_pcc || 'PCC desconocido'
        };
      })
    );

    return NextResponse.json(registrosConNombre);

  } catch (error: any) {
    console.error('Error obteniendo registros:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
