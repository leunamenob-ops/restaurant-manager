import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inicio = searchParams.get('inicio');
    const fin = searchParams.get('fin');

    // 1. Total registros
    let queryTotal = supabase
      .from('haccp_registros')
      .select('*', { count: 'exact', head: true });

    if (inicio && fin) {
      queryTotal = queryTotal.gte('fecha_hora', inicio).lte('fecha_hora', fin);
    }
    const { count: totalRegistros } = await queryTotal;
    const total = totalRegistros || 0;

    // 2. Registros OK
    let queryOK = supabase
      .from('haccp_registros')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'OK');

    if (inicio && fin) {
      queryOK = queryOK.gte('fecha_hora', inicio).lte('fecha_hora', fin);
    }
    const { count: registrosOK } = await queryOK;
    const ok = registrosOK || 0;

    // 3. Registros NO_OK
    let queryNOK = supabase
      .from('haccp_registros')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'NO_OK');

    if (inicio && fin) {
      queryNOK = queryNOK.gte('fecha_hora', inicio).lte('fecha_hora', fin);
    }
    const { count: registrosNOK } = await queryNOK;
    const nok = registrosNOK || 0;

    // 4. Incidencias hoy
    const hoy = new Date().toISOString().split('T')[0];
    const { count: incidenciasHoy } = await supabase
      .from('haccp_registros')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'NO_OK')
      .gte('fecha_hora', hoy);
    
    const hoyNok = incidenciasHoy || 0;

    // 5. Calcular porcentaje de cumplimiento (100% seguro, sin división por cero ni nulls)
    const porcentajeCumplimiento = total > 0
      ? Math.round((ok / total) * 100)
      : 0;

    return NextResponse.json({
      totalRegistros: total,
      registrosOK: ok,
      registrosNOK: nok,
      porcentajeCumplimiento,
      incidenciasHoy: hoyNok
    });

  } catch (error: any) {
    console.error('Error en estadísticas HACCP:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
