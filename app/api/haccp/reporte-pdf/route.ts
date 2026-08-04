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

    // 🔥 Consulta actualizada para incluir categorías, PCCs y fotos
    const { data: registros, error } = await supabase
      .from('haccp_registros')
      .select(`
        id_registro,
        fecha_hora,
        id_pcc,
        valor_medido,
        unidad,
        estado,
        accion_correctora,
        foto_evidencia,
        id_usuario,
        haccp_pcc (
          id_pcc,
          nombre_pcc,
          categoria_id,
          haccp_categorias (
            id,
            nombre
          )
        )
      `)
      .gte('fecha_hora', `${inicio}T00:00:00`)
      .lte('fecha_hora', `${fin}T23:59:59`)
      .order('fecha_hora', { ascending: true }); // Orden cronológico

    if (error) throw error;

    // Organizar por Categoría -> PCC (Subcategoría)
    const registrosPorCategoria: any = {};
    
    registros?.forEach((reg: any) => {
      const pcc = reg.haccp_pcc || {};
      const cat = pcc.haccp_categorias || {};
      const catId = pcc.categoria_id;
      const catNombre = cat.nombre || `Categoría ${catId}`;
      const pccNombre = pcc.nombre_pcc || 'PCC Desconocido';

      if (!registrosPorCategoria[catNombre]) {
        registrosPorCategoria[catNombre] = { items: [], ok: 0, nok: 0, pccs: {} };
      }

      if (!registrosPorCategoria[catNombre].pccs[pccNombre]) {
        registrosPorCategoria[catNombre].pccs[pccNombre] = [];
      }

      registrosPorCategoria[catNombre].pccs[pccNombre].push(reg);
      
      if (reg.estado === 'OK') {
        registrosPorCategoria[catNombre].ok++;
      } else {
        registrosPorCategoria[catNombre].nok++;
      }
      registrosPorCategoria[catNombre].items.push(reg);
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

    // Generar HTML del Reporte
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
    
    .pcc-subsection {
      margin: 10px 15px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .pcc-header {
      background: #f1f5f9;
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 700;
      color: #334155;
      border-bottom: 1px solid #e2e8f0;
    }
    
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
      vertical-align: top;
    }
    
    .badge { display: inline-block; padding: 2px 6px; border-radius: 12px; font-size: 9px; font-weight: 700; }
    .badge-ok { background: #dcfce7; color: #16a34a; }
    .badge-nok { background: #fee2e2; color: #dc2626; }
    
    /* 🔥 APARTADO DE INCIDENCIAS */
    .incidencias-section {
      margin-top: 30px;
      page-break-before: always;
    }
    .incidencias-header {
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      color: white;
      padding: 12px 15px;
      border-radius: 8px 8px 0 0;
      font-size: 14px;
      font-weight: 700;
    }
    .incidencias-list {
      display: flex;
      flex-direction: column;
      gap: 15px;
      padding: 15px;
      background: #fef2f2;
      border-radius: 0 0 8px 8px;
      border: 1px solid #fecaca;
      border-top: none;
    }
    .incidencia-card {
      background: white;
      padding: 12px;
      border-radius: 6px;
      border-left: 4px solid #dc2626;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      page-break-inside: avoid;
    }
    .incidencia-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 6px;
    }
    .incidencia-title { font-size: 12px; font-weight: 700; color: #1e293b; }
    .incidencia-cat { font-size: 10px; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 12px; }
    .incidencia-details {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 10px;
    }
    .incidencia-meta { font-size: 10px; color: #475569; }
    .incidencia-action-box {
      background: #fff1f2;
      padding: 10px;
      border-radius: 6px;
      margin-bottom: 10px;
    }
    .incidencia-action-label {
      font-size: 10px;
      font-weight: 700;
      color: #9f1239;
      margin-bottom: 4px;
      text-transform: uppercase;
    }
    .incidencia-action-text { font-size: 11px; color: #1e293b; line-height: 1.4; }
    .incidencia-foto { margin-top: 10px; }
    .incidencia-img {
      max-width: 200px;
      max-height: 150px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      object-fit: cover;
      margin-top: 6px;
    }
    
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
      .categoria-seccion, .pcc-subsection, .incidencia-card { box-shadow: none; }
      @page { margin: 1cm; size: A4; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🛡️ KOST SOFTWARE</h1>
    <h2>Reporte de Inspección HACCP</h2>
    <p>📅 Período: ${formatearFecha(inicio)} al ${formatearFecha(fin)} (${dias} días) | Promedio: ${promedioDiario} registros/día</p>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">📊 Total Registros</div>
      <div class="kpi-value">${totalRegistros}</div>
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
      <div class="kpi-label">📅 Días evaluados</div>
      <div class="kpi-value">${dias}</div>
    </div>
  </div>
`;

    // 🔥 Renderizar Categorías y Subcategorías (PCCs)
    Object.keys(registrosPorCategoria).forEach(catNombre => {
      const catData = registrosPorCategoria[catNombre];
      const pccKeys = Object.keys(catData.pccs);
      
      html += `
      <div class="categoria-seccion">
        <div class="cat-header">
          <span>📁 ${catNombre}</span>
          <div class="cat-stats">
            <span class="cat-stat">📊 ${catData.items.length}</span>
            <span class="cat-stat" style="background: rgba(22, 163, 74, 0.3);">✅ ${catData.ok}</span>
            ${catData.nok > 0 ? `<span class="cat-stat" style="background: rgba(220, 38, 38, 0.3);">⚠️ ${catData.nok}</span>` : ''}
          </div>
        </div>
      `;

      pccKeys.forEach(pccNombre => {
        const pccRegs = catData.pccs[pccNombre];
        html += `
        <div class="pcc-subsection">
          <div class="pcc-header">📍 ${pccNombre}</div>
          <table class="tabla-categoria">
            <thead>
              <tr>
                <th style="width: 20%">🕐 Fecha/Hora</th>
                <th style="width: 15%">📏 Valor</th>
                <th style="width: 15%">✓ Estado</th>
                <th style="width: 15%">👤 Usuario</th>
                <th style="width: 35%">🔧 Acción / Foto</th>
              </tr>
            </thead>
            <tbody>
        `;

        pccRegs.forEach((reg: any) => {
          const badgeClass = reg.estado === 'OK' ? 'badge-ok' : 'badge-nok';
          html += `
            <tr>
              <td>${formatearFechaHora(reg.fecha_hora)}</td>
              <td>${reg.valor_medido !== null ? `${reg.valor_medido} ${reg.unidad || ''}` : '-'}</td>
              <td><span class="badge ${badgeClass}">${reg.estado}</span></td>
              <td>${reg.id_usuario}</td>
              <td>
                ${reg.estado === 'NO_OK' ? `
                  <div style="color: #dc2626; font-weight: 600; font-size: 9px; margin-bottom: 4px;">
                    🔧 ${reg.accion_correctora ? reg.accion_correctora.substring(0, 60) + (reg.accion_correctora.length > 60 ? '...' : '') : 'Sin acción'}
                  </div>
                  ${reg.foto_evidencia ? `<div style="font-size: 8px; color: #64748b;">📷 Foto adjunta (ver apartado final)</div>` : ''}
                ` : '-'}
              </td>
            </tr>
          `;
        });

        html += `
            </tbody>
          </table>
        </div>
        `;
      });

      html += `</div>`;
    });

    // 🔥 Apartado dedicado de Incidencias al final del reporte
    const incidencias = registros?.filter((r: any) => r.estado === 'NO_OK') || [];
    if (incidencias.length > 0) {
      html += `
      <div class="incidencias-section">
        <div class="incidencias-header">🚨 APARTADO DE INCIDENCIAS Y MEDIDAS CORRECTORAS (${incidencias.length})</div>
        <div class="incidencias-list">
      `;
      
      incidencias.forEach((inc: any, index: number) => {
        const pcc = inc.haccp_pcc || {};
        const cat = pcc.haccp_categorias || {};
        html += `
          <div class="incidencia-card">
            <div class="incidencia-top">
              <div class="incidencia-title">${index + 1}. ${pcc.nombre_pcc || 'PCC Desconocido'}</div>
              <div class="incidencia-cat">${cat.nombre || 'Sin Categoría'}</div>
            </div>
            <div class="incidencia-details">
              <div class="incidencia-meta">📅 ${formatearFechaHora(inc.fecha_hora)}</div>
              <div class="incidencia-meta">📏 Valor: <strong>${inc.valor_medido !== null ? `${inc.valor_medido} ${inc.unidad || ''}` : 'N/A'}</strong></div>
              <div class="incidencia-meta">👤 Usuario: ${inc.id_usuario}</div>
            </div>
            <div class="incidencia-action-box">
              <div class="incidencia-action-label">🔧 Medida Correctora Aplicada:</div>
              <div class="incidencia-action-text">${inc.accion_correctora || 'No se documentó ninguna acción correctora.'}</div>
            </div>
            ${inc.foto_evidencia ? `
            <div class="incidencia-foto">
              <div class="incidencia-action-label">📷 Evidencia Fotográfica:</div>
              <img src="${inc.foto_evidencia}" alt="Evidencia" class="incidencia-img" />
            </div>
            ` : ''}
          </div>
        `;
      });
      
      html += `
        </div>
      </div>
      `;
    }

    html += `
  <div class="footer">
    <p><strong>KOST Software</strong> - Sistema de Gestión HACCP para Hostelería</p>
    <p style="margin-top: 5px;">© ${new Date().getFullYear()} | Generado el ${new Date().toLocaleString('es-ES')}</p>
  </div>

  <button class="print-btn" onclick="window.print()">📄 Imprimir / Guardar PDF</button>

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
