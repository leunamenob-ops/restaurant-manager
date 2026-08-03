import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { renderToStream } from '@react-pdf/renderer';
import ReporteHACCP from './documento-pdf';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inicio = searchParams.get('inicio');
    const fin = searchParams.get('fin');
    const categoria = searchParams.get('categoria');

    if (!inicio || !fin) {
      return NextResponse.json({ error: 'Fechas requeridas' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obtener registros con sus PCCs
    let query = supabase
      .from('haccp_registros')
      .select(`
        *,
        haccp_pcc (
          nombre_pcc,
          categoria_id
        )
      `)
      .gte('fecha_hora', `${inicio}T00:00:00`)
      .lte('fecha_hora', `${fin}T23:59:59`)
      .order('fecha_hora', { ascending: false });

    if (categoria && categoria !== 'todas') {
      query = query.eq('haccp_pcc.categoria_id', categoria);
    }

    const { data: registros, error } = await query;
    if (error) throw error;

    // Obtener categorías por separado
    const { data: categoriasData } = await supabase
      .from('haccp_categorias')
      .select('id, nombre');

    const categoriasMap: Record<string, string> = {};
    categoriasData?.forEach(cat => {
      categoriasMap[cat.id] = cat.nombre;
    });

    // Organizar por categoría
    const registrosPorCategoria: any = {};
    registros?.forEach((reg: any) => {
      const pcc = reg.haccp_pcc || {};
      const catId = pcc.categoria_id || 'SIN_CATEGORIA';
      const catNombre = categoriasMap[catId] || 'Sin Categoría';
      
      if (!registrosPorCategoria[catId]) {
        registrosPorCategoria[catId] = {
          nombre: catNombre,
          items: []
        };
      }
      
      registrosPorCategoria[catId].items.push({
        ...reg,
        nombre_pcc: pcc.nombre_pcc || 'Desconocido'
      });
    });

    // Calcular estadísticas
    const totalRegistros = registros?.length || 0;
    const totalOK = registros?.filter((r: any) => r.estado === 'OK').length || 0;
    const totalNOK = registros?.filter((r: any) => r.estado === 'NO_OK').length || 0;
    const porcentajeCumplimiento = totalRegistros > 0 ? Math.round((totalOK / totalRegistros) * 100) : 0;

    // Generar PDF
    const stream = await renderToStream(
      <ReporteHACCP
        inicio={inicio}
        fin={fin}
        registrosPorCategoria={registrosPorCategoria}
        totalRegistros={totalRegistros}
        totalOK={totalOK}
        totalNOK={totalNOK}
        porcentajeCumplimiento={porcentajeCumplimiento}
      />
    );
    
    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Reporte_HACCP_${inicio}_a_${fin}.pdf"`
      }
    });

  } catch (error: any) {
    console.error('Error generando PDF:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
