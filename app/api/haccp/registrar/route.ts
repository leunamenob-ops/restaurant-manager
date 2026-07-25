import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const body = await request.json();
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

    // 1. Obtener la configuración del PCC para validar
    const { data: pccInfo, error: pccError } = await supabase
      .from('haccp_pcc')
      .select('*')
      .eq('id_pcc', id_pcc)
      .single();

    if (pccError || !pccInfo) {
      return NextResponse.json({ error: 'PCC no encontrado' }, { status: 404 });
    }

    // 2. Determinar si es OK o NO_OK
    let estado = 'OK';
    let accionAutomática = '';

    if (pccInfo.tipo_control === 'NUMERICO') {
      const val = parseFloat(valor_medido);
      if (val < pccInfo.limite_min || val > pccInfo.limite_max) {
        estado = 'NO_OK';
        accionAutomática = `Temperatura/Valor fuera de rango (${pccInfo.limite_min}-${pccInfo.limite_max}${pccInfo.unidad}). Revisar y corregir inmediatamente.`;
      }
    } else if (pccInfo.tipo_control === 'PROCESO') {
      const valFinal = parseFloat(temp_final);
      if (valFinal < pccInfo.limite_min || valFinal > pccInfo.limite_max) {
        estado = 'NO_OK';
        accionAutomática = `Proceso fuera de parámetros. Temperatura final ${valFinal}°C no está en rango ${pccInfo.limite_min}-${pccInfo.limite_max}°C.`;
      }
    } else if (pccInfo.tipo_control === 'CUALITATIVO') {
      if (cumple_si_no === 'NO') {
        estado = 'NO_OK';
        accionAutomática = 'No cumple con el estándar de limpieza/proceso. Acción correctiva requerida.';
      }
    }

    // 3. Guardar el registro en la base de datos
    const { data: registro, error: registroError } = await supabase
      .from('haccp_registros')
      .insert({
        id_pcc,
        id_usuario,
        hotel_id,
        valor_medido: valor_medido ? parseFloat(valor_medido) : null,
        unidad,
        temp_inicial: temp_inicial ? parseFloat(temp_inicial) : null,
        temp_final: temp_final ? parseFloat(temp_final) : null,
        tiempo_minutos: tiempo_minutos ? parseInt(tiempo_minutos) : null,
        cumple_si_no,
        estado,
        accion_correctora: estado === 'NO_OK' ? (accion_correctora || accionAutomática) : null,
        foto_evidencia: estado === 'NO_OK' ? foto_evidencia : null,
        notificado: estado === 'NO_OK' // Marcamos para que el admin sepa que requiere atención
      })
      .select()
      .single();

    if (registroError) {
      console.error('Error guardando registro:', registroError);
      return NextResponse.json({ error: 'Error al guardar el registro' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      estado,
      mensaje: estado === 'NO_OK' ? '⚠️ Registro guardado. Se ha generado una incidencia.' : '✅ Registro guardado correctamente.'
    });

  } catch (error: any) {
    console.error('Error en API registrar:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}