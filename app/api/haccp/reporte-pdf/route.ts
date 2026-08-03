import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inicio = searchParams.get('inicio');
    const fin = searchParams.get('fin');
    const modo = searchParams.get('modo') || 'compacto';

    if (!inicio || !fin) {
      return NextResponse.json({ error: 'Fechas requeridas' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Obtener registros con PCC
    const { data: registros, error } = await supabase
      .from('haccp_registros')
      .select(`
        *,
        haccp_pcc (
          nombre_pcc,
          categoria_id
        )
      `)
      .gte('fecha_hora', `${inicio}T00:00:00`)
      .lte('fecha_hora', `${fin}T23:59:59`)
      .order('fecha_hora', { ascending: false });

    if (error) throw error;

    // Obtener categorías para mapear
    const { data: categorias } = await supabase
      .from('haccp_categorias')
      .select('id, nombre');

    const categoriasMap: Record<string, string> = {};
    categorias?.forEach(c => {
      categoriasMap[c.id] = c.nombre;
    });

    // Fallback por si acaso
    const CATEGORIAS_FALLBACK: Record<string, string> = {
      'CAT_01': 'Refrigeración',
      'CAT_02': 'Cocción',
      'CAT_03': 'Limpieza',
      'CAT_04': 'Recepción',
      'CAT_05': 'Almacenamiento',
    };

    // Organizar por categoría usando categoria_id de haccp_pcc
    const registrosPorCategoria: any = {};
    registros?.forEach((reg: any) => {
      const pcc = reg.haccp_pcc || {};
      const catId = pcc.categoria_id;
      
      // Intentar obtener el nombre del mapa, si no usar fallback
      let catNombre = categoriasMap[catId] || CATEGORIAS_FALLBACK[catId] || catId || 'Sin Categoría';
      
      if (!registrosPorCategoria[catNombre]) {
        registrosPorCategoria[catNombre] = { items: [], ok: 0, nok: 0 };
      }
      
      registrosPorCategoria[catNombre].items.push({
        ...reg,
        nombre_pcc: pcc.nombre_pcc || 'Desconocido'
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
  <title>Reporte HACCP ${inicio} - ${fin}</title>
  <style>
    * { box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      margin: 0; 
      padding: 20px; 
      color: #1e293b;
      background: #ffffff;
      line-height: 1.5;
      font-size: 10px;
    }
    
    .header { 
      text-align: center; 
      padding: 15px 20px;
      background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);
      color: white;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
    .header h2 { margin: 8px 0; font-size: 14px; font-weight: 400; }
    .header p { margin: 5px 0; font-size: 11px; }
    
    .kpi-grid { 
      display: grid; 
      grid-template-columns: repeat(5, 1fr); 
      gap: 10px; 
      margin-bottom: 20px; 
    }
    .kpi-card { 
      background: #f8fafc;
      padding: 12px;
      border-radius: 6px;
      border-left: 3px solid #0891b2;
    }
    .kpi-card.ok { border-left-color: #16a34a; }
    .kpi-card.nok { border-left-color: #dc2626; }
    .kpi-label { font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 5px; }
    .kpi-value { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0; }
    .kpi-card.ok .kpi-value { color: #16a34a; }
    .kpi-card.nok .kpi-value { color: #dc2626; }
    .kpi-sub { font-size: 8px; color: #94a3b8; margin-top: 3px; }
    
    .categoria-seccion {
      margin-bottom: 20px;
      page-break-inside: avoid;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    .cat-header {
      background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);
      color: white;
      padding: 10px 15px;
      font-size: 13px;
      font-weight: 700;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .cat-stats { display: flex; gap: 10px; font-size: 11px; }
    .cat-stat { background: rgba(255,255,255,0.2); padding: 3px 8px; border-radius: 12px; }
    
    .tabla-categoria {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
    }
    .tabla-categoria th {
      background: #f8fafc;
      padding: 8px 10px;
      text-align: left;
      font-size: 9px;
      color: #64748b;
      text-transform: uppercase;
      border-bottom: 2px solid #e2e8f0;
    }
    .tabla-categoria td {
      padding: 8px 10px;
      border-bottom: 1px solid #f1f5f9;
    }
    .tabla-categoria tr:hover { background: #f8fafc; }
    
    .accion-row td {
      background: #fef2f2 !important;
      padding: 6px 10px !important;
      border-left: 3px solid #dc2626;
      font-size: 9px;
      color: #991b1b;
      font-style: italic;
    }
    
    .badge { display: inline-block; padding: 2px 6px; border-radius: 12px; font-size: 9px; font-weight: 700; }
    .badge-ok { background: #dcfce7; color: #16a34a; }
    .badge-nok { background: #fee2e2; color: #dc2626; }
    
    .incidencias-section { margin-top: 20px; page-break-inside: avoid; }
    .incidencias-header {
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      color: white;
      padding: 10px 15px;
      border-radius: 6px 6px 0 0;
      font-size: 13px;
      font-weight: 700;
    }
    .incidencia-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      padding: 12px;
      background: #fef2f2;
      border-radius: 0 0 6px 6px;
    }
    .incidencia-card {
      background: white;
      padding: 8px 10px;
      border-radius: 4px;
      border-left: 3px solid #dc2626;
    }
    .incidencia-title { font-size: 11px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
    .incidencia-meta { font-size: 9px; color: #64748b; margin: 2px 0; }
    .incidencia-action { font-size: 9px; color: #dc2626; font-weight: 600; margin-top: 4px; }
    
    .footer { margin-top: 30px; text-align: center; color: #94a3b8; font-size: 9px; padding-top: 15px; border-top: 1px solid #e2e8f0; }
    
    .print-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(8, 145, 178, 0.3);
    }
    
    @media print {
      body { margin: 10px; padding: 10px; }
      .print-btn { display: none; }
      .categoria-seccion { box-shadow: none; border: 1px solid #e2e8f0; }
      @page { margin: 1cm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🛡️ KOST SOFTWARE</h1>
    <h2>Reporte HACCP - Control de Puntos Críticos</h2>
    <p>📅 Período: ${formatearFecha(inicio)} al ${formatearFecha(fin)} (${dias} días)</p>
    <p>📊 Promedio diario: ${promedioDiario} registros</p>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">📊 Total Registros</div>
      <div class="kpi-value">${totalRegistros}</div>
      <div class="kpi-sub">${promedioDiario}/día</div>
    </div>
    <div class="kpi-card ok">
      <div class="kpi-label">✅ Registros OK</div>
      <div class="kpi-value">${totalOK}</div>
    </div>
    <div class="kpi-card nok">
      <div class="kpi-label">⚠️ Incidencias</div>
      <div class="kpi-value">${totalNOK}</div>
    </div>
    <div class="kpi-card ${porcentajeCumplimiento >= 95 ? 'ok' : 'nok'}">
      <div class="kpi-label">📈 Cumplimiento</div>
      <div class="kpi-value">${porcentajeCumplimiento}%</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">📅 Días</div>
      <div class="kpi-value">${dias}</div>
    </div>
  </div>

  ${Object.keys(registrosPorCategoria).map(catNombre => {
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
        <span class="cat-stat">📊 ${catTotal}</span>
        <span class="cat-stat" style="background: rgba(22, 163, 74, 0.3);">✅ ${catOK}</span>
        ${catNOK > 0 ? `<span class="cat-stat" style="background: rgba(220, 38, 38, 0.3);">⚠️ ${catNOK}</span>` : ''}
      </div>
    </div>
    <table class="tabla-categoria">
      <thead>
        <tr>
          <th style="width: 25%">🕐 Fecha/Hora</th>
          <th style="width: 35%">📍 Punto de Control</th>
          <th style="width: 15%">📏 Valor</th>
          <th style="width: 12%">✓ Estado</th>
          <th style="width: 13%">👤 Usuario</th>
        </tr>
      </thead>
      <tbody>`;
  }).join('')}

  ${(() => {
    let html = '';
    let currentCat = '';
    
    Object.keys(registrosPorCategoria).forEach(catNombre => {
      const regs = registrosPorCategoria[catNombre].items;
      currentCat = catNombre;
      
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
      
      html += `
      </tbody>
    </table>
  </div>`;
    });
    
    return html;
  })()}

  ${totalNOK > 0 ? `
  <div class="incidencias-section">
    <div class="incidencias-header">🚨 INCIDENCIAS DETECTADAS (${totalNOK})</div>
    <div class="incidencia-grid">` : ''}

  ${totalNOK > 0 ? registros?.filter((r: any) => r.estado === 'NO_OK').map((inc: any, index: number) => {
    return `
      <div class="incidencia-card">
        <div class="incidencia-title">${index + 1}. ${inc.haccp_pcc?.nombre_pcc || 'PCC'}</div>
        <div class="incidencia-meta"> ${formatearFechaHora(inc.fecha_hora)}</div>
        <div class="incidencia-meta">📏 Valor: ${inc.valor_medido || inc.temp_final || 'N/A'} ${inc.unidad || ''}</div>
        <div class="incidencia-action">🔧 ${inc.accion_correctora || 'Sin acción documentada'}</div>
      </div>`;
  }).join('') : ''}

  ${totalNOK > 0 ? `</div></div>` : ''}

  <div class="footer">
    <p><strong>KOST Software</strong> - Sistema de Gestión HACCP para Hostelería</p>
    <p style="margin-top: 5px;">© ${new Date().getFullYear()} | Total: ${totalRegistros} registros | ${totalOK} OK | ${totalNOK} NO_OK | ${porcentajeCumplimiento}% cumplimiento</p>
  </div>

  <button class="print-btn" onclick="window.print()">📄 Imprimir / Guardar PDF</button>

  <script>
    setTimeout(() => { if (confirm('¿Deseas imprimir o guardar este reporte como PDF?')) { window.print(); } }, 500);
  </script>
</body>
</html>`;

    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

  } catch (error: any) {
    console.error('❌ Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
