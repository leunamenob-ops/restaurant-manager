import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inicio = searchParams.get('inicio');
    const fin = searchParams.get('fin');
    const modo = searchParams.get('modo') || 'ejecutivo';

    if (!inicio || !fin) {
      return NextResponse.json({ error: 'Fechas requeridas' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

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

    const CATEGORIAS_FALLBACK: Record<string, string> = {
      'CAT_01': 'Refrigeración',
      'CAT_02': 'Cocción',
      'CAT_03': 'Limpieza',
      'CAT_04': 'Recepción',
      'CAT_05': 'Almacenamiento',
    };

    // Organizar por categoría
    const registrosPorCategoria: any = {};
    registros?.forEach((reg: any) => {
      let catNombre = reg.categoria_nombre;
      if (!catNombre || catNombre.startsWith('CAT_')) {
        catNombre = CATEGORIAS_FALLBACK[catNombre] || catNombre || 'Sin Categoría';
      }
      
      if (!registrosPorCategoria[catNombre]) {
        registrosPorCategoria[catNombre] = { items: [], ok: 0, nok: 0 };
      }
      
      registrosPorCategoria[catNombre].items.push({
        ...reg,
        nombre_pcc: reg.haccp_pcc?.nombre_pcc || 'Desconocido'
      });
      
      if (reg.estado === 'OK') {
        registrosPorCategoria[catNombre].ok++;
      } else {
        registrosPorCategoria[catNombre].nok++;
      }
    });

    const totalRegistros = registros?.length || 0;
    const totalOK = registros?.filter((r: any) => r.estado === 'OK').length || 0;
    const totalNOK = registros?.filter((r: any) => r.estado === 'NO_OK').length || 0;
    const porcentajeCumplimiento = totalRegistros > 0 ? Math.round((totalOK / totalRegistros) * 100) : 0;

    const fechaInicio = new Date(inicio);
    const fechaFin = new Date(fin);
    const dias = Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const promedioDiario = dias > 0 ? Math.round(totalRegistros / dias) : 0;

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

    // Generar HTML
    let html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte HACCP ${modo === 'detallado' ? 'Detallado' : modo === 'compacto' ? 'Compacto' : 'Ejecutivo'} ${inicio} - ${fin}</title>
  <style>
    * { box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      margin: 0; 
      padding: ${modo === 'detallado' ? '20px' : '30px'}; 
      color: #1e293b;
      background: #ffffff;
      line-height: 1.5;
      font-size: ${modo === 'detallado' ? '10px' : '11px'};
    }
    
    .header { 
      text-align: center; 
      padding: ${modo === 'detallado' ? '15px' : '25px'} 20px;
      background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);
      color: white;
      border-radius: 8px;
      margin-bottom: 25px;
    }
    .header h1 { margin: 0; font-size: ${modo === 'detallado' ? '20px' : '28px'}; font-weight: 700; }
    .header h2 { margin: 8px 0; font-size: ${modo === 'detallado' ? '12px' : '16px'}; font-weight: 400; }
    .header p { margin: 5px 0; font-size: ${modo === 'detallado' ? '10px' : '13px'}; }
    
    .kpi-grid { 
      display: grid; 
      grid-template-columns: repeat(5, 1fr); 
      gap: 12px; 
      margin-bottom: 25px; 
    }
    .kpi-card { 
      background: #f8fafc;
      padding: 15px;
      border-radius: 8px;
      border-left: 3px solid #0891b2;
    }
    .kpi-card.ok { border-left-color: #16a34a; }
    .kpi-card.nok { border-left-color: #dc2626; }
    .kpi-label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 5px; }
    .kpi-value { font-size: 28px; font-weight: 700; color: #0f172a; margin: 0; }
    .kpi-card.ok .kpi-value { color: #16a34a; }
    .kpi-card.nok .kpi-value { color: #dc2626; }
    .kpi-sub { font-size: 9px; color: #94a3b8; margin-top: 3px; }
    
    ${modo !== 'detallado' ? `
    .resumen-categorias {
      margin-bottom: 25px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      overflow: hidden;
    }
    .resumen-header {
      background: #f1f5f9;
      padding: 10px 15px;
      font-weight: 700;
      font-size: 12px;
      color: #475569;
      text-transform: uppercase;
    }
    .resumen-table { width: 100%; border-collapse: collapse; font-size: 11px; }
    .resumen-table th { background: #f8fafc; padding: 8px 12px; text-align: left; font-size: 10px; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
    .resumen-table td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
    .resumen-table tr:hover { background: #f8fafc; }
    ` : ''}
    
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; }
    .badge-ok { background: #dcfce7; color: #16a34a; }
    .badge-nok { background: #fee2e2; color: #dc2626; }
    
    .progress-mini { width: 60px; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; display: inline-block; vertical-align: middle; margin-left: 8px; }
    .progress-mini-bar { height: 100%; background: #16a34a; }
    .progress-mini-bar.warning { background: #eab308; }
    .progress-mini-bar.danger { background: #dc2626; }
    
    /* Sección por categoría con tabla propia */
    .categoria-seccion {
      margin-bottom: 20px;
      page-break-inside: avoid;
      ${modo === 'ejecutivo' ? 'display: none;' : ''}
    }
    .cat-header {
      background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);
      color: white;
      padding: 12px 18px;
      font-size: 14px;
      font-weight: 700;
      border-radius: 8px 8px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .cat-stats { display: flex; gap: 10px; font-size: 12px; }
    .cat-stat { background: rgba(255,255,255,0.2); padding: 3px 10px; border-radius: 12px; }
    
    .tabla-categoria {
      width: 100%;
      border-collapse: collapse;
      font-size: ${modo === 'detallado' ? '9px' : '11px'};
      background: white;
      border: 1px solid #e2e8f0;
      border-top: none;
    }
    .tabla-categoria th {
      background: #f8fafc;
      padding: ${modo === 'detallado' ? '6px' : '10px'} 12px;
      text-align: left;
      font-size: ${modo === 'detallado' ? '8px' : '10px'};
      color: #64748b;
      text-transform: uppercase;
      border-bottom: 2px solid #e2e8f0;
    }
    .tabla-categoria td {
      padding: ${modo === 'detallado' ? '6px' : '10px'} 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    .tabla-categoria tr:hover { background: #f8fafc; }
    
    .accion-row td {
      background: #fef2f2 !important;
      padding: ${modo === 'detallado' ? '4px 12px' : '8px 12px'} !important;
      border-left: 3px solid #dc2626;
      font-size: ${modo === 'detallado' ? '9px' : '11px'};
      color: #991b1b;
      font-style: italic;
    }
    
    .incidencias-section { margin-top: 25px; page-break-inside: avoid; }
    .incidencias-header {
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      color: white;
      padding: 12px 18px;
      border-radius: 8px 8px 0 0;
      font-size: 14px;
      font-weight: 700;
    }
    .incidencia-grid {
      display: grid;
      grid-template-columns: ${modo === 'detallado' ? '1fr' : 'repeat(2, 1fr)'};
      gap: 10px;
      padding: 15px;
      background: #fef2f2;
      border-radius: 0 0 8px 8px;
    }
    .incidencia-card {
      background: white;
      padding: 10px 12px;
      border-radius: 6px;
      border-left: 3px solid #dc2626;
      box-shadow: 0 1px 3px rgba(220, 38, 38, 0.1);
    }
    .incidencia-title { font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 5px; }
    .incidencia-meta { font-size: 10px; color: #64748b; margin: 2px 0; }
    .incidencia-action { font-size: 10px; color: #dc2626; font-weight: 600; margin-top: 5px; padding-top: 5px; border-top: 1px solid #fee2e2; }
    
    .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 10px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    
    .print-controls {
      position: fixed; bottom: 20px; right: 20px; background: white; padding: 15px; border-radius: 12px; box-shadow: 0 8px 25px rgba(0,0,0,0.15); z-index: 1000;
      ${modo === 'detallado' ? 'display: none;' : ''}
    }
    .print-controls h4 { margin: 0 0 10px 0; font-size: 12px; color: #475569; }
    .mode-btn { display: block; width: 100%; padding: 8px 12px; margin: 5px 0; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; font-size: 11px; text-align: left; transition: all 0.2s; }
    .mode-btn:hover { background: #e2e8f0; }
    .mode-btn.active { background: #0891b2; color: white; border-color: #0891b2; }
    .print-btn { width: 100%; padding: 10px; background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); color: white; border: none; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; margin-top: 10px; }
    
    @media print {
      body { margin: 15px; padding: 15px; }
      .no-print { display: none !important; }
      .kpi-card { box-shadow: none; border: 1px solid #e2e8f0; }
      ${modo !== 'detallado' ? '.resumen-categorias { box-shadow: none; border: 1px solid #e2e8f0; }' : ''}
      @page { margin: 1cm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>️ KOST SOFTWARE</h1>
    <h2>Reporte ${modo === 'detallado' ? 'Detallado' : modo === 'compacto' ? 'Compacto' : 'Ejecutivo'} HACCP</h2>
    <p>📅 Período: ${formatearFecha(inicio)} al ${formatearFecha(fin)} (${dias} días)</p>
    <p>📊 Promedio diario: ${promedioDiario} registros</p>
  </div>

  <!-- KPIs -->
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">📊 Total Registros</div>
      <div class="kpi-value">${totalRegistros}</div>
      <div class="kpi-sub">${promedioDiario}/día</div>
    </div>
    <div class="kpi-card ok">
      <div class="kpi-label">✅ Registros OK</div>
      <div class="kpi-value">${totalOK}</div>
      <div class="kpi-sub">${totalRegistros > 0 ? Math.round((totalOK/totalRegistros)*100) : 0}% del total</div>
    </div>
    <div class="kpi-card nok">
      <div class="kpi-label">⚠️ Incidencias</div>
      <div class="kpi-value">${totalNOK}</div>
      <div class="kpi-sub">${totalRegistros > 0 ? Math.round((totalNOK/totalRegistros)*100) : 0}% del total</div>
    </div>
    <div class="kpi-card ${porcentajeCumplimiento >= 95 ? 'ok' : porcentajeCumplimiento >= 85 ? '' : 'nok'}">
      <div class="kpi-label">📈 Cumplimiento</div>
      <div class="kpi-value">${porcentajeCumplimiento}%</div>
      <div class="kpi-sub">${porcentajeCumplimiento >= 95 ? '✅ Excelente' : porcentajeCumplimiento >= 85 ? '️ Aceptable' : '❌ Crítico'}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">📅 Días Analizados</div>
      <div class="kpi-value">${dias}</div>
      <div class="kpi-sub">${Object.keys(registrosPorCategoria).length} categorías</div>
    </div>
  </div>

  ${modo !== 'detallado' ? `
  <!-- Resumen por Categoría -->
  <div class="resumen-categorias">
    <div class="resumen-header">📊 Resumen por Categoría</div>
    <table class="resumen-table">
      <thead><tr><th>Categoría</th><th>Total</th><th>OK</th><th>NO_OK</th><th>Cumplimiento</th><th>Estado</th></tr></thead>
      <tbody>` : ''}

    ${modo !== 'detallado' ? Object.keys(registrosPorCategoria).map(catNombre => {
      const catData = registrosPorCategoria[catNombre];
      const catTotal = catData.items.length;
      const catOK = catData.ok;
      const catNOK = catData.nok;
      const catCumplimiento = catTotal > 0 ? Math.round((catOK/catTotal)*100) : 0;
      const estadoClass = catCumplimiento >= 95 ? 'badge-ok' : 'badge-nok';
      const progressClass = catCumplimiento >= 95 ? '' : catCumplimiento >= 85 ? 'warning' : 'danger';

      return `
        <tr>
          <td style="font-weight: 600;"> 📁 ${catNombre}</td>
          <td>${catTotal}</td>
          <td style="color: #16a34a; font-weight: 600;">${catOK}</td>
          <td style="color: #dc2626; font-weight: 600;">${catNOK}</td>
          <td>${catCumplimiento}%<div class="progress-mini"><div class="progress-mini-bar ${progressClass}" style="width: ${catCumplimiento}%"></div></div></td>
          <td><span class="badge ${estadoClass}">${catCumplimiento >= 95 ? 'OK' : 'REV'}</span></td>
        </tr>`;
    }).join('') : ''}

    ${modo !== 'detallado' ? `</tbody></table></div>` : ''}

  <!-- Registros Detallados por Categoría (Compacto y Detallado) -->
  ${modo !== 'ejecutivo' ? Object.keys(registrosPorCategoria).map(catNombre => {
    const catData = registrosPorCategoria[catNombre];
    const regs = catData.items;
    const catTotal = regs.length;
    const catOK = catData.ok;
    const catNOK = catData.nok;

    return `
  <div class="categoria-seccion">
    <div class="cat-header">
      <span>📁 ${catNombre}</span>
      <div class="cat-stats">
        <span class="cat-stat">📊 ${catTotal} registros</span>
        <span class="cat-stat" style="background: rgba(22, 163, 74, 0.3);">✅ ${catOK} OK</span>
        ${catNOK > 0 ? `<span class="cat-stat" style="background: rgba(220, 38, 38, 0.3);">⚠️ ${catNOK} NO_OK</span>` : ''}
      </div>
    </div>
    <table class="tabla-categoria">
      <thead>
        <tr>
          <th style="width: 22%">🕐 Fecha/Hora</th>
          <th style="width: 35%">📍 Punto de Control</th>
          <th style="width: 15%"> Valor</th>
          <th style="width: 13%">✓ Estado</th>
          <th style="width: 15%"> Usuario</th>
        </tr>
      </thead>
      <tbody>`;
  }).join('') : ''}

  ${modo !== 'ejecutivo' ? (() => {
    let html = '';
    Object.keys(registrosPorCategoria).forEach(catNombre => {
      const regs = registrosPorCategoria[catNombre].items;
      regs.forEach((reg: any) => {
        const badgeClass = reg.estado === 'OK' ? 'badge-ok' : 'badge-nok';
        html += `
        <tr>
          <td>${formatearFechaHora(reg.fecha_hora)}</td>
          <td style="font-weight: 600;">${reg.nombre_pcc}</td>
          <td>${reg.valor_medido || reg.temp_final || '-'} ${reg.unidad || ''}</td>
          <td><span class="badge ${badgeClass}">${reg.estado}</span></td>
          <td>${reg.id_usuario}</td>
        </tr>`;
        
        if (reg.accion_correctora) {
          html += `
        <tr class="accion-row">
          <td colspan="5">🔧 Acción Correctora: ${reg.accion_correctora}</td>
        </tr>`;
        }
      });
    });
    return html;
  })() : ''}

  ${modo !== 'ejecutivo' ? `
      </tbody>
    </table>
  </div>` : ''}

  ${Object.keys(registrosPorCategoria).map(() => '').join('</tbody></table></div>')}

  <!-- Incidencias Destacadas -->
  ${totalNOK > 0 ? `
  <div class="incidencias-section">
    <div class="incidencias-header">🚨 INCIDENCIAS DETECTADAS (${totalNOK})</div>
    <div class="incidencia-grid">` : ''}

  ${totalNOK > 0 ? registros?.filter((r: any) => r.estado === 'NO_OK').map((inc: any, index: number) => {
    return `
      <div class="incidencia-card">
        <div class="incidencia-title">${index + 1}. ${inc.haccp_pcc?.nombre_pcc || 'PCC'}</div>
        <div class="incidencia-meta">📅 ${formatearFechaHora(inc.fecha_hora)}</div>
        <div class="incidencia-meta">📏 Valor: ${inc.valor_medido || inc.temp_final || 'N/A'} ${inc.unidad || ''}</div>
        <div class="incidencia-action">🔧 ${inc.accion_correctora || 'Sin acción documentada'}</div>
      </div>`;
  }).join('') : ''}

  ${totalNOK > 0 ? `</div></div>` : ''}

  <div class="footer">
    <p><strong>KOST Software</strong> - Sistema de Gestión HACCP para Hostelería</p>
    <p style="margin-top: 5px;">© ${new Date().getFullYear()} | Reporte generado automáticamente</p>
    <p style="margin-top: 5px; font-size: 9px;">Total: ${totalRegistros} registros | ${totalOK} OK | ${totalNOK} NO_OK | ${porcentajeCumplimiento}% cumplimiento</p>
  </div>

  ${modo !== 'detallado' ? `
  <div class="print-controls no-print">
    <h4>🖨️ Opciones de Reporte</h4>
    <button class="mode-btn ${modo === 'ejecutivo' ? 'active' : ''}" onclick="window.location.href='?inicio=${inicio}&fin=${fin}&modo=ejecutivo'"> Ejecutivo (1-2 páginas)</button>
    <button class="mode-btn ${modo === 'compacto' ? 'active' : ''}" onclick="window.location.href='?inicio=${inicio}&fin=${fin}&modo=compacto'">📋 Compacto (Resumen + Registros)</button>
    <button class="mode-btn ${modo === 'detallado' ? 'active' : ''}" onclick="window.location.href='?inicio=${inicio}&fin=${fin}&modo=detallado'">📄 Detallado (Máximo detalle)</button>
    <button class="print-btn" onclick="window.print()">📄 Imprimir / Guardar PDF</button>
  </div>` : ''}

  <script>
    setTimeout(() => { if (confirm('¿Deseas imprimir o guardar este reporte como PDF?')) { window.print(); } }, 800);
  </script>
</body>
</html>`;

    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

  } catch (error: any) {
    console.error('❌ Error generando reporte:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
