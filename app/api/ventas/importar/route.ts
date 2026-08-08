import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';

const textract = new TextractClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

function parseNum(v: any): number | null {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!s || !/^-?[\d.,]+$/.test(s)) return null;
  const clean = s.includes(',') && s.includes('.')
    ? s.replace(/,/g, '')
    : s.includes(',')
    ? s.replace(',', '.')
    : s;
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

// Línea de texto (PDF/TXT sin columnas) → celdas [codigo, nombre, ...nums]
function lineaTextoACeldas(line: string): any[] | null {
  const m = line.match(/^(\d{6,10})[\s|;]+(.+)$/);
  if (!m) return null;
  const tokens = m[2].split(/\s+/).filter(Boolean);
  const nums: string[] = [];
  while (tokens.length && nums.length < 12 && /^-?[\d.,]+$/.test(tokens[tokens.length - 1])) {
    nums.unshift(tokens.pop()!);
  }
  const nombre = tokens.join(' ').trim();
  if (!nombre || nums.length < 6) return null;
  return [m[1], nombre, ...nums];
}

function celdasALineas(rows: any[][]) {
  const lineas: any[] = [];
  let categoria = '';
  let punto_venta = '';
  let fecha_desde = '';
  let fecha_hasta = '';

  for (const celdas of rows) {
    if (!celdas || !celdas.length) continue;
    const texto = celdas.map((c) => String(c ?? '')).join(' ');

    const fm = texto.match(/del\s+(\d{2}\/\d{2}\/\d{4})\s+al\s+(\d{2}\/\d{2}\/\d{4})/);
    if (fm) {
      fecha_desde = fm[1];
      fecha_hasta = fm[2];
    }

    const noVacias = celdas.map((c) => String(c ?? '').trim()).filter(Boolean);
    if (noVacias.length === 1) {
      const t = noVacias[0];
      if (!punto_venta && /BAR|RESTAURANTE|PISCINA|CAFETER|COCINA/i.test(t) && t.length < 40) {
        punto_venta = t;
      } else if (/^[A-ZÁÉÍÓÚÑ0-9\s\/&-]{3,30}$/.test(t) && !/TOTAL|ARTICULO|CATEGOR|GRUPO|PAG|NATURALEZA|SALON|MEDIA/i.test(t)) {
        categoria = t;
      }
      continue;
    }

    const codigo = String(celdas[0] ?? '').trim();
    if (!/^\d{6,10}$/.test(codigo)) continue;

    let nombreArt = '';
    const nums: number[] = [];
    for (const c of celdas) {
      const s = String(c ?? '').trim();
      if (!s || s === codigo) continue;
      const n = parseNum(s);
      if (n === null) {
        if (!nombreArt) nombreArt = s;
      } else {
        nums.push(n);
      }
    }
    if (!nombreArt || nums.length < 6) continue;

    lineas.push({
      codigo,
      nombre_articulo: nombreArt,
      categoria,
      unidades: nums[0],
      precio_coste: nums[2] ?? 0,
      precio_base: nums[3] ?? 0,
      margen_unitario: nums[4] ?? 0,
      total_base: nums[nums.length - 3] ?? 0,
      total_coste: nums[nums.length - 2] ?? 0,
      total_margen: nums[nums.length - 1] ?? 0,
    });
  }

  return { lineas, punto_venta, fecha_desde, fecha_hasta };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('archivo') as File;
    const menuId = (formData.get('menu_id') as string) || null;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    const nameLow = file.name.toLowerCase();
    let rows: any[][] = [];

    if (nameLow.endsWith('.xls') || nameLow.endsWith('.xlsx')) {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
    } else if (nameLow.endsWith('.pdf')) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const res = await textract.send(
        new DetectDocumentTextCommand({ Document: { Bytes: bytes } })
      );
      const lines = (res.Blocks || [])
        .filter((b: any) => b.BlockType === 'LINE')
        .map((b: any) => b.Text || '');
      for (const l of lines) {
        const c = lineaTextoACeldas(l.trim());
        rows.push(c || [l]);
      }
    } else {
      // TXT / CSV
      const text = await file.text();
      for (const l of text.split(/\r?\n/)) {
        if (!l.trim()) continue;
        let cells: string[];
        if (l.includes('\t')) cells = l.split('\t');
        else if (l.includes(';')) cells = l.split(';');
        else if (l.includes('|')) cells = l.split('|');
        else {
          const c = lineaTextoACeldas(l.trim());
          rows.push(c || [l]);
          continue;
        }
        rows.push(cells);
      }
    }

    const { lineas, punto_venta, fecha_desde, fecha_hasta } = celdasALineas(rows);

    if (lineas.length === 0) {
      return NextResponse.json(
        { error: 'No se detectaron líneas de artículos. Usa XLS/XLSX, o CSV/TXT con columnas separadas por tabulaciones.' },
        { status: 400 }
      );
    }

    const totales = lineas.reduce(
      (acc, l) => ({
        base: acc.base + Number(l.total_base || 0),
        coste: acc.coste + Number(l.total_coste || 0),
        margen: acc.margen + Number(l.total_margen || 0),
        unidades: acc.unidades + Number(l.unidades || 0),
      }),
      { base: 0, coste: 0, margen: 0, unidades: 0 }
    );

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: imp, error: impErr } = await supabase
      .from('ventas_imports')
      .insert({
        nombre_archivo: file.name,
        punto_venta,
        fecha_desde,
        fecha_hasta,
        total_base: totales.base,
        total_coste: totales.coste,
        total_margen: totales.margen,
        lineas_count: lineas.length,
        menu_id: menuId,
      })
      .select()
      .single();

    if (impErr) throw impErr;

    await supabase.from('ventas_lineas').insert(
      lineas.map((l) => ({
        import_id: imp.id,
        nombre_articulo: l.nombre_articulo,
        categoria: l.categoria,
        unidades: l.unidades,
        margen_unitario: l.margen_unitario,
        total_base: l.total_base,
        total_coste: l.total_coste,
        total_margen: l.total_margen,
      }))
    );

    return NextResponse.json({
      success: true,
      import_id: imp.id,
      lineas_count: lineas.length,
      totales,
      meta: { punto_venta, fecha_desde, fecha_hasta },
    });
  } catch (error: any) {
    console.error('Error importando ventas:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
