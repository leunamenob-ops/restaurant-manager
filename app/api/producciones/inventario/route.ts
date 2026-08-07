// app/api/producciones/inventario/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

interface StockGrupo {
  producto: string;
  total_disponible: number;
  unidad: string;
  lotes: any[];
  caducidad_proxima: string | null;
  dias_proximos: number | null;
}

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan variables de entorno de Supabase');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export async function GET() {
  try {
    const supabase = getSupabase();

    const [prodRes, stockRes, lotesRes] = await Promise.all([
      supabase
        .from('producciones')
        .select('*')
        .order('fecha_produccion', { ascending: true }),
      supabase
        .from('stock_producciones')
        .select('*')
        .eq('movimiento_tipo', 'entrada')
        .gt('cantidad_disponible', 0)
        .order('fecha_caducidad', { ascending: true }),
      supabase.from('lotes').select('*').eq('estado', 'activo'),
    ]);

    const producciones = prodRes.data || [];
    const stock = stockRes.data || [];
    const lotes = lotesRes.data || [];

    // =====================================================
    // ALERTAS DE CADUCIDAD
    // =====================================================
    const ahora = new Date();
    const alertasCaducidad = stock
      .map((s: any) => {
        const cad = new Date(s.fecha_caducidad);
        cad.setHours(0, 0, 0, 0);
        const hoy = new Date(ahora);
        hoy.setHours(0, 0, 0, 0);
        const dias = Math.ceil((cad.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

        let prioridad: 'caducado' | 'critico' | 'urgente' | 'atencion' | 'ok' = 'ok';
        if (dias < 0) prioridad = 'caducado';
        else if (dias <= 1) prioridad = 'critico';
        else if (dias <= 3) prioridad = 'urgente';
        else if (dias <= 7) prioridad = 'atencion';

        return { ...s, dias_hasta_caducidad: dias, prioridad };
      })
      .sort((a: any, b: any) => a.dias_hasta_caducidad - b.dias_hasta_caducidad);

    // =====================================================
    // STOCK AGRUPADO POR PRODUCTO
    // =====================================================
    const stockAgrupado = new Map<string, StockGrupo>();

    stock.forEach((s: any) => {
      const existente = stockAgrupado.get(s.producto_nombre);

      const actual: StockGrupo = existente || {
        producto: s.producto_nombre,
        total_disponible: 0,
        unidad: s.unidad_medida,
        lotes: [] as any[],
        caducidad_proxima: null as string | null,
        dias_proximos: null as number | null,
      };

      actual.total_disponible += Number(s.cantidad_disponible || 0);
      actual.lotes.push(s);

      const cad = new Date(s.fecha_caducidad);
      cad.setHours(0, 0, 0, 0);
      const hoy = new Date(ahora);
      hoy.setHours(0, 0, 0, 0);
      const dias = Math.ceil((cad.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

      if (actual.dias_proximos === null || dias < actual.dias_proximos) {
        actual.dias_proximos = dias;
        actual.caducidad_proxima = s.fecha_caducidad;
      }

      stockAgrupado.set(s.producto_nombre, actual);
    });

    // =====================================================
    // CALENDARIO: producciones próximas
    // =====================================================
    const inicio = new Date(ahora);
    inicio.setDate(inicio.getDate() - 7);
    const fin = new Date(ahora);
    fin.setDate(fin.getDate() + 30);

    const calendario = producciones.filter((p: any) => {
      const fecha = new Date(p.fecha_produccion);
      return fecha >= inicio && fecha <= fin;
    });

    return NextResponse.json({
      ok: true,
      data: {
        producciones,
        stock: Object.fromEntries(stockAgrupado),
        alertas_caducidad: alertasCaducidad,
        calendario,
        lotes_activos: lotes,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Error' },
      { status: 500 }
    );
  }
}
