// app/api/ventas/importar/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// "1,622.67" → 1622.67 · "105.00" → 105 · number → number
function parseNum(v: any): number | null {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s || !/^-?[\d.,]+$/.test(s)) return null;
    const n = parseFloat(s.replace(/,/g, ''));
    return isNaN(n) ? null : n;
  }
  return null;
}

// =====================================================
// PARSER DETERMINISTA ACI DALÍ (filas de hoja Excel)
// =====================================================
function parseFilasACI(filas: any[][]) {
  const lineas: any[] = [];
  const meta: any = { punto_venta: '', hotel_nombre: '', fecha_desde: '', fecha_hasta: '' };
  let categoria = '';

  for (const fila of filas) {
    if (!fila || fila.length === 0) continue;
    const celdas = fila.map((c) => (c == null ? '' : String(c).trim()));
    const texto = celdas.join(' ').trim();
    if (!texto) continue;

    // Periodo: "del 01/07/2026 al 31/07/2026"
    const mPer = texto.match(/del\s+(\d{2}\/\d{2}\/\d{4})\s+al\s+(\d{2}\/\d{2}\/\d{4})/i);
    if (mPer) {
      meta.fecha_desde = mPer[1];
      meta.fecha_hasta = mPer[2];
      continue;
    }

    // Hotel
    if (!meta.hotel_nombre && /HOTEL/i.test(texto)) {
      meta.hotel_nombre = celdas.find((c) => /HOTEL/i.test(c)) || meta.hotel_nombre;
      continue;
    }

    const noVacias = celdas.filter(Boolean);

    // Punto de venta (BAR PISCINA PARK, etc.)
    if (
      !meta.punto_venta &&
      noVacias.length <= 2 &&
      /\b(BAR|RESTAURANTE|CAFETER|PISCINA|COCINA|BUFFET|CHIRINGUITO)\b/i.test(texto) &&
      !/total/i.test(texto)
    ) {
      meta.punto_venta = noVacias[0] || '';
      continue;
    }

    // Categoría / grupo de carta (celda única en mayúsculas)
    if (noVacias.length === 1) {
      const t = noVacias[0];
      if (
        /^[A-ZÁÉÍÓÚÑ0-9\s\/&-]{3,30}$/.test(t) &&
        !/TOTAL|ARTICULO|ARTÍCULO|CATEGOR|GRUPO|PAG|NATURALEZA|SALON|SALÓN/i.test(t)
      ) {
        categoria = t;
        continue;
      }
    }

    // Línea de artículo: código 6-10 dígitos en la 1ª celda
    const codigo = celdas[0];
    if (/^\d{6,10}$/.test(codigo)) {
      const nombreArt =
        noVacias.find((c) => c !== codigo && parseNum(c) === null) || noVacias[1] || '';

      const nums: number[] = [];
      for (const c of celdas) {
        if (c === codigo) continue;
        const n = parseNum(c);
        if (n !== null) nums.push(n);
      }

      // unidades,% ,coste,base,margen,% ,totalBase,totalCoste,totalMargen
      if (nombreArt && nums.length >= 9) {
        lineas.push({
          codigo_articulo: codigo,
          nombre_articulo: nombreArt,
          categoria,
          unidades: nums[0],
          precio_coste: nums[2],
          precio_base: nums[3],
          margen_unitario: nums[4],
          margen_pct: nums[5],
          total_base: nums[6],
          total_coste: nums[7],
          total_margen: nums[8],
        });
      }
    }
  }

  return { lineas, meta };
}

// =====================================================
// FALLBACK OPENAI (formatos no reconocidos)
// =====================================================
async function parseConIA(texto: string) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.1,
    messages: [
      { role: 'system', content: 'Responde SOLO con JSON válido.' },
      {
        role: 'user',
        content: `Este es un reporte de ventas de un TPV de restaurante. Extrae las líneas de artículos vendidos y devuelve SOLO este JSON:
{"punto_venta": string|null, "hotel_nombre": string|null, "fecha_desde": "DD/MM/YYYY"|null, "fecha_hasta": "DD/MM/YYYY"|null,
"lineas": [{"codigo_articulo": string|null, "nombre_articulo": string, "categoria": string|null, "unidades": number, "precio_coste": number|null, "precio_base": number|null, "margen_unitario": number|null, "margen_pct": number|null, "total_base": number|null, "total_coste": number|null, "total_margen": number|null}]}
Ignora filas de totales/subtotales. REPORTE:
${texto.slice(0, 12000)}`,
      },
    ],
  });

  let resp = completion.choices[0].message.content || '';
  resp = resp.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(resp);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('archivo') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    const nombreLower = file.name.toLowerCase();
    const esExcel = nombreLower.endsWith('.xls') || nombreLower.endsWith('.xlsx');
    const buffer = Buffer.from(await file.arrayBuffer());

    let lineas: any[] = [];
    let meta: any = {};

    // 1. Intento determinista Excel
    if (esExcel) {
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const filas: any[][] = [];
      for (const sheetName of wb.SheetNames) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
          header: 1,
          defval: '',
        }) as any[][];
        filas.push(...rows);
      }
      const parsed = parseFilasACI(filas);
      lineas = parsed.lineas;
      meta = parsed.meta;
    }

    // 2. Fallback OpenAI (txt/csv o excel no reconocido)
    if (lineas.length === 0) {
      let texto: string;
      if (esExcel) {
        const wb = XLSX.read(buffer, { type: 'buffer' });
        texto = wb.SheetNames.map((n) =>
          (XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '' }) as any[][])
            .map((f) => f.join(' | '))
            .join('\n')
        ).join('\n');
      } else {
        texto = await file.text();
      }
      const ia = await parseConIA(texto);
      lineas = ia.lineas || [];
      meta = {
        punto_venta: ia.punto_venta || '',
        hotel_nombre: ia.hotel_nombre || '',
        fecha_desde: ia.fecha_desde || '',
        fecha_hasta: ia.fecha_hasta || '',
      };
    }

    if (lineas.length === 0) {
      return NextResponse.json(
        { error: 'No se detectaron líneas de venta en el archivo' },
        { status: 400 }
      );
    }

    // 3. Guardar
    const supabase = getSupabase();

    const totales = lineas.reduce(
      (acc, l) => ({
        unidades: acc.unidades + Number(l.unidades || 0),
        base: acc.base + Number(l.total_base || 0),
        coste: acc.coste + Number(l.total_coste || 0),
        margen: acc.margen + Number(l.total_margen || 0),
      }),
      { unidades: 0, base: 0, coste: 0, margen: 0 }
    );

    const { data: importData, error: importError } = await supabase
      .from('ventas_imports')
      .insert({
        nombre_archivo: file.name,
        formato: esExcel ? 'XLS' : 'TXT/IA',
        punto_venta: meta.punto_venta || null,
        hotel_nombre: meta.hotel_nombre || null,
        fecha_desde: meta.fecha_desde || null,
        fecha_hasta: meta.fecha_hasta || null,
        total_unidades: totales.unidades,
        total_base: totales.base,
        total_coste: totales.coste,
        total_margen: totales.margen,
        lineas_count: lineas.length,
      })
      .select()
      .single();

    if (importError) {
      return NextResponse.json({ error: importError.message }, { status: 500 });
    }

    const lineasConImport = lineas.map((l) => ({
      import_id: importData.id,
      codigo_articulo: l.codigo_articulo || null,
      nombre_articulo: l.nombre_articulo,
      categoria: l.categoria || meta.punto_venta || null,
      punto_venta: meta.punto_venta || null,
      unidades: l.unidades,
      precio_coste: l.precio_coste ?? null,
      precio_base: l.precio_base ?? null,
      margen_unitario: l.margen_unitario ?? null,
      margen_pct: l.margen_pct ?? null,
      total_base: l.total_base ?? null,
      total_coste: l.total_coste ?? null,
      total_margen: l.total_margen ?? null,
      fecha_desde: meta.fecha_desde || null,
      fecha_hasta: meta.fecha_hasta || null,
    }));

    const { error: lineasError } = await supabase.from('ventas_lineas').insert(lineasConImport);

    if (lineasError) {
      return NextResponse.json({ error: lineasError.message }, { status: 500 });
    }

    // 4. Respuesta con top artículos por margen
    const top = [...lineas]
      .sort((a, b) => Number(b.total_margen || 0) - Number(a.total_margen || 0))
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      import_id: importData.id,
      meta,
      totales,
      lineas_count: lineas.length,
      top,
    });
  } catch (error: any) {
    console.error('Error importando ventas:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al importar ventas' },
      { status: 500 }
    );
  }
}
