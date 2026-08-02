import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

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

    // Obtener registros
    let query = supabase
      .from('haccp_registros')
      .select('*')
      .gte('fecha_hora', `${inicio}T00:00:00`)
      .lte('fecha_hora', `${fin}T23:59:59`)
      .order('fecha_hora', { ascending: false });

    if (categoria && categoria !== 'todas') {
      query = query.eq('categoria_id', categoria);
    }

    const { data: registros, error } = await query;

    if (error) throw error;

    // Obtener información de PCC y categorías
    const pccIds = [...new Set(registros?.map(r => r.id_pcc) || [])];
    const { data: pccData } = await supabase
      .from('haccp_pcc')
      .select('id_pcc, nombre_pcc, categoria_id');

    const { data: categoriasData } = await supabase
      .from('haccp_categorias')
      .select('id, nombre');

    // Organizar registros por categoría
    const registrosPorCategoria: any = {};
    
    registros?.forEach((reg: any) => {
      const pcc = pccData?.find(p => p.id_pcc === reg.id_pcc);
      const catId = pcc?.categoria_id || 'SIN_CATEGORIA';
      
      if (!registrosPorCategoria[catId]) {
        registrosPorCategoria[catId] = [];
      }
      registrosPorCategoria[catId].push({
        ...reg,
        nombre_pcc: pcc?.nombre_pcc || 'Desconocido'
      });
    });

    // Crear PDF
    const doc = new PDFDocument({ 
      size: 'A4', 
      margins: { top: 50, bottom: 50, left: 40, right: 40 } 
    });

    const chunks: Buffer[] = [];
    
    doc.on('data', (chunk) => chunks.push(chunk));

    // HEADER
    doc.fontSize(24).fillColor('#0891b2').text('KOST SOFTWARE', { align: 'center' });
    doc.fontSize(18).fillColor('#0e7490').text('Reporte HACCP - Control de Puntos Críticos', { align: 'center', continued: true });
    doc.moveDown(1);
    
    // Fechas
    doc.fontSize(12).fillColor('#334155').text(`Período: ${formatearFecha(inicio)} al ${formatearFecha(fin)}`, { align: 'center' });
    doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, { align: 'center' });
    doc.moveDown(2);

    // RESUMEN GENERAL
    const totalRegistros = registros?.length || 0;
    const totalOK = registros?.filter((r: any) => r.estado === 'OK').length || 0;
    const totalNOK = registros?.filter((r: any) => r.estado === 'NO_OK').length || 0;
    const porcentajeCumplimiento = totalRegistros > 0 ? Math.round((totalOK / totalRegistros) * 100) : 0;

    doc.fontSize(14).fillColor('#0891b2').text(' RESUMEN GENERAL', { underline: true });
    doc.moveDown(0.5);
    
    doc.fontSize(11).fillColor('#1e293b')
      .text(`Total Registros: ${totalRegistros}`, { continued: true })
      .text(` | OK: ${totalOK}`, { continued: true, color: '#16a34a' })
      .text(` | NO_OK: ${totalNOK}`, { continued: true, color: '#dc2626' })
      .text(` | Cumplimiento: ${porcentajeCumplimiento}%`, { color: porcentajeCumplimiento >= 95 ? '#16a34a' : '#dc2626' });
    doc.moveDown(2);

    // REGISTROS POR CATEGORÍA
    const categoriasMap: any = {};
    categoriasData?.forEach(cat => {
      categoriasMap[cat.id] = cat.nombre;
    });

    Object.keys(registrosPorCategoria).forEach(catId => {
      const catNombre = categoriasMap[catId] || catId;
      const regs = registrosPorCategoria[catId];
      
      // Salto de página si es necesario
      if (doc.y > 500) {
        doc.addPage();
      }

      doc.fontSize(13).fillColor('#0891b2').text(` ${catNombre}`, { underline: true });
      doc.moveDown(0.5);

      // Tabla de registros
      regs.forEach((reg: any, index: number) => {
        if (doc.y > 650) {
          doc.addPage();
          doc.fontSize(11).fillColor('#0891b2').text(`${catNombre} (continuación)`, { underline: true });
          doc.moveDown(0.5);
        }

        const fecha = formatearFechaHora(reg.fecha_hora);
        const valor = reg.valor_medido || reg.temp_final || '-';
        const unidad = reg.unidad || '';
        const estado = reg.estado;
        const estadoColor = estado === 'OK' ? '#16a34a' : '#dc2626';
        
        doc.fontSize(10).fillColor('#334155')
          .text(`${index + 1}. ${reg.nombre_pcc}`, { continued: true })
          .text(` | ${fecha}`, { continued: true })
          .text(` | ${valor} ${unidad}`, { continued: true })
          .text(` | ${estado}`, { color: estadoColor, bold: true });

        if (reg.accion_correctora) {
          doc.fontSize(9).fillColor('#dc2626')
            .text(`   ⚠️ Acción: ${reg.accion_correctora}`, { indent: 20 });
        }
        
        doc.moveDown(0.3);
      });

      doc.moveDown(1);
    });

    // INCIDENCIAS DESTACADAS
    const incidencias = registros?.filter((r: any) => r.estado === 'NO_OK') || [];
    
    if (incidencias.length > 0) {
      doc.addPage();
      doc.fontSize(14).fillColor('#dc2626').text('⚠️ INCIDENCIAS DETECTADAS', { underline: true });
      doc.moveDown(1);

      incidencias.forEach((inc: any, index: number) => {
        const pcc = pccData?.find(p => p.id_pcc === inc.id_pcc);
        
        doc.fontSize(11).fillColor('#1e293b')
          .text(`${index + 1}. ${pcc?.nombre_pcc || inc.id_pcc}`, { bold: true });
        
        doc.fontSize(10).fillColor('#64748b')
          .text(`Fecha: ${formatearFechaHora(inc.fecha_hora)}`)
          .text(`Valor registrado: ${inc.valor_medido || inc.temp_final} ${inc.unidad || ''}`)
          .text(`Acción correctora: ${inc.accion_correctora || 'No documentada'}`);
        
        doc.moveDown(0.5);
      });
    }

    // FOOTER
    doc.fontSize(9).fillColor('#94a3b8')
      .text('________________________________________', { align: 'center' })
      .text('Reporte generado automáticamente por KOST Software', { align: 'center' })
      .text('Sistema de Gestión HACCP para Hostelería', { align: 'center' });

    doc.end();

    // Esperar a que se genere el PDF
    await new Promise((resolve) => doc.on('end', resolve));

    const pdfBuffer = Buffer.concat(chunks);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="reporte-haccp-${inicio}-a-${fin}.pdf"`
      }
    });

  } catch (error: any) {
    console.error('Error generando PDF:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function formatearFecha(fechaStr: string): string {
  const [year, month, day] = fechaStr.split('-');
  return `${day}/${month}/${year}`;
}

function formatearFechaHora(fechaStr: string): string {
  const fecha = new Date(fechaStr);
  return fecha.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}