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
      .select('estado, fecha_hora, haccp_pcc(categoria_id)')
      .gte('fecha_hora', `${inicio}T00:00:00`)
      .lte('fecha_hora', `${fin}T23:59:59`);

    if (categoria && categoria !== 'todas') {
      query = query.eq('haccp_pcc.categoria_id', categoria);
    }

    if (id_pcc && id_pcc !== 'todas') {
      query = query.eq('id_pcc', id_pcc);
    }

    const { data, error } = await query;

    if (error) throw error;

    const totalRegistros = data?.length || 0;
    const registrosOK = data?.filter(r => r.estado === 'OK').length || 0;
    const registrosNOK = data?.filter(r => r.estado === 'NO_OK').length || 0;
    const porcentajeCumplimiento = totalRegistros > 0 ? Math.round((registrosOK / totalRegistros) * 100) : 0;

    // Calcular incidencias de HOY (independientemente del filtro de fecha, o dentro del rango si se prefiere)
    // Aquí lo calculamos dentro del rango seleccionado para coherencia, pero si quieres "hoy" real:
    const hoy = new Date().toISOString().split('T')[0];
    const incidenciasHoy = data?.filter(r => 
      r.estado === 'NO_OK' && r.fecha_hora.startsWith(hoy)
    ).length || 0;

    return NextResponse.json({
      totalRegistros,
      registrosOK,
      registrosNOK,
      porcentajeCumplimiento,
      incidenciasHoy
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo estadísticas:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
