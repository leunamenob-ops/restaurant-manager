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

    // 1. Total registros
    let queryTotal = supabase
      .from('haccp_registros')
      .select('*', { count: 'exact', head: true });

    if (inicio && fin) {
      // Añadir hora completa al rango
      queryTotal = queryTotal
        .gte('fecha_hora', `${inicio}T00:00:00`)
        .lte('fecha_hora', `${fin}T23:59:59`);
    }

    const { count: totalRegistros } = await queryTotal;
    const total = totalRegistros || 0;

    // 2. Registros OK
    let queryOK = supabase
      .from('haccp_registros')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'OK');

    if (inicio && fin) {
      queryOK = queryOK
        .gte('fecha_hora', `${inicio}T00:00:00`)
        .lte('fecha_hora', `${fin}T23:59:59`);
    }

    const { count: registrosOK } = await queryOK;
    const ok = registrosOK || 0;

    // 3. Registros NO_OK
    let queryNOK = supabase
      .from('haccp_registros')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'NO_OK');

    if (inicio && fin) {
      queryNOK = queryNOK
        .gte('fecha_hora', `${inicio}T00:00:00`)
        .lte('fecha_hora', `${fin}T23:59:59`);
    }

    const { count: registrosNOK } = await queryNOK;
    const nok = registrosNOK || 0;

    // 4. Incidencias hoy
    const hoy = new Date().toISOString().split('T')[0];
    const { count: incidenciasHoy } = await supabase
      .from('haccp_registros')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'NO_OK')
      .gte('fecha_hora', `${hoy}T00:00:00`)
      .lte('fecha_hora', `${hoy}T23:59:59`);

    const hoyNok = incidenciasHoy || 0;

    // 5. Calcular porcentaje
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
    console.error('Error en estadísticas:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
