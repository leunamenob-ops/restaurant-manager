import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const usuarioId = searchParams.get('usuario') || 'cocinero001';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const ahora = new Date();
    const horaActual = ahora.getHours();
    const esTurnoManana = horaActual < 15;

    // Obtener todos los PCC activos
    const { data: pccData, error: pccError } = await supabase
      .from('haccp_pcc')
      .select('*')
      .eq('activo', true);

    if (pccError) throw pccError;

    // Obtener registros de hoy
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const finHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59);

    const { data: registrosHoy } = await supabase
      .from('haccp_registros')
      .select('id_pcc, fecha_hora')
      .gte('fecha_hora', inicioHoy.toISOString())
      .lte('fecha_hora', finHoy.toISOString());

    // Organizar registros por PCC y turno
    const registrosPorPCC: Record<string, { manana: boolean; tarde: boolean; horas: string[] }> = {};
    
    registrosHoy?.forEach(reg => {
      const fechaReg = new Date(reg.fecha_hora);
      const horaReg = fechaReg.getHours();
      const turno = horaReg < 15 ? 'manana' : 'tarde';
      const horaFormateada = fechaReg.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

      if (!registrosPorPCC[reg.id_pcc]) {
        registrosPorPCC[reg.id_pcc] = { manana: false, tarde: false, horas: [] };
      }
      registrosPorPCC[reg.id_pcc][turno] = true;
      registrosPorPCC[reg.id_pcc].horas.push(horaFormateada);
    });

    // Filtrar PCC pendientes según frecuencia y turno
    const pendientes = pccData?.filter(pcc => {
      const frecuencia = pcc.frecuencia?.toLowerCase() || '';
      const regHoy = registrosPorPCC[pcc.id_pcc];

      let debeMostrarse = false;

      if (frecuencia.includes('2 veces') || frecuencia.includes('2/día')) {
        debeMostrarse = esTurnoManana ? !regHoy?.manana : !regHoy?.tarde;
      } else if (frecuencia.includes('1 vez') || frecuencia.includes('diario')) {
        debeMostrarse = !regHoy || regHoy.horas.length === 0;
      } else if (frecuencia.includes('semana')) {
        const diaSemana = ahora.getDay();
        if (diaSemana === 1) {
          debeMostrarse = !regHoy || regHoy.horas.length === 0;
        }
      } else {
        debeMostrarse = true;
      }

      return debeMostrarse;
    }) || [];

    // Obtener completados
    const completados = Object.entries(registrosPorPCC).flatMap(([idPCC, data]) => {
      const pcc = pccData?.find(p => p.id_pcc === idPCC);
      return data.horas.map(hora => ({
        id: idPCC,
        nombre: pcc?.nombre_pcc || idPCC,
        hora
      }));
    });

    return NextResponse.json({ 
      pendientes, 
      completados,
      turno: esTurnoManana ? 'mañana' : 'tarde'
    });

  } catch (error: any) {
    console.error('Error en pcc-pendientes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
