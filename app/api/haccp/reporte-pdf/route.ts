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

    // 🔥 PASO 1: Obtener TODAS las categorías
    const { data: todasCategorias, error: errorCats } = await supabase
      .from('haccp_categorias')
      .select('id, nombre');

    const catMapGlobal = new Map(
      todasCategorias?.map(c => [c.id, c.nombre]) || []
    );

    console.log('📂 Categorías cargadas:', Object.fromEntries(catMapGlobal));

    // 🔥 PASO 2: Obtener registros
    const { data: registros, error: errorReg } = await supabase
      .from('haccp_registros')
      .select('*')
      .gte('fecha_hora', `${inicio}T00:00:00`)
      .lte('fecha_hora', `${fin}T23:59:59`)
      .order('fecha_hora', { ascending: true });

    if (errorReg) throw errorReg;

    if (!registros || registros.length === 0) {
      return new NextResponse('<h1>No hay registros en este período</h1>', { 
        headers: { 'Content-Type': 'text/html; charset=utf-8' } 
      });
    }

    // 🔥 PASO 3: Obtener PCCs
    const pccIds = [...new Set(registros.map(r => r.id_pcc))];
    
    const { data: pccs } = await supabase
      .from('haccp_pcc')
      .select('id_pcc, nombre_pcc, categoria_id')
      .in('id_pcc', pccIds);

    console.log('📂 PCCs cargados:', pccs?.length);

    //  PASO 4: Crear mapa de PCCs
    const pccMap = new Map(pccs?.map(p => [p.id_pcc, p]) || []);

    // 🔥 PASO 5: Organizar datos CON NOMBRES DE CATEGORÍAS
    const registrosPorCategoria: any = {};
    
    registros.forEach((reg: any) => {
      const pcc = pccMap.get(reg.id_pcc);
      
      // Obtener ID de categoría del PCC
      let catId = pcc?.categoria_id;
      
      // Si no hay categoría en el PCC, usar fallback
      if (!catId) {
        catId = 'SIN_CATEGORIA';
      }
      
      // Obtener nombre de la categoría desde el mapa global
      let catNombre = catMapGlobal.get(catId);
      
      // Si no existe en el mapa, usar el ID como fallback
      if (!catNombre) {
        catNombre = catId;
      }
      
      const pccNombre = pcc?.nombre_pcc || 'PCC Desconocido';

      console.log(`📝 Registro ${reg.id_pcc}: catId=${catId}, catNombre=${catNombre}, pcc=${pccNombre}`);

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

    // Estadísticas globales
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

    // 🔥 PASO 6: Generar HTML
    let html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte HACCP ${inicio} - ${fin}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #000; font-size: 11px; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
    .header h1 { margin: 0; font-size: 18px; }
    .header p { margin: 5px 0; font-size: 12px; }
    
    .kpi-grid { display: flex; justify-content: space-around; margin-bottom: 20px; border: 1px solid #ccc; padding: 10px; }
    .kpi { text-align: center; }
    .kpi-val { font-size: 20px; font-weight: bold; }
    .kpi-ok { color: green; }
    .kpi-nok { color: red; }
    
    .cat-section { margin-bottom: 20px; page-break-inside: avoid; border: 1px solid #999; }
    .cat-title { background: #eee; padding: 8px; font-weight: bold; font-size: 13px; border-bottom: 1px solid #999; }
    .pcc-title { background: #f9f9f9; padding: 5px 10px; font-weight: bold; font-size: 11px; border-bottom: 1px solid #ccc; }
    
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
    th { background: #f5f5f5; }
    .badge-ok { color: green; font-weight: bold; }
    .badge-nok { color: red; font-weight: bold; }
    
    .incidencias-section { margin-top: 30px; page-break-before: always; }
    .inc-header { background: #fee; color: #900; padding: 8px; font-weight: bold; font-size: 14px; border: 1px solid #900; }
    .inc-card { border: 1px solid #ccc; margin-bottom: 15px; padding: 10px; page-break-inside: avoid; }
    .inc-title { font-weight: bold; font-size: 12px; margin-bottom: 5px; }
    .inc-action { background: #fff0f0; padding: 8px; border-left: 3px solid red; margin: 8px 0; font-size: 10px; }
    .inc-img { max-width: 250px; max-height: 180px; border: 1px solid #999; margin-top: 5px; }
    
    .footer { margin-top: 30px; text-align: center; font-size: 9px; color: #666; border-top: 1px solid #ccc; padding-top: 10px; }
    
    @media print {
      body { margin: 10px; }
      .no-print { display: none; }
      @page { margin: 1cm; size: A4; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>REPORTE DE CONTROL HACCP</h1>
    <p><strong>Período:</strong> ${formatearFecha(inicio)} al ${formatearFecha(fin)}</p>
    <p><strong>Generado:</strong> ${new Date().toLocaleString('es-ES')}</p>
  </div>

  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-val">${totalRegistros}</div><div>Total Registros</div></div>
    <div class="kpi"><div class="kpi-val kpi-ok">${totalOK}</div><div>Conforme (OK)</div></div>
    <div class="kpi"><div class="kpi-val kpi-nok">${totalNOK}</div><div>No Conforme (NOK)</div></div>
    <div class="kpi"><div class="kpi-val">${porcentajeCumplimiento}%</div><div>Cumplimiento</div></div>
  </div>
`;

    // 🔥 Renderizar por Categoría y Subcategoría (PCC)
    Object.keys(registrosPorCategoria).forEach(catNombre => {
      const catData = registrosPorCategoria[catNombre];
      const pccKeys = Object.keys(catData.pccs);
      
      html += `
      <div class="cat-section">
        <div class="cat-title">📁 ${catNombre} (Total: ${catData.items.length} | OK: ${catData.ok} | NOK: ${catData.nok})</div>
      `;

      pccKeys.forEach(pccNombre => {
        const pccRegs = catData.pccs[pccNombre];
        html += `
        <div class="pcc-title">📍 ${pccNombre}</div>
        <table>
          <thead>
            <tr>
              <th style="width: 22%">Fecha/Hora</th>
              <th style="width: 15%">Valor</th>
              <th style="width: 12%">Estado</th>
              <th style="width: 15%">Usuario</th>
              <th style="width: 36%">Acción Correctora / Foto</th>
            </tr>
          </thead>
          <tbody>
        `;

        pccRegs.forEach((reg: any) => {
          const badge = reg.estado === 'OK' ? '<span class="badge-ok">OK</span>' : '<span class="badge-nok">NOK</span>';
          const valor = reg.valor_medido !== null ? `${reg.valor_medido} ${reg.unidad || ''}` : '-';
          
          html += `
            <tr>
              <td>${formatearFechaHora(reg.fecha_hora)}</td>
              <td>${valor}</td>
              <td>${badge}</td>
              <td>${reg.id_usuario}</td>
              <td>
                ${reg.estado === 'NO_OK' ? `
                  <div style="color: red; font-weight: bold;">${reg.accion_correctora || 'Sin acción'}</div>
                  ${reg.foto_evidencia ? '<div style="font-size: 9px; color: #666;">📷 Foto en apartado final</div>' : ''}
                ` : '-'}
              </td>
            </tr>
          `;
        });

        html += `</tbody></table></div>`;
      });

      html += `</div>`;
    });

    // 🔥 Apartado de Incidencias al final
    const incidencias = registros.filter((r: any) => r.estado === 'NO_OK');
    if (incidencias.length > 0) {
      html += `
      <div class="incidencias-section">
        <div class="inc-header">🚨 DETALLE DE INCIDENCIAS Y MEDIDAS CORRECTORAS (${incidencias.length})</div>
      `;
      
      incidencias.forEach((inc: any, index: number) => {
        const pcc = pccMap.get(inc.id_pcc);
        let catId = pcc?.categoria_id || 'SIN_CATEGORIA';
        let catNombre = catMapGlobal.get(catId) || catId;
        
        html += `
          <div class="inc-card">
            <div class="inc-title">${index + 1}. ${pcc?.nombre_pcc || 'PCC Desconocido'} <span style="font-weight: normal; color: #666;">(${catNombre})</span></div>
            <div style="font-size: 10px; margin-bottom: 8px;">
              📅 ${formatearFechaHora(inc.fecha_hora)} | 📏 Valor: <strong>${inc.valor_medido !== null ? `${inc.valor_medido} ${inc.unidad || ''}` : 'N/A'}</strong> | 👤 ${inc.id_usuario}
            </div>
            <div class="inc-action">
              <strong>🔧 Medida Correctora:</strong><br>
              ${inc.accion_correctora || 'No se documentó ninguna acción correctora.'}
            </div>
            ${inc.foto_evidencia ? `
            <div>
              <strong>📷 Evidencia Fotográfica:</strong><br>
              <img src="${inc.foto_evidencia}" alt="Evidencia" class="inc-img" />
            </div>
            ` : ''}
          </div>
        `;
      });
      
      html += `</div>`;
    }

    html += `
  <div class="footer">
    <p>KOST Software - Sistema de Gestión HACCP para Hostelería</p>
  </div>

  <button class="no-print" onclick="window.print()" style="position: fixed; bottom: 20px; right: 20px; padding: 15px 30px; background: #000; color: #fff; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: bold;">
    🖨️ IMPRIMIR / GUARDAR PDF
  </button>

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
