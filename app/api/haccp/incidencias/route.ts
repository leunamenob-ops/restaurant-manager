import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inicio = searchParams.get('inicio') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const fin = searchParams.get('fin') || new Date().toISOString().split('T')[0];

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    //  Consulta SIMPLE sin joins anidados
    const { data: registros, error } = await supabase
      .from('haccp_registros')
      .select('*')
      .eq('estado', 'NO_OK')
      .gte('fecha_hora', `${inicio}T00:00:00`)
      .lte('fecha_hora', `${fin}T23:59:59`)
      .order('fecha_hora', { ascending: false });

    if (error) {
      console.error(' Error Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(' Registros NO_OK encontrados:', registros?.length || 0);

    if (!registros || registros.length === 0) {
      return NextResponse.json([]);
    }

    //  Obtener PCCs y categorías por separado
    const pccIds = [...new Set(registros.map(r => r.id_pcc))];
    
    const { data: pccs } = await supabase
      .from('haccp_pcc')
      .select('id_pcc, nombre_pcc, categoria_id')
      .in('id_pcc', pccIds);

    const catIds = [...new Set(pccs?.map(p => p.categoria_id) || [])];
    
    const { data: categorias } = await supabase
      .from('haccp_categorias')
      .select('id, nombre')
      .in('id', catIds);

    // 🔥 Crear mapas
    const pccMap = new Map(pccs?.map(p => [p.id_pcc, p]) || []);
    const catMap = new Map(categorias?.map(c => [c.id, c.nombre]) || []);

    // 🔥 Combinar datos
    const resultado = registros.map(reg => {
      const pcc = pccMap.get(reg.id_pcc);
      return {
        id_registro: reg.id_registro,
        id_pcc: reg.id_pcc,
        nombre_pcc: pcc?.nombre_pcc || 'Desconocido',
        categoria_nombre: pcc ? catMap.get(pcc.categoria_id) || 'Sin Categoría' : 'Sin Categoría',
        valor_medido: reg.valor_medido,
        unidad: reg.unidad,
        accion_correctora: reg.accion_correctora,
        foto_evidencia: reg.foto_evidencia,
        fecha_hora: reg.fecha_hora,
        id_usuario: reg.id_usuario,
        estado: reg.estado
      };
    });

    console.log('✅ Incidencias procesadas:', resultado.length);
    return NextResponse.json(resultado);

  } catch (error: any) {
    console.error('❌ Error en API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
