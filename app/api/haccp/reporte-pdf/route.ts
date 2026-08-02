import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

// Configurar fuentes
(pdfMake as any).vfs = (pdfFonts as any).vfs;

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

    // Obtener PCCs y categorías
    const { data: pccData } = await supabase
      .from('haccp_pcc')
      .select('id_pcc, nombre_pcc, categoria_id');

    const { data: categoriasData } = await supabase
      .from('haccp_categorias')
      .select('id, nombre');

    // Organizar por categoría
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

    // Calcular estadísticas
    const totalRegistros = registros?.length || 0;
    const totalOK = registros?.filter((r: any) => r.estado === 'OK').length || 0;
    const totalNOK = registros?.filter((r: any) => r.estado === 'NO_OK').length || 0;
    const porcentajeCumplimiento = totalRegistros > 0 ? Math.round((totalOK / totalRegistros) * 100) : 0;

    // Construir documento PDF
    const categoriasMap: any = {};
    categoriasData?.forEach(cat => {
      categoriasMap[cat.id] = cat.nombre;
    });

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

    // Construir contenido del PDF
    const contentDefinition: any = [
      // Header
      { text: 'KOST SOFTWARE', style: 'header', alignment: 'center' },
      { text: 'Reporte HACCP - Control de Puntos Críticos', style: 'subheader', alignment: 'center' },
      { text: `Período: ${formatearFecha(inicio)} al ${formatearFecha(fin)}`, style: 'small', alignment: 'center' },
      { text: `Generado: ${new Date().toLocaleString('es-ES')}`, style: 'small', alignment: 'center' },
      { text: '\n' },
      
      // Estadísticas
      { text: 'RESUMEN GENERAL', style: 'sectionTitle' },
      {
        style: 'statsTable',
        table: {
          widths: ['*', '*', '*', '*'],
          body: [
            [
              { text: `Total: ${totalRegistros}`, bold: true },
              { text: `OK: ${totalOK}`, color: 'green' },
              { text: `NO_OK: ${totalNOK}`, color: 'red' },
              { text: `Cumplimiento: ${porcentajeCumplimiento}%`, bold: true, color: porcentajeCumplimiento >= 95 ? 'green' : 'red' }
            ]
          ]
        },
        layout: 'lightHorizontalLines'
      },
      { text: '\n' }
    ];

    // Registros por categoría
    Object.keys(registrosPorCategoria).forEach(catId => {
      const catNombre = categoriasMap[catId] || catId;
      const regs = registrosPorCategoria[catId];

      contentDefinition.push({ text: catNombre, style: 'categoryTitle' });

      // Tabla de registros
      const tableBody: any[] = [
        [
          { text: 'Fecha/Hora', style: 'tableHeader' },
          { text: 'PCC', style: 'tableHeader' },
          { text: 'Valor', style: 'tableHeader' },
          { text: 'Estado', style: 'tableHeader' },
          { text: 'Usuario', style: 'tableHeader' }
        ]
      ];

      regs.forEach((reg: any) => {
        tableBody.push([
          formatearFechaHora(reg.fecha_hora),
          reg.nombre_pcc,
          `${reg.valor_medido || reg.temp_final || '-'} ${reg.unidad || ''}`,
          { 
            text: reg.estado, 
            color: reg.estado === 'OK' ? 'green' : 'red',
            bold: true
          },
          reg.id_usuario
        ]);

        if (reg.accion_correctora) {
          tableBody.push([
            { text: `⚠️ Acción: ${reg.accion_correctora}`, colSpan: 5, alignment: 'left', color: 'red' },
            {}, {}, {}, {}
          ]);
        }
      });

      contentDefinition.push({
        style: 'table',
        table: {
          widths: ['20%', '35%', '15%', '15%', '15%'],
          body: tableBody
        },
        layout: 'lightHorizontalLines'
      });

      contentDefinition.push({ text: '\n' });
    });

    // Incidencias destacadas
    const incidencias = registros?.filter((r: any) => r.estado === 'NO_OK') || [];
    if (incidencias.length > 0) {
      contentDefinition.push({ text: 'INCIDENCIAS DETECTADAS', style: 'sectionTitle', color: 'red' });
      
      incidencias.forEach((inc: any, index: number) => {
        const pcc = pccData?.find(p => p.id_pcc === inc.id_pcc);
        contentDefinition.push({
          stack: [
            { text: `${index + 1}. ${pcc?.nombre_pcc || inc.id_pcc}`, bold: true, fontSize: 11 },
            { text: `Fecha: ${formatearFechaHora(inc.fecha_hora)}`, fontSize: 9, margin: [10, 2, 0, 0] },
            { text: `Valor: ${inc.valor_medido || inc.temp_final} ${inc.unidad || ''}`, fontSize: 9, margin: [10, 2, 0, 0] },
            { text: `Acción correctora: ${inc.accion_correctora || 'No documentada'}`, fontSize: 9, color: 'red', margin: [10, 2, 0, 0] }
          ],
          margin: [0, 0, 0, 10]
        });
      });
    }

    // Footer
    contentDefinition.push(
      { text: '\n\n________________________________________', alignment: 'center', fontSize: 8, color: 'gray' },
      { text: 'Reporte generado automáticamente por KOST Software', alignment: 'center', fontSize: 8, color: 'gray' },
      { text: 'Sistema de Gestión HACCP para Hostelería', alignment: 'center', fontSize: 8, color: 'gray' }
    );

    const docDefinition = {
      content: contentDefinition,
      styles: {
        header: {
          fontSize: 20,
          bold: true,
          color: '#0891b2',
          margin: [0, 0, 0, 10]
        },
        subheader: {
          fontSize: 14,
          color: '#0e7490',
          margin: [0, 0, 0, 5]
        },
        small: {
          fontSize: 10,
          color: '#666',
          margin: [0, 0, 0, 2]
        },
        sectionTitle: {
          fontSize: 14,
          bold: true,
          color: '#0891b2',
          margin: [0, 10, 0, 5]
        },
        categoryTitle: {
          fontSize: 13,
          bold: true,
          color: '#0891b2',
          margin: [0, 15, 0, 5],
          decoration: 'underline'
        },
        tableHeader: {
          bold: true,
          fontSize: 10,
          color: '#0891b2'
        },
        table: {
          margin: [0, 5, 0, 15]
        },
        statsTable: {
          margin: [0, 5, 0, 10]
        }
      },
      defaultStyle: {
        fontSize: 9
      },
      pageMargins: [40, 50, 40, 50]
    };

    // Generar PDF
    const pdfDoc = (pdfMake as any).createPdf(docDefinition);
    
    return new Promise((resolve) => {
      pdfDoc.getBlob((blob: Blob) => {
        const arrayBuffer = blob.arrayBuffer();
        resolve(new NextResponse(arrayBuffer as any, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="reporte-haccp-${inicio}-a-${fin}.pdf"`
          }
        }));
      });
    });

  } catch (error: any) {
    console.error('Error generando PDF:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}