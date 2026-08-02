import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('📥 Datos recibidos:', body);

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

    // 1. Obtener info del PCC
    const { data: pccInfo, error: pccError } = await supabase
      .from('haccp_pcc')
      .select('*')
      .eq('id_pcc', id_pcc)
      .single();

    if (pccError || !pccInfo) {
      console.error('❌ PCC no encontrado:', pccError);
      return NextResponse.json({ error: 'PCC no encontrado' }, { status: 404 });
    }

    // 2. Determinar estado OK / NO_OK
    let estado = 'OK';
    let accionAutomatica = '';

    if (pccInfo.tipo_control === 'NUMERICO' && valor_medido) {
      const val = parseFloat(valor_medido);
      const min = parseFloat(pccInfo.limite_min || '0');
      const max = parseFloat(pccInfo.limite_max || '100');

      if (val < min || val > max) {
        estado = 'NO_OK';
        accionAutomatica = `Valor ${val}${pccInfo.unidad || ''} fuera de rango (${min}-${max}).`;
      }
    } else if (pccInfo.tipo_control === 'CUALITATIVO' && cumple_si_no === 'NO') {
      estado = 'NO_OK';
      accionAutomatica = 'No cumple con el estándar. Acción correctiva requerida.';
    }

    // 3. Preparar datos (USANDO 'cocinero001' COMO FALLBACK SEGURO)
    const registroData: any = {
      id_pcc,
      id_usuario: id_usuario || 'cocinero001', // <-- CAMBIO CLAVE AQUÍ
      hotel_id: hotel_id || '00000000-0000-0000-0000-000000000001',
      valor_medido: valor_medido ? parseFloat(valor_medido) : null,
      unidad: unidad || pccInfo.unidad,
      cumple_si_no: cumple_si_no || 'SÍ',
      estado,
      notificado: estado === 'NO_OK'
    };

    if (estado === 'NO_OK') {
      registroData.accion_correctora = accion_correctora || accionAutomatica;
      if (foto_evidencia) registroData.foto_evidencia = foto_evidencia;
    }

    console.log('💾 Intentando insertar:', registroData);

    // 4. Insertar en la base de datos
    const { data: registro, error: insertError } = await supabase
      .from('haccp_registros')
      .insert(registroData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ ERROR DE SUPABASE AL INSERTAR:', insertError);
      // Devolvemos el error detallado para que lo veas en el navegador
      return NextResponse.json({ 
        error: 'Error al guardar el registro',
        details: insertError.message,
        hint: insertError.hint
      }, { status: 500 });
    }

    console.log('✅ Registro guardado con éxito:', registro);

    return NextResponse.json({ 
      success: true, 
      estado,
      mensaje: estado === 'NO_OK' ? '⚠️ Registro guardado. Incidencia generada.' : '✅ Registro guardado correctamente.'
    });

  } catch (error: any) {
    console.error('❌ Error general en API:', error);
    return NextResponse.json({ 
      error: 'Error interno',
      details: error.message 
    }, { status: 500 });
  }
}
