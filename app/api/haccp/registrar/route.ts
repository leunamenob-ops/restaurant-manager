import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    console.log('📥 Request recibido en /api/haccp/registrar');
    
    const body = await request.json();
    console.log('📋 Datos recibidos:', JSON.stringify(body, null, 2));

    const {
      id_pcc,
      id_usuario,
      hotel_id,
      valor_medido,
      unidad,
      temp_inicial,
      temp_final,
      tiempo_minutos,
      cumple_si_no,
      accion_correctora,
      foto_evidencia
    } = body;

    // Validar datos requeridos
    if (!id_pcc) {
      console.error('❌ Falta id_pcc');
      return NextResponse.json({ error: 'Falta el ID del PCC' }, { status: 400 });
    }

    // Conectar a Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('🔑 Supabase URL:', supabaseUrl ? '✓ Configurada' : '✗ FALTANTE');
    console.log('🔑 Supabase Key:', supabaseKey ? '✓ Configurada' : '✗ FALTANTE');

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ 
        error: 'Configuración de Supabase incompleta',
        details: 'Faltan variables de entorno'
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Obtener la configuración del PCC
    console.log('🔍 Buscando PCC:', id_pcc);
    const { data: pccInfo, error: pccError } = await supabase
      .from('haccp_pcc')
      .select('*')
      .eq('id_pcc', id_pcc)
      .single();

    if (pccError) {
      console.error('❌ Error buscando PCC:', pccError);
      return NextResponse.json({ 
        error: 'PCC no encontrado',
        details: pccError.message 
      }, { status: 404 });
    }

    if (!pccInfo) {
      console.error('❌ PCC no existe:', id_pcc);
      return NextResponse.json({ error: 'PCC no encontrado' }, { status: 404 });
    }

    console.log('✅ PCC encontrado:', pccInfo.nombre_pcc);

    // 2. Determinar si es OK o NO_OK
    let estado = 'OK';
    let accionAutomatica = '';

    if (pccInfo.tipo_control === 'NUMERICO' || pccInfo.tipo_control === 'PROCESO') {
      const val = parseFloat(valor_medido || '0');
      const limiteMin = parseFloat(pccInfo.limite_min || '0');
      const limiteMax = parseFloat(pccInfo.limite_max || '100');
      
      console.log(`📊 Validando: ${val} está entre ${limiteMin} y ${limiteMax}`);
      
      if (val < limiteMin || val > limiteMax) {
        estado = 'NO_OK';
        accionAutomatica = `Valor ${val}${pccInfo.unidad || ''} fuera de rango (${limiteMin}-${limiteMax}${pccInfo.unidad || ''}). Acción correctiva requerida.`;
        console.log('️ Estado: NO_OK - Fuera de rango');
      } else {
        console.log('✅ Estado: OK - Dentro de rango');
      }
    } else if (pccInfo.tipo_control === 'CUALITATIVO') {
      if (cumple_si_no === 'NO') {
        estado = 'NO_OK';
        accionAutomatica = 'No cumple con el estándar. Acción correctiva requerida.';
        console.log('⚠️ Estado: NO_OK - Control cualitativo fallido');
      }
    }

    // 3. Preparar datos para insertar
    const registroData: any = {
      id_pcc,
      id_usuario: id_usuario || 'operario',
      hotel_id: hotel_id || '00000000-0000-0000-0000-000000000001',
      unidad: unidad || pccInfo.unidad,
      cumple_si_no: cumple_si_no || 'SÍ',
      estado,
      notificado: estado === 'NO_OK'
    };

    // Añadir campos numéricos si existen
    if (valor_medido) registroData.valor_medido = parseFloat(valor_medido);
    if (temp_inicial) registroData.temp_inicial = parseFloat(temp_inicial);
    if (temp_final) registroData.temp_final = parseFloat(temp_final);
    if (tiempo_minutos) registroData.tiempo_minutos = parseInt(tiempo_minutos);
    
    // Añadir acción correctora si es NO_OK
    if (estado === 'NO_OK') {
      registroData.accion_correctora = accion_correctora || accionAutomatica;
      if (foto_evidencia) registroData.foto_evidencia = foto_evidencia;
    }

    console.log('💾 Datos a insertar:', JSON.stringify(registroData, null, 2));

    // 4. Insertar en la base de datos
    const { data: registro, error: insertError } = await supabase
      .from('haccp_registros')
      .insert(registroData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error insertando registro:', insertError);
      console.error('Detalles:', JSON.stringify(insertError, null, 2));
      return NextResponse.json({ 
        error: 'Error al guardar el registro',
        details: insertError.message 
      }, { status: 500 });
    }

    console.log('✅ Registro guardado exitosamente:', registro);

    return NextResponse.json({ 
      success: true, 
      estado,
      mensaje: estado === 'NO_OK' 
        ? '⚠️ Registro guardado. Se ha generado una incidencia.' 
        : '✅ Registro guardado correctamente.',
      registro
    });

  } catch (error: any) {
    console.error('❌ Error general en API registrar:', error);
    console.error('Stack trace:', error.stack);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
