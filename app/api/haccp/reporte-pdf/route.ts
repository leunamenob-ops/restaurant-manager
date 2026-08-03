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

    // Fallback para categorías
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

    // Generar HTML mejorado
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
      padding: 40px; 
      color: #1e293b;
      background: #ffffff;
      line-height: 1.6;
    }
    
    .header { 
      text-align: center; 
      padding: 40px 20px;
      background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);
      color: white;
      border-radius: 12px;
      margin-bottom: 40px;
      box-shadow: 0 10px 30px rgba(8, 145, 178, 0.3);
    }
    .header h1 { 
      margin: 0; 
      font-size: 36px; 
      font-weight: 700;
      letter-spacing: 1px;
    }
    .header h2 { 
      margin: 10px 0; 
      font-size: 20px;
      font-weight: 400;
      opacity: 0.9;
    }
    .header p { 
      margin: 8px 0; 
      font-size: 15px;
      opacity: 0.85;
    }
    
    .stats-grid { 
      display: grid; 
      grid-template-columns: repeat(4, 1fr); 
      gap: 20px; 
      margin-bottom: 40px; 
    }
    .stat-card { 
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.08);
      border-top: 4px solid #0891b2;
      transition: transform 0.2s;
    }
    .stat-card:hover { transform: translateY(-5px); }
    .stat-card.ok { border-top-color: #16a34a; }
    .stat-card.nok { border-top-color: #dc2626; }
    .stat-card.warning { border-top-color: #eab308; }
    .stat-label { 
      font-size: 13px; 
      color: #64748b; 
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
    }
    .stat-value { 
      font-size: 42px; 
      font-weight: 700; 
      color: #0f172a;
      margin: 0;
    }
    .stat-card.ok .stat-value { color: #16a34a; }
    .stat-card.nok .stat-value { color: #dc2626; }
    
    .progress-container {
      margin-top: 15px;
      background: #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      height: 8px;
    }
    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #16a34a 0%, #22c55e 100%);
      transition: width 0.5s ease;
    }
    .progress-bar.warning {
      background: linear-gradient(90deg, #eab308 0%, #f59e0b 100%);
    }
    .progress-bar.danger {
      background: linear-gradient(90deg, #dc2626 0%, #ef4444 100%);
    }
    
    .category-section { 
      margin-bottom: 35px; 
      page-break-inside: avoid;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      overflow: hidden;
    }
    .cat-header { 
      background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);
      color: white;
      padding: 18px 25px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .cat-title { 
      font-size: 18px; 
      font-weight: 700;
      margin: 0;
    }
    .cat-stats {
      display: flex;
      gap: 15px;
      font-size: 14px;
    }
    .cat-stat {
      background: rgba(255,255,255,0.2);
      padding: 5px 12px;
      border-radius: 20px;
    }
    
    table { 
      width: 100%; 
      border-collapse: collapse;
      font-size: 13px;
    }
    th { 
      background: #f8fafc;
      text-align: left; 
      padding: 14px 20px; 
      color: #475569;
      text-transform: uppercase;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e2e8f0;
    }
    td { 
      padding: 14px 20px; 
      border-bottom: 1px solid #f1f5f9;
    }
    tr:hover { background: #f8fafc; }
    
    .badge {
      display: inline-block;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-ok { 
      background: #dcfce7; 
      color: #16a34a;
      border: 1px solid #86efac;
    }
    .badge-nok { 
      background: #fee2e2; 
      color: #dc2626;
      border: 1px solid #fca5a5;
    }
    
    .accion-box { 
      background: #fef2f2;
      border-left: 4px solid #dc2626;
      padding: 12px 16px;
      margin: 8px 20px;
      border-radius: 6px;
      font-size: 12px;
      color: #991b1b;
      font-style: italic;
    }
    .accion-box::before {
      content: '⚠️ ';
    }
    
    .incidencias-section {
      margin-top: 40px;
      page-break-inside: avoid;
    }
    .incidencias-header {
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      color: white;
      padding: 18px 25px;
      border-radius: 12px 12px 0 0;
      font-size: 18px;
      font-weight: 700;
    }
    .incidencia-item {
      background: #fef2f2;
      border-left: 4px solid #dc2626;
      padding: 18px 25px;
      margin-bottom: 12px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(220, 38, 38, 0.1);
    }
    .incidencia-title {
      font-size: 15px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 8px;
    }
    .incidencia-detail {
      font-size: 12px;
      color: #64748b;
      margin: 4px 0;
    }
    .incidencia-action {
      font-size: 12px;
      color: #dc2626;
      font-weight: 600;
      margin-top: 8px;
    }
    
    .footer { 
      margin-top: 60px; 
      text-align: center; 
      color: #94a3b8; 
      font-size: 12px;
      padding-top: 30px;
      border-top: 2px solid #e2e8f0;
    }
    
    @media print { 
      body { margin: 20px; padding: 20px; }
      .no-print { display: none !important; }
      .stat-card { box-shadow: none; border: 1px solid #e2e8f0; }
      .category-section { box-shadow: none; border: 1px solid #e2e8f0; }
    }
    
    .print-button {
      position: fixed;
      bottom: 30px;
      right: 30px;
      padding: 16px 32px;
      background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 8px 25px rgba(8, 145, 178, 0.4);
      transition: all 0.3s;
      z-index: 1000;
    }
    .print-button:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 35px rgba(8, 145, 178, 0.5);
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🛡️ KOST SOFTWARE</h1>
    <h2>Reporte de Control de Puntos Críticos (HACCP)</h2>
    <p>📅 Período: ${formatearFecha(inicio)} al ${formatearFecha(fin)}</p>
    <p> Generado: ${new Date().toLocaleString('es-ES')}</p>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">📊 Total Registros</div>
      <div class="stat-value">${totalRegistros}</div>
    </div>
    <div class="stat-card ok">
      <div class="stat-label">✅ Registros OK</div>
      <div class="stat-value">${totalOK}</div>
    </div>
    <div class="stat-card nok">
      <div class="stat-label">⚠️ Incidencias NO_OK</div>
      <div class="stat-value">${totalNOK}</div>
    </div>
    <div class="stat-card ${porcentajeCumplimiento >= 95 ? 'ok' : porcentajeCumplimiento >= 85 ? 'warning' : 'nok'}">
      <div class="stat-label">📈 % Cumplimiento</div>
      <div class="stat-value">${porcentajeCumplimiento}%</div>
      <div class="progress-container">
        <div class="progress-bar ${porcentajeCumplimiento >= 95 ? '' : porcentajeCumplimiento >= 85 ? 'warning' : 'danger'}" style="width: ${porcentajeCumplimiento}%"></div>
      </div>
    </div>
  </div>`;

    // Registros por categoría
    Object.keys(registrosPorCategoria).forEach(catNombre => {
      const catData = registrosPorCategoria[catNombre];
      const regs = catData.items;
      const catTotal = regs.length;
      const catOK = catData.ok;
      const catNOK = catData.nok;

      html += `
  <div class="category-section">
    <div class="cat-header">
      <h3 class="cat-title">📁 ${catNombre}</h3>
      <div class="cat-stats">
        <span class="cat-stat">📊 ${catTotal} registros</span>
        <span class="cat-stat" style="background: rgba(22, 163, 74, 0.3);">✅ ${catOK} OK</span>
        ${catNOK > 0 ? `<span class="cat-stat" style="background: rgba(220, 38, 38, 0.3);">️ ${catNOK} NO_OK</span>` : ''}
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 22%">🕐 Fecha / Hora</th>
          <th style="width: 35%">📍 Punto de Control</th>
          <th style="width: 15%">📏 Valor</th>
          <th style="width: 13%">✓ Estado</th>
          <th style="width: 15%">👤 Usuario</th>
        </tr>
      </thead>
      <tbody>`;

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
        <tr>
          <td colspan="5">
            <div class="accion-box">Acción Correctora: ${reg.accion_correctora}</div>
          </td>
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
  <div class="incidencias-section">
    <div class="incidencias-header">🚨 INCIDENCIAS DETECTADAS (${totalNOK})</div>`;

      const incidencias = registros?.filter((r: any) => r.estado === 'NO_OK') || [];
      incidencias.forEach((inc: any, index: number) => {
        html += `
    <div class="incidencia-item">
      <div class="incidencia-title">${index + 1}. ${inc.haccp_pcc?.nombre_pcc || 'PCC'}</div>
      <div class="incidencia-detail">📅 Fecha: ${formatearFechaHora(inc.fecha_hora)}</div>
      <div class="incidencia-detail"> Valor Registrado: ${inc.valor_medido || inc.temp_final || 'N/A'} ${inc.unidad || ''}</div>
      <div class="incidencia-action">🔧 Acción Correctora: ${inc.accion_correctora || 'No documentada'}</div>
    </div>`;
      });

      html += `</div>`;
    }

    html += `
  <div class="footer">
    <p>________________________________________</p>
    <p><strong>KOST Software</strong> - Sistema de Gestión HACCP para Hostelería</p>
    <p style="margin-top: 10px; font-size: 11px;">© ${new Date().getFullYear()} Todos los derechos reservados</p>
  </div>

  <button class="print-button no-print" onclick="window.print()">
    📄 Imprimir / Guardar PDF
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
