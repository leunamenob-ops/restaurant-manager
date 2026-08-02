import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    console.log(' Recibiendo request en /api/haccp/registrar');
    
    const body = await request.json();
    console.log('📋 Datos:', body);

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

    // Validar datos mínimos requeridos
    if (!id_pcc) {
      console.error('❌ Falta id_pcc');
      return NextResponse.json({ error: 'Falta el ID del PCC' }, { status: 400 });
    }

    // Obtener variables de entorno
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log(' URL:', supabaseUrl ? '✓' : '✗ FALTANTE');
    console.log('🔑 Key:', supabaseKey ? '✓' : '✗ FALTANTE');

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ 
        error: 'Configuración incompleta',
        url: !!supabaseUrl,
        key: !!supabaseKey
      }, { status: 500 });
    }

    // Crear cliente
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obtener info del PCC
    console.log('🔍 Buscando PCC:', id_pcc);
    const { data: pccInfo, error: pccError } = await supabase
      .from('haccp_pcc')
      .select('*')
      .eq('id_pcc', id_pcc)
      .single();

    if (pccError || !pccInfo) {
      console.error('❌ Error PCC:', pccError);
      return NextResponse.json({ 
        error: 'PCC no encontrado',
        details: pccError?.message 
      }, { status: 404 });
    }

    console.log('✅ PCC encontrado:', pccInfo.nombre_pcc);

    // Determinar estado OK/NO_OK
    let estado = 'OK';
    let accionAuto = '';

    if (pccInfo.tipo_control === 'NUMERICO' && valor_medido) {
      const val = parseFloat(valor_medido);
      const min = parseFloat(pccInfo.limite_min || '0');
      const max = parseFloat(pccInfo.limite_max || '100');

      console.log(`📊 Validando: ${val} entre ${min} y ${max}`);

      if (val < min || val > max) {
        estado = 'NO_OK';
        accionAuto = `Valor ${val}${pccInfo.unidad || ''} fuera de rango (${min}-${max})`;
        console.log('⚠️ Estado: NO_OK');
      }
    }

    // Preparar datos
    const registroData: any = {
      id_pcc,
      id_usuario: id_usuario || 'operario',
      hotel_id: hotel_id || '00000000-0000-0000-0000-000000000001',
      valor_medido: valor_medido ? parseFloat(valor_medido) : null,
      unidad: unidad || pccInfo.unidad,
      cumple_si_no: cumple_si_no || 'SÍ',
      estado,
      notificado: estado === 'NO_OK'
    };

    // Añadir acción correctora si es NO_OK
    if (estado === 'NO_OK') {
      registroData.accion_correctora = accion_correctora || accionAuto;
      if (foto_evidencia) registroData.foto_evidencia = foto_evidencia;
    }

    console.log('💾 Insertando:', registroData);

    // Insertar registro
    const { data: registro, error: insertError } = await supabase
      .from('haccp_registros')
      .insert(registroData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error insertando:', insertError);
      console.error('Detalles:', JSON.stringify(insertError, null, 2));
      return NextResponse.json({ 
        error: 'Error al guardar',
        details: insertError.message,
        hint: insertError.hint
      }, { status: 500 });
    }

    console.log('✅ Registro guardado:', registro);

    return NextResponse.json({ 
      success: true, 
      estado,
      mensaje: estado === 'NO_OK' 
        ? '️ Registro guardado. Incidencia generada.' 
        : '✅ Registro guardado correctamente.',
      registro
    });

  } catch (error: any) {
    console.error('❌ Error general:', error);
    console.error('Stack:', error.stack);
    return NextResponse.json({ 
      error: 'Error interno',
      details: error.message
    }, { status: 500 });
  }
}
