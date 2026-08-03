import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('📥 Datos recibidos para registro HACCP:', body);

    const {
      id_pcc,
      id_usuario,
      hotel_id,
      valor_medido,
      unidad,
      cumple_si_no,
      accion_correctora,
      foto_evidencia
    } = body;

    if (!id_pcc) {
      return NextResponse.json({ error: 'Falta el ID del PCC' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Obtener info del PCC para validar límites y unidad
    const { data: pccInfo, error: pccError } = await supabase
      .from('haccp_pcc')
      .select('id_pcc, nombre_pcc, categoria_id, tipo_control, limite_min, limite_max, unidad')
      .eq('id_pcc', id_pcc)
      .single();

    if (pccError || !pccInfo) {
      console.error('❌ PCC no encontrado:', pccError);
      return NextResponse.json({ error: 'PCC no encontrado en la base de datos' }, { status: 404 });
    }

    // 2. Determinar estado OK / NO_OK automáticamente
    let estado = 'OK';
    let accionAutomatica = '';

    if (pccInfo.tipo_control === 'NUMERICO' && valor_medido !== null && valor_medido !== undefined && valor_medido !== '') {
      const val = parseFloat(valor_medido);
      const min = pccInfo.limite_min !== null ? parseFloat(pccInfo.limite_min) : -Infinity;
      const max = pccInfo.limite_max !== null ? parseFloat(pccInfo.limite_max) : Infinity;

      if (val < min || val > max) {
        estado = 'NO_OK';
        accionAutomatica = `Valor ${val}${pccInfo.unidad || ''} fuera de rango permitido (${min}-${max}).`;
      }
    } else if (pccInfo.tipo_control === 'CUALITATIVO' && cumple_si_no === 'NO') {
      estado = 'NO_OK';
      accionAutomatica = 'No cumple con el estándar establecido. Acción correctiva requerida.';
    }

    // 3. Preparar datos para insertar
    // NOTA: Las columnas 'nombre_pcc' y 'categoria_nombre' se llenarán automáticamente 
    // gracias al trigger de Supabase que creamos, usando el 'id_pcc' que enviamos aquí.
    const registroData: any = {
      id_pcc, // <-- CLAVE para que el trigger de Supabase funcione
      id_usuario: id_usuario || 'B0003', // Fallback seguro
      hotel_id: hotel_id || '00000000-0000-0000-0000-000000000001',
      valor_medido: valor_medido !== '' && valor_medido !== null ? parseFloat(valor_medido) : null,
      unidad: unidad || pccInfo.unidad,
      cumple_si_no: cumple_si_no || 'SÍ',
      estado,
      notificado: estado === 'NO_OK'
    };

    // Si es NO_OK, aseguramos que haya una acción correctora registrada
    if (estado === 'NO_OK') {
      registroData.accion_correctora = accion_correctora || accionAutomatica;
      if (foto_evidencia) {
        registroData.foto_evidencia = foto_evidencia;
      }
    }

    console.log('💾 Intentando insertar registro:', registroData);

    // 4. Insertar en la base de datos
    const { data: registro, error: insertError } = await supabase
      .from('haccp_registros')
      .insert(registroData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ ERROR DE SUPABASE AL INSERTAR:', insertError);
      return NextResponse.json({ 
        error: 'Error al guardar el registro en la base de datos',
        details: insertError.message,
        hint: insertError.hint
      }, { status: 500 });
    }

    console.log('✅ Registro guardado con éxito:', registro);

    return NextResponse.json({ 
      success: true, 
      estado,
      mensaje: estado === 'NO_OK' 
        ? '⚠️ Registro guardado. Se ha generado una incidencia.' 
        : '✅ Registro guardado correctamente.'
    });

  } catch (error: any) {
    console.error('❌ Error general en API de registro HACCP:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error.message 
    }, { status: 500 });
  }
}
