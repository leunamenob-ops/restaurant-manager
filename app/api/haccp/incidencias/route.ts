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

    // 🔥 PASO 1: Obtener registros NO_OK
    let query = supabase
      .from('haccp_registros')
      .select('*')
      .eq('estado', 'NO_OK')
      .gte('fecha_hora', `${inicio}T00:00:00`)
      .lte('fecha_hora', `${fin}T23:59:59`);

    if (id_pcc && id_pcc !== 'todas') {
      query = query.eq('id_pcc', id_pcc);
    }

    query = query.order('fecha_hora', { ascending: false });

    const { data: registros, error: errorRegistros } = await query;

    if (errorRegistros) {
      console.error('Error obteniendo registros:', errorRegistros);
      throw errorRegistros;
    }

    if (!registros || registros.length === 0) {
      return NextResponse.json([]);
    }

    // 🔥 PASO 2: Obtener todos los PCCs necesarios
    const pccIds = [...new Set(registros.map(r => r.id_pcc))];
    const { data: pccs, error: errorPCCs } = await supabase
      .from('haccp_pcc')
      .select('id_pcc, nombre_pcc, categoria_id')
      .in('id_pcc', pccIds);

    if (errorPCCs) {
      console.error('Error obteniendo PCCs:', errorPCCs);
      throw errorPCCs;
    }

    // 🔥 PASO 3: Obtener categorías
    const categoriaIds = [...new Set(pccs?.map(p => p.categoria_id) || [])];
    const { data: categorias, error: errorCats } = await supabase
      .from('haccp_categorias')
      .select('id, nombre')
      .in('id', categoriaIds);

    if (errorCats) {
      console.error('Error obteniendo categorías:', errorCats);
      throw errorCats;
    }

    // 🔥 PASO 4: Crear mapas para lookup rápido
    const pccMap = new Map(pccs?.map(p => [p.id_pcc, p]) || []);
    const catMap = new Map(categorias?.map(c => [c.id, c.nombre]) || []);

    // 🔥 PASO 5: Combinar datos
    const incidencias = registros.map(reg => {
      const pcc = pccMap.get(reg.id_pcc);
      const categoriaNombre = pcc ? catMap.get(pcc.categoria_id) || 'Sin Categoría' : 'Sin Categoría';

      return {
        id_registro: reg.id_registro,
        id_pcc: reg.id_pcc,
        nombre_pcc: pcc?.nombre_pcc || 'Desconocido',
        categoria_nombre: categoriaNombre,
        valor_medido: reg.valor_medido,
        unidad: reg.unidad,
        accion_correctora: reg.accion_correctora,
        foto_evidencia: reg.foto_evidencia,
        fecha_hora: reg.fecha_hora,
        id_usuario: reg.id_usuario,
        estado: reg.estado
      };
    });

    // 🔥 PASO 6: Filtrar por categoría si es necesario
    let resultado = incidencias;
    if (categoria && categoria !== 'todas') {
      resultado = incidencias.filter(inc => {
        const pcc = pccMap.get(inc.id_pcc);
        return pcc?.categoria_id === categoria;
      });
    }

    console.log('✅ Incidencias encontradas:', resultado.length);
    return NextResponse.json(resultado);

  } catch (error: any) {
    console.error('❌ Error obteniendo incidencias:', error);
    return NextResponse.json({ 
      error: error.message,
      details: error.hint || error.details 
    }, { status: 500 });
  }
}
