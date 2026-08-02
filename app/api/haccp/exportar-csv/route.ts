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
      .order('fecha_hora', { ascending: false });

    if (inicio && fin) {
      query = query
        .gte('fecha_hora', `${inicio}T00:00:00`)
        .lte('fecha_hora', `${fin}T23:59:59`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error exportando:', error);
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

    // Convertir a CSV
    const headers = [
      'Fecha', 'PCC', 'Usuario', 'Valor', 'Unidad', 
      'Estado', 'Cumple', 'Accion_Correctora'
    ];

    const rows = registrosConNombre.map((reg: any) => {
      const fecha = new Date(reg.fecha_hora).toLocaleString('es-ES');
      const valor = reg.valor_medido || reg.temp_final || '';
      const unidad = reg.unidad || '';
      const accion = reg.accion_correctora || '';
      
      return [
        `"${fecha}"`,
        `"${reg.nombre_pcc}"`,
        `"${reg.id_usuario || ''}"`,
        `"${valor}"`,
        `"${unidad}"`,
        `"${reg.estado}"`,
        `"${reg.cumple_si_no || ''}"`,
        `"${accion}"`
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=reporte-haccp-${inicio || 'todo'}-a-${fin || 'hoy'}.csv`
      }
    });

  } catch (error: any) {
    console.error('Error exportando CSV:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
