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
      .select('*')
      .gte('fecha_hora', `${inicio}T00:00:00`)
      .lte('fecha_hora', `${fin}T23:59:59`)
      .order('fecha_hora', { ascending: true });

    if (error) throw error;

    if (!registros || registros.length === 0) {
      return new NextResponse('<h1>No hay registros en este período</h1>', { 
        headers: { 'Content-Type': 'text/html; charset=utf-8' } 
      });
    }

    const registrosPorCategoria: any = {};
    
    registros.forEach((reg: any) => {
      const catNombre = reg.categoria_nombre || 'Sin Categoría';
      const pccNombre = reg.nombre_pcc || 'PCC Desconocido';

      if (!registrosPorCategoria[catNombre]) {
        registrosPorCategoria[catNombre] = { items: [], ok: 0, nok: 0, pccs: {} };
      }

      if (!registrosPorCategoria[catNombre].pccs[pccNombre]) {
        registrosPorCategoria[catNombre].pccs[pccNombre] = [];
      }

      registrosPorCategoria[catNombre].pccs[pccNombre].push(reg);
      registrosPorCategoria[catNombre].items.push(reg);
      
      if (reg.estado === 'OK') registrosPorCategoria[catNombre].ok++;
      else registrosPorCategoria[catNombre].nok++;
    });

    const totalRegistros = registros.length;
    const totalOK = registros.filter(r => r.estado === 'OK').length;
    const totalNOK = registros.filter(r => r.estado === 'NO_OK').length;
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

    let html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte HACCP ${inicio} - ${fin} | KOST Software</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      margin: 0; 
      padding: 30px; 
      color: #1e293b;
      background: #ffffff;
      line-height: 1.6;
      font-size: 11px;
    }
    
    /* HEADER */
    .header { 
      background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);
      color: white;
      padding: 25px 30px;
      border-radius: 12px;
      margin-bottom: 25px;
      box-shadow: 0 4px 12px rgba(8, 145, 178, 0.2);
    }
    .header-top { 
      display: flex; 
      justify-content: space-between; 
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 15px;
      border-bottom: 1px solid rgba(255,255,255,0.2);
    }
    .logo { 
      font-size: 24px; 
      font-weight: 800; 
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .logo-sub { 
      font-size: 10px; 
      font-weight: 400; 
      opacity: 0.9;
      letter-spacing: 1px;
    }
    .header-title { 
      font-size: 22px; 
      font-weight: 700; 
      margin-bottom: 8px;
    }
    .header-info { 
      display: flex; 
      gap: 20px; 
      font-size: 11px; 
      opacity: 0.95;
    }
    .header-info span { 
      background: rgba(255,255,255,0.15);
      padding: 4px 10px;
      border-radius: 6px;
    }
    
    /* KPIs */
    .kpi-grid { 
      display: grid; 
      grid-template-columns: repeat(4, 1fr); 
      gap: 12px; 
      margin-bottom: 25px; 
    }
    .kpi-card { 
      background: #f8fafc;
      padding: 15px;
      border-radius: 10px;
      border-left: 4px solid #0891b2;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .kpi-card.ok { border-left-color: #10b981; }
    .kpi-card.nok { border-left-color: #ef4444; }
    .kpi-label { 
      font-size: 9px; 
      color: #64748b; 
      text-transform: uppercase; 
      font-weight: 600; 
      margin-bottom: 6px;
      letter-spacing: 0.5px;
    }
    .kpi-value { 
      font-size: 28px; 
      font-weight: 700; 
      color: #0f172a; 
      margin: 0;
      line-height: 1;
    }
    .kpi-card.ok .kpi-value { color: #10b981; }
    .kpi-card.nok .kpi-value { color: #ef4444; }
    
    /* CATEGORÍAS */
    .cat-section {
      margin-bottom: 25px;
      page-break-inside: avoid;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    .cat-header {
      background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);
      color: white;
      padding: 12px 18px;
      font-size: 14px;
      font-weight: 700;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .cat-stats { 
      display: flex; 
      gap: 8px; 
      font-size: 11px; 
    }
    .cat-stat { 
      background: rgba(255,255,255,0.2); 
      padding: 4px 10px; 
      border-radius: 12px;
      font-weight: 600;
    }
    
    .pcc-subsection {
      margin: 12px 15px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .pcc-header {
      background: #f1f5f9;
      padding: 10px 15px;
      font-size: 12px;
      font-weight: 700;
      color: #334155;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .pcc-icon {
      width: 6px;
      height: 6px;
      background: #0891b2;
      border-radius: 50%;
    }
    
    /* TABLAS */
    .tabla-categoria {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    .tabla-categoria th {
      background: #f8fafc;
      padding: 10px 12px;
      text-align: left;
      font-size: 9px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e2e8f0;
    }
    .tabla-categoria td {
      padding: 10px 12px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
    }
    .tabla-categoria tr:last-child td { border-bottom: none; }
    .tabla-categoria tr:hover { background: #f8fafc; }
    
    .badge { 
      display: inline-block; 
      padding: 3px 8px; 
      border-radius: 12px; 
      font-size: 9px; 
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
    
    /* INCIDENCIAS */
    .incidencias-section {
      margin-top: 35px;
      page-break-before: always;
    }
    .incidencias-header {
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      color: white;
      padding: 15px 20px;
      border-radius: 10px 10px 0 0;
      font-size: 16px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .incidencias-list {
      display: flex;
      flex-direction: column;
      gap: 15px;
      padding: 20px;
      background: #fef2f2;
      border-radius: 0 0 10px 10px;
      border: 1px solid #fecaca;
      border-top: none;
    }
    .incidencia-card {
      background: white;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid #dc2626;
      box-shadow: 0 2px 6px rgba(0,0,0,0.06);
      page-break-inside: avoid;
    }
    .incidencia-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid #f1f5f9;
    }
    .incidencia-title { 
      font-size: 13px; 
      font-weight: 700; 
      color: #1e293b; 
    }
    .incidencia-cat { 
      font-size: 10px; 
      color: #64748b; 
      background: #f1f5f9; 
      padding: 3px 10px; 
      border-radius: 12px;
      font-weight: 600;
    }
    .incidencia-details {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 12px;
      font-size: 10px;
      color: #475569;
    }
    .incidencia-details strong {
      color: #1e293b;
    }
    .incidencia-action-box {
      background: #fff1f2;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 12px;
      border-left: 3px solid #dc2626;
    }
    .incidencia-action-label {
      font-size: 9px;
      font-weight: 700;
      color: #9f1239;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .incidencia-action-text { 
      font-size: 11px; 
      color: #1e293b; 
      line-height: 1.5; 
    }
    .incidencia-foto { margin-top: 12px; }
    .incidencia-img {
      max-width: 250px;
      max-height: 180px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      object-fit: cover;
      margin-top: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    /* FOOTER */
    .footer { 
      margin-top: 40px; 
      text-align: center; 
      color: #94a3b8; 
      font-size: 10px; 
      padding-top: 20px; 
      border-top: 2px solid #e2e8f0;
    }
    .footer-brand {
      font-weight: 700;
      color: #0891b2;
      font-size: 12px;
      margin-bottom: 5px;
    }
    
    /* BOTÓN IMPRIMIR */
    .print-btn {
      position: fixed;
      bottom: 25px;
      right: 25px;
      padding: 14px 28px;
      background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(8, 145, 178, 0.3);
      transition: all 0.2s;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .print-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(8, 145, 178, 0.4);
    }
    
    /* PRINT */
    @media print {
      body { margin: 15px; padding: 15px; }
      .print-btn { display: none; }
      .cat-section, .pcc-subsection, .incidencia-card { 
        box-shadow: none;
        border: 1px solid #e2e8f0;
      }
      @page { 
        margin: 1cm; 
        size: A4;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-top">
      <div>
        <div class="logo">KOST SOFTWARE</div>
        <div class="logo-sub">Sistema de Gestión HACCP para Hostelería</div>
      </div>
    </div>
    <div class="header-title">📋 Reporte de Control HACCP</div>
    <div class="header-info">
      <span>📅 Período: ${formatearFecha(inicio)} al ${formatearFecha(fin)}</span>
      <span>🕐 Generado: ${new Date().toLocaleString('es-ES')}</span>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">📊 Total Registros</div>
      <div class="kpi-value">${totalRegistros}</div>
    </div>
    <div class="kpi-card ok">
      <div class="kpi-label">✅ Conforme (OK)</div>
      <div class="kpi-value">${totalOK}</div>
    </div>
    <div class="kpi-card nok">
      <div class="kpi-label">⚠️ No Conforme (NOK)</div>
      <div class="kpi-value">${totalNOK}</div>
    </div>
    <div class="kpi-card ${porcentajeCumplimiento >= 95 ? 'ok' : porcentajeCumplimiento >= 85 ? '' : 'nok'}">
      <div class="kpi-label">📈 Cumplimiento</div>
      <div class="kpi-value">${porcentajeCumplimiento}%</div>
    </div>
  </div>
`;

    Object.keys(registrosPorCategoria).forEach(catNombre => {
      const catData = registrosPorCategoria[catNombre];
      const pccKeys = Object.keys(catData.pccs);
      
      html += `
      <div class="cat-section">
        <div class="cat-header">
          <span>📁 ${catNombre}</span>
          <div class="cat-stats">
            <span class="cat-stat">📊 ${catData.items.length}</span>
            <span class="cat-stat" style="background: rgba(16, 185, 129, 0.3);">✅ ${catData.ok}</span>
            ${catData.nok > 0 ? `<span class="cat-stat" style="background: rgba(239, 68, 68, 0.3);">⚠️ ${catData.nok}</span>` : ''}
          </div>
        </div>
      `;

      pccKeys.forEach(pccNombre => {
        const pccRegs = catData.pccs[pccNombre];
        html += `
        <div class="pcc-subsection">
          <div class="pcc-header">
            <div class="pcc-icon"></div>
            ${pccNombre}
          </div>
          <table class="tabla-categoria">
            <thead>
              <tr>
                <th style="width: 22%"> Fecha/Hora</th>
                <th style="width: 15%">📏 Valor</th>
                <th style="width: 12%">✓ Estado</th>
                <th style="width: 15%">👤 Usuario</th>
                <th style="width: 36%">🔧 Acción / Foto</th>
              </tr>
            </thead>
            <tbody>
        `;

        pccRegs.forEach((reg: any) => {
          const badge = reg.estado === 'OK' ? '<span class="badge badge-ok">OK</span>' : '<span class="badge badge-nok">NOK</span>';
          const valor = reg.valor_medido !== null ? `${reg.valor_medido} ${reg.unidad || ''}` : '-';
          
          html += `
            <tr>
              <td>${formatearFechaHora(reg.fecha_hora)}</td>
              <td>${valor}</td>
              <td>${badge}</td>
              <td>${reg.id_usuario}</td>
              <td>
                ${reg.estado === 'NO_OK' ? `
                  <div style="color: #dc2626; font-weight: 600; font-size: 10px; margin-bottom: 4px;">
                    🔧 ${reg.accion_correctora || 'Sin acción documentada'}
                  </div>
                  ${reg.foto_evidencia ? '<div style="font-size: 9px; color: #64748b;">📷 Foto en apartado final</div>' : ''}
                ` : '<span style="color: #94a3b8;">-</span>'}
              </td>
            </tr>
          `;
        });

        html += `</tbody></table></div>`;
      });

      html += `</div>`;
    });

    const incidencias = registros.filter((r: any) => r.estado === 'NO_OK');
    if (incidencias.length > 0) {
      html += `
      <div class="incidencias-section">
        <div class="incidencias-header">
           APARTADO DE INCIDENCIAS Y MEDIDAS CORRECTORAS (${incidencias.length})
        </div>
        <div class="incidencias-list">
      `;
      
      incidencias.forEach((inc: any, index: number) => {
        const catNombre = inc.categoria_nombre || 'Sin Categoría';
        const pccNombre = inc.nombre_pcc || 'PCC Desconocido';
        
        html += `
          <div class="incidencia-card">
            <div class="incidencia-top">
              <div class="incidencia-title">${index + 1}. ${pccNombre}</div>
              <div class="incidencia-cat">${catNombre}</div>
            </div>
            <div class="incidencia-details">
              <div>📅 <strong>${formatearFechaHora(inc.fecha_hora)}</strong></div>
              <div>📏 Valor: <strong>${inc.valor_medido !== null ? `${inc.valor_medido} ${inc.unidad || ''}` : 'N/A'}</strong></div>
              <div>👤 Usuario: <strong>${inc.id_usuario}</strong></div>
            </div>
            <div class="incidencia-action-box">
              <div class="incidencia-action-label">🔧 Medida Correctora Aplicada:</div>
              <div class="incidencia-action-text">${inc.accion_correctora || 'No se documentó ninguna acción correctora.'}</div>
            </div>
            ${inc.foto_evidencia ? `
            <div class="incidencia-foto">
              <div class="incidencia-action-label"> Evidencia Fotográfica:</div>
              <img src="${inc.foto_evidencia}" alt="Evidencia" class="incidencia-img" />
            </div>
            ` : ''}
          </div>
        `;
      });
      
      html += `</div></div>`;
    }

    html += `
  <div class="footer">
    <div class="footer-brand">KOST SOFTWARE</div>
    <div>Sistema de Gestión HACCP para Hostelería</div>
    <div style="margin-top: 8px;">© ${new Date().getFullYear()} | Total: ${totalRegistros} registros | ${totalOK} OK | ${totalNOK} NOK | ${porcentajeCumplimiento}% cumplimiento</div>
  </div>

  <button class="print-btn" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>

  <script>
    setTimeout(() => { if (confirm('¿Deseas imprimir o guardar este reporte como PDF?')) { window.print(); } }, 500);
  </script>
</body>
</html>`;

    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

  } catch (error: any) {
    console.error('❌ Error generando reporte:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
