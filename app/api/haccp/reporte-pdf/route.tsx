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

    // 1. Obtener registros con sus PCCs
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
    if (error) {
      console.error('Error al obtener registros:', error);
      throw error;
    }

    // 2. Obtener el catálogo de categorías
    const { data: categoriasData, error: catError } = await supabase
      .from('haccp_categorias')
      .select('id, nombre');

    if (catError) {
      console.error('Error al obtener categorías:', catError);
    }

    // Crear un mapa de ID -> Nombre (asegurando que la clave sea string para evitar fallos de tipo)
    const categoriasMap: Record<string, string> = {};
    categoriasData?.forEach(cat => {
      categoriasMap[String(cat.id)] = cat.nombre;
    });

    console.log('📊 Mapa de categorías cargado:', categoriasMap); // Visible en logs de Vercel

    // 3. Organizar los registros por categoría
    const registrosPorCategoria: any = {};
    
    registros?.forEach((reg: any) => {
      const pcc = reg.haccp_pcc || {};
      const rawCatId = pcc.categoria_id;
      const catId = rawCatId ? String(rawCatId) : 'SIN_CATEGORIA';
      
      // Buscar el nombre. Si no está en el mapa, usamos el ID formateado como fallback
      const catNombre = categoriasMap[catId] || `Categoría ${catId}`;
      
      if (!registrosPorCategoria[catId]) {
        registrosPorCategoria[catId] = {
          nombre: catNombre,
          items: []
        };
      }
      
      registrosPorCategoria[catId].items.push({
        ...reg,
        nombre_pcc: pcc.nombre_pcc || 'PCC Desconocido'
      });
    });

    // 4. Calcular estadísticas
    const totalRegistros = registros?.length || 0;
    const totalOK = registros?.filter((r: any) => r.estado === 'OK').length || 0;
    const totalNOK = registros?.filter((r: any) => r.estado === 'NO_OK').length || 0;
    const porcentajeCumplimiento = totalRegistros > 0 ? Math.round((totalOK / totalRegistros) * 100) : 0;

    // 5. Generar el PDF
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
