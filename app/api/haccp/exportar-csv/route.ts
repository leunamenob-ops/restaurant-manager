import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inicio = searchParams.get('inicio');
    const fin = searchParams.get('fin');
    const categoria = searchParams.get('categoria');

    let query = supabase
      .from('haccp_registros')
      .select(`
        *,
        haccp_pcc (
          nombre_pcc,
          categoria_id
        )
      `)
      .order('fecha_hora', { ascending: false });

    if (inicio && fin) {
      query = query.gte('fecha_hora', inicio).lte('fecha_hora', fin);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transformar a CSV
    const csvData = data?.map(reg => ({
      Fecha: new Date(reg.fecha_hora).toLocaleString('es-ES'),
      PCC: reg.haccp_pcc?.nombre_pcc || '',
      Usuario: reg.id_usuario,
      Valor: reg.valor_medido || reg.temp_final || '',
      Unidad: reg.unidad || '',
      Estado: reg.estado,
      Cumple: reg.cumple_si_no,
      Acción_Correctora: reg.accion_correctora || ''
    }));

    // Convertir a CSV
    const headers = Object.keys(csvData[0] || {}).join(',');
    const rows = csvData.map(row => 
      Object.values(row).map(val => `"${val}"`).join(',')
    ).join('\n');
    
    const csv = `${headers}\n${rows}`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=reporte-haccp.csv'
      }
    });

  } catch (error: any) {
    console.error('Error exportando CSV:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
