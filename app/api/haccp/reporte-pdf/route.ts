import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inicio = searchParams.get('inicio');
    const fin = searchParams.get('fin');

    if (!inicio || !fin) {
      return NextResponse.json({ error: 'Fechas requeridas' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 🔥 CONSULTA SIMPLIFICADA: categoria_nombre ya viene en haccp_registros
    const { data: registros, error } = await supabase
      .from('haccp_registros')
      .select(`
        *,
        haccp_pcc (nombre_pcc),
        categoria_nombre
      `)
      .gte('fecha_hora', `${inicio}T00:00:00`)
      .lte('fecha_hora', `${fin}T23:59:59`)
      .order('fecha_hora', { ascending: false });

    if (error) throw error;

    // Organizar por categoría (ahora es super simple)
    const registrosPorCategoria: any = {};
    registros?.forEach((reg: any) => {
      const catNombre = reg.categoria_nombre || 'Sin Categoría';
      
      if (!registrosPorCategoria[catNombre]) {
        registrosPorCategoria[catNombre] = { items: [] };
      }
      
      registrosPorCategoria[catNombre].items.push({
        ...reg,
        nombre_pcc: reg.haccp_pcc?.nombre_pcc || 'Desconocido'
      });
    });

    const totalRegistros = registros?.length || 0;
    const totalOK = registros?.filter((r: any) => r.estado === 'OK').length || 0;
    const totalNOK = registros?.filter((r: any) => r.estado === 'NO_OK').length || 0;
    const porcentajeCumplimiento = totalRegistros > 0 ? Math.round((totalOK / totalRegistros) * 100) : 0;

    const formatearFecha = (f: string) => {
      const [y, m, d] = f.split('-');
      return `${d}/${m}/${y}`;
    };

    const formatearFechaHora = (f: string) => {
      return new Date(f).toLocaleString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    };

    // Generar HTML profesional
    let html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte HACCP ${inicio} - ${fin}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #334155; line-height: 1.6; }
    .header { text-align: center; border-bottom: 3px solid #0891b2; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #0891b2; margin: 0; font-size: 32px; font-weight: bold; }
    .header h2 { color: #0e7490; margin: 10px 0; font-size: 18px; }
    .header p { margin: 5px 0; color: #64748b; font-size: 14px; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 35px; }
    .stat { background: #f8fafc; border-left: 4px solid #0891b2; padding: 15px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .stat.ok { border-left-color: #16a34a; }
    .stat.nok { border-left-color: #dc2626; }
    .stat h3 { margin: 0; font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: 600; }
    .stat p { margin: 10px 0 0; font-size: 28px; font-weight: bold; color: #0f172a; }
    .stat.ok p { color: #16a34a; }
    .stat.nok p { color: #dc2626; }
    .category { margin-bottom: 30px; page-break-inside: avoid; }
    .cat-title { color: #0891b2; font-size: 18px; font-weight: bold; border-bottom: 2px solid #0891b2; padding-bottom: 8px; margin-bottom: 15px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #f1f5f9; text-align: left; padding: 10px 8px; border-bottom: 2px solid #0891b2; color: #475569; text-transform: uppercase; font-size: 11px; font-weight: 600; }
    td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; }
    tr:hover { background: #f8fafc; }
    .ok { color: #16a34a; font-weight: bold; }
    .nok { color: #dc2626; font-weight: bold; }
    .accion { background: #fef2f2; color: #991b1b; padding: 8px; margin-top: 4px; border-radius: 4px; font-size: 11px; border-left: 3px solid #dc2626; font-style: italic; }
    .footer { margin-top: 50px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
    @media print { body { margin: 20px; } .no-print { display: none; } }
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
    <div class="stat"><h3>Total Registros</h3><p>${totalRegistros}</p></div>
    <div class="stat ok"><h3>Registros OK</h3><p>${totalOK}</p></div>
    <div class="stat nok"><h3>Incidencias NO_OK</h3><p>${totalNOK}</p></div>
    <div class="stat"><h3>% Cumplimiento</h3><p style="color: ${porcentajeCumplimiento >= 95 ? '#16a34a' : porcentajeCumplimiento >= 85 ? '#eab308' : '#dc2626'}">${porcentajeCumplimiento}%</p></div>
  </div>`;

    // Registros por categoría
    Object.keys(registrosPorCategoria).forEach(catNombre => {
      const regs = registrosPorCategoria[catNombre].items;

      html += `
  <div class="category">
    <div class="cat-title">${catNombre}</div>
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
      <tbody>`;

      regs.forEach((reg: any) => {
        const estadoClass = reg.estado === 'OK' ? 'ok' : 'nok';
        html += `
        <tr>
          <td>${formatearFechaHora(reg.fecha_hora)}</td>
          <td style="font-weight: 500;">${reg.nombre_pcc}</td>
          <td>${reg.valor_medido || reg.temp_final || '-'} ${reg.unidad || ''}</td>
          <td class="${estadoClass}">${reg.estado}</td>
          <td>${reg.id_usuario}</td>
        </tr>`;

        if (reg.accion_correctora) {
          html += `
        <tr>
          <td colspan="5" class="accion">⚠️ Acción Correctora: ${reg.accion_correctora}</td>
        </tr>`;
        }
      });

      html += `
      </tbody>
    </table>
  </div>`;
    });

    // Incidencias destacadas
    if (totalNOK > 0) {
      html += `
  <div style="margin-top: 40px; page-break-inside: avoid;">
    <h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 8px; margin-bottom: 15px;">INCIDENCIAS DETECTADAS</h2>`;

      const incidencias = registros?.filter((r: any) => r.estado === 'NO_OK') || [];
      incidencias.forEach((inc: any, index: number) => {
        html += `
    <div style="margin-bottom: 15px; padding: 12px; background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">
      <strong style="font-size: 13px; color: #1e293b;">${index + 1}. ${inc.haccp_pcc?.nombre_pcc || 'PCC'}</strong><br>
      <span style="font-size: 11px; color: #64748b;">
        📅 Fecha: ${formatearFechaHora(inc.fecha_hora)} | 
        📊 Valor: ${inc.valor_medido || inc.temp_final || 'N/A'} ${inc.unidad || ''}
      </span><br>
      <span style="font-size: 11px; color: #dc2626; font-weight: 600;">
        🔧 Acción: ${inc.accion_correctora || 'No documentada'}
      </span>
    </div>`;
      });

      html += `</div>`;
    }

    html += `
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
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    });

  } catch (error: any) {
    console.error('❌ Error generando reporte:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
