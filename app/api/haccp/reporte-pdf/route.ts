import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    // 🔥 CONSULTA SIMPLIFICADA: Obtiene el nombre de la categoría directamente
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

    // Si el frontend filtra por categoría (usando el ID), lo aplicamos aquí
    if (categoria && categoria !== 'todas') {
      query = query.eq('haccp_pcc.categoria_id', categoria);
    }

    const { data: registros, error } = await query;
    if (error) throw error;

    // Organizar por categoría (ahora es mucho más simple y robusto)
    const registrosPorCategoria: any = {};
    
    registros?.forEach((reg: any) => {
      const pcc = reg.haccp_pcc || {};
      const catId = pcc.categoria_id || 'SIN_CATEGORIA';
      // Usamos el nombre directo de la nueva columna, con fallback seguro
      const catNombre = pcc.categoria_nombre || `Categoría ${catId}`;
      
      if (!registrosPorCategoria[catId]) {
        registrosPorCategoria[catId] = {
          nombre: catNombre,
          items: []
        };
      }
      
      registrosPorCategoria[catId].items.push({
        ...reg,
        nombre_pcc: pcc.nombre_pcc || 'Desconocido'
      });
    });

    // Calcular estadísticas
    const totalRegistros = registros?.length || 0;
    const totalOK = registros?.filter((r: any) => r.estado === 'OK').length || 0;
    const totalNOK = registros?.filter((r: any) => r.estado === 'NO_OK').length || 0;
    const porcentajeCumplimiento = totalRegistros > 0 ? Math.round((totalOK / totalRegistros) * 100) : 0;

    const formatearFecha = (fechaStr: string) => {
      const [year, month, day] = fechaStr.split('-');
      return `${day}/${month}/${year}`;
    };

    const formatearFechaHora = (fechaStr: string) => {
      const fecha = new Date(fechaStr);
      return fecha.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    // Generar HTML
    let htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte HACCP ${inicio} - ${fin}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #334155; }
    .header { text-align: center; border-bottom: 3px solid #0891b2; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #0891b2; margin: 0; font-size: 28px; font-weight: bold; }
    .header h2 { color: #0e7490; margin: 10px 0; font-size: 18px; }
    .header p { margin: 5px 0; color: #64748b; font-size: 14px; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
    .stat-box { background: #f8fafc; border-left: 4px solid #0891b2; padding: 15px; border-radius: 6px; }
    .stat-box.ok { border-left-color: #16a34a; }
    .stat-box.nok { border-left-color: #dc2626; }
    .stat-box h3 { margin: 0; font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: 600; }
    .stat-box p { margin: 10px 0 0; font-size: 26px; font-weight: bold; color: #0f172a; }
    .stat-box.ok p { color: #16a34a; }
    .stat-box.nok p { color: #dc2626; }
    .section { margin-bottom: 30px; page-break-inside: avoid; }
    .section-title { background: #0891b2; color: white; padding: 10px 15px; font-size: 15px; font-weight: bold; border-radius: 6px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px; }
    .category { margin-bottom: 25px; page-break-inside: avoid; }
    .category-title { color: #0891b2; font-size: 16px; font-weight: bold; border-bottom: 2px solid #0891b2; padding-bottom: 5px; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #f1f5f9; text-align: left; padding: 10px 8px; border-bottom: 2px solid #0891b2; color: #475569; text-transform: uppercase; font-size: 11px; }
    td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; }
    tr:hover { background: #f8fafc; }
    .estado-ok { color: #16a34a; font-weight: bold; }
    .estado-nok { color: #dc2626; font-weight: bold; }
    .accion { background: #fef2f2; color: #991b1b; padding: 8px; margin-top: 4px; border-radius: 4px; font-size: 11px; border-left: 3px solid #dc2626; font-style: italic; }
    .footer { margin-top: 50px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
    @media print {
      body { margin: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>KOST SOFTWARE</h1>
    <h2>Reporte de Control de Puntos Críticos (HACCP)</h2>
    <p>Período: ${formatearFecha(inicio)} al ${formatearFecha(fin)}</p>
    <p>Generado: ${new Date().toLocaleString('es-ES')}</p>
  </div>

  <div class="stats">
    <div class="stat-box">
      <h3>Total Registros</h3>
      <p>${totalRegistros}</p>
    </div>
    <div class="stat-box ok">
      <h3>Registros OK</h3>
      <p>${totalOK}</p>
    </div>
    <div class="stat-box nok">
      <h3>Incidencias NO_OK</h3>
      <p>${totalNOK}</p>
    </div>
    <div class="stat-box">
      <h3>% Cumplimiento</h3>
      <p style="color: ${porcentajeCumplimiento >= 95 ? '#16a34a' : porcentajeCumplimiento >= 85 ? '#eab308' : '#dc2626'}">${porcentajeCumplimiento}%</p>
    </div>
  </div>
    `;

    // Registros por categoría (usando el nombre directo)
    Object.keys(registrosPorCategoria).forEach(catId => {
      const catData = registrosPorCategoria[catId];
      const catNombre = catData.nombre; // ¡Aquí está la magia! Ya no usamos el ID
      const regs = catData.items;

      htmlContent += `
  <div class="category">
    <div class="category-title">${catNombre}</div>
    <table>
      <thead>
        <tr>
          <th style="width: 22%">Fecha / Hora</th>
          <th style="width: 35%">Punto de Control</th>
          <th style="width: 15%">Valor</th>
          <th style="width: 13%">Estado</th>
          <th style="width: 15%">Usuario</th>
        </tr>
      </thead>
      <tbody>
      `;

      regs.forEach((reg: any) => {
        const estadoClass = reg.estado === 'OK' ? 'estado-ok' : 'estado-nok';
        htmlContent += `
        <tr>
          <td>${formatearFechaHora(reg.fecha_hora)}</td>
          <td style="font-weight: 500;">${reg.nombre_pcc}</td>
          <td>${reg.valor_medido || reg.temp_final || '-'} ${reg.unidad || ''}</td>
          <td class="${estadoClass}">${reg.estado}</td>
          <td>${reg.id_usuario}</td>
        </tr>`;

        if (reg.accion_correctora) {
          htmlContent += `
        <tr>
          <td colspan="5" class="accion">⚠️ Acción Correctora: ${reg.accion_correctora}</td>
        </tr>`;
        }
      });

      htmlContent += `
      </tbody>
    </table>
  </div>
      `;
    });

    // Incidencias destacadas
    if (totalNOK > 0) {
      htmlContent += `
  <div class="section">
    <div class="section-title" style="background: #dc2626;">Incidentes Detectados</div>
      `;

      const incidencias = registros?.filter((r: any) => r.estado === 'NO_OK') || [];
      incidencias.forEach((inc: any, index: number) => {
        const pcc = inc.haccp_pcc || {};
        htmlContent += `
    <div style="margin-bottom: 15px; padding: 12px; background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">
      <strong style="font-size: 13px; color: #1e293b;">${index + 1}. ${pcc.nombre_pcc || inc.id_pcc}</strong><br>
      <span style="font-size: 11px; color: #64748b;">
        📅 Fecha: ${formatearFechaHora(inc.fecha_hora)} | 
        📊 Valor: ${inc.valor_medido || inc.temp_final || 'N/A'} ${inc.unidad || ''}
      </span><br>
      <span style="font-size: 11px; color: #dc2626; font-weight: 600;">
        🔧 Acción: ${inc.accion_correctora || 'No documentada'}
      </span>
    </div>
        `;
      });

      htmlContent += `</div>`;
    }

    htmlContent += `
  <div class="footer">
    <p>________________________________________</p>
    <p>Reporte generado automáticamente por KOST Software</p>
    <p>Sistema de Gestión HACCP para Hostelería</p>
    <p style="margin-top: 5px; font-size: 9px;">© ${new Date().getFullYear()} Todos los derechos reservados</p>
  </div>

  <button class="no-print" onclick="window.print()" style="position: fixed; bottom: 30px; right: 30px; padding: 15px 30px; background: #0891b2; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(8, 145, 178, 0.3); transition: all 0.2s;" onmouseover="this.style.background='#0e7490'" onmouseout="this.style.background='#0891b2'">
    📄 Imprimir / Guardar como PDF
  </button>

  <script>
    setTimeout(() => {
      if (confirm('¿Deseas imprimir o guardar este reporte como PDF?')) {
        window.print();
      }
    }, 800);
  </script>
</body>
</html>
    `;

    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    });

  } catch (error: any) {
    console.error('❌ Error generando reporte:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
