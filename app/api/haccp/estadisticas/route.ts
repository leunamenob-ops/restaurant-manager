import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inicio = searchParams.get('inicio');
    const fin = searchParams.get('fin');

    // Total registros
    let queryTotal = supabase
      .from('haccp_registros')
      .select('*', { count: 'exact', head: true });

    if (inicio && fin) {
      queryTotal = queryTotal.gte('fecha_hora', inicio).lte('fecha_hora', fin);
    }

    const { count: totalRegistros } = await queryTotal;

    // Registros OK
    let queryOK = supabase
      .from('haccp_registros')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'OK');

    if (inicio && fin) {
      queryOK = queryOK.gte('fecha_hora', inicio).lte('fecha_hora', fin);
    }

    const { count: registrosOK } = await queryOK;

    // Registros NO_OK
    let queryNOK = supabase
      .from('haccp_registros')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'NO_OK');

    if (inicio && fin) {
      queryNOK = queryNOK.gte('fecha_hora', inicio).lte('fecha_hora', fin);
    }

    const { count: registrosNOK } = await queryNOK;

    // Incidencias hoy
    const hoy = new Date().toISOString().split('T')[0];
    const { count: incidenciasHoy } = await supabase
      .from('haccp_registros')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'NO_OK')
      .gte('fecha_hora', hoy);

    // Calcular porcentaje de cumplimiento
    const porcentajeCumplimiento = totalRegistros && totalRegistros > 0
      ? Math.round((registrosOK / totalRegistros) * 100)
      : 0;

    return NextResponse.json({
      totalRegistros: totalRegistros || 0,
      registrosOK: registrosOK || 0,
      registrosNOK: registrosNOK || 0,
      porcentajeCumplimiento,
      incidenciasHoy: incidenciasHoy || 0
    });

  } catch (error: any) {
    console.error('Error en estadísticas:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
