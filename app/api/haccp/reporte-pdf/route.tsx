import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { renderToStream } from '@react-pdf/renderer';
import ReporteHACCP from './documento-pdf';

// 🛡️ FALLBACK DE SEGURIDAD: Si la BD de producción aún no tiene los nombres, esto lo arregla automáticamente
const CATEGORIAS_FALLBACK: Record<string, string> = {
  'CAT_01': 'Refrigeración',
  'CAT_02': 'Cocción',
  'CAT_03': 'Limpieza',
  'CAT_04': 'Recepción',
  'CAT_05': 'Almacenamiento',
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inicio = searchParams.get('inicio');
    const fin = searchParams.get('fin');
    const categoria = searchParams.get('categoria');

    if (!inicio || !fin) {
      return NextResponse.json({ error: 'Fechas requeridas' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 🔥 CONSULTA: Obtiene nombre_pcc, categoria_id y categoria_nombre
    let query = supabase
      .from('haccp_registros')
      .select(`
        *,
        haccp_pcc (
          nombre_pcc,
          categoria_id,
          categoria_nombre
        )
      `)
      .gte('fecha_hora', `${inicio}T00:00:00`)
      .lte('fecha_hora', `${fin}T23:59:59`)
      .order('fecha_hora', { ascending: false });

    if (categoria && categoria !== 'todas') {
      query = query.eq('haccp_pcc.categoria_id', categoria);
    }

    const { data: registros, error } = await query;
    if (error) {
      console.error('❌ Error Supabase:', error);
      throw error;
    }

    // 🔍 DEBUG: Descomenta esto temporalmente para ver en los logs de Vercel qué devuelve la BD
    // console.log('📊 Primer registro crudo:', registros?.[0]?.haccp_pcc);

    // Organizar por categoría
    const registrosPorCategoria: any = {};
    
    registros?.forEach((reg: any) => {
      const pcc = reg.haccp_pcc || {};
      
      // 1. Intentamos usar categoria_nombre de la BD
      let catNombre = pcc.categoria_nombre;
      
      // 2. Si está vacío, es null, o sigue siendo el ID (ej: "CAT_01"), usamos el fallback
      if (!catNombre || catNombre.startsWith('CAT_')) {
        catNombre = CATEGORIAS_FALLBACK[pcc.categoria_id] || pcc.categoria_id || 'Sin Categoría';
      }
      
      if (!registrosPorCategoria[catNombre]) {
        registrosPorCategoria[catNombre] = {
          nombre: catNombre,
          items: []
        };
      }
      
      registrosPorCategoria[catNombre].items.push({
        ...reg,
        nombre_pcc: pcc.nombre_pcc || 'PCC Desconocido'
      });
    });

    // Estadísticas
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
    console.error('❌ Error generando PDF:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
