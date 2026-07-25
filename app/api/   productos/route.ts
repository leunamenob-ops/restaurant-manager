import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('ingredientes')
      .select(`
        *,
        proveedores:proveedor_id (
          nombre
        )
      `)
      .order('nombre');

    if (error) {
      console.error('Error Supabase:', error);
      throw error;
    }

    const productosTransformados = data?.map((item: any) => ({
      ...item,
      proveedor_nombre: item.proveedores?.nombre || item.proveedor_nombre || 'Sin proveedor'
    })) || [];

    return NextResponse.json({ 
      success: true, 
      data: productosTransformados,
      total: productosTransformados.length
    });

  } catch (error: any) {
    console.error('Error en API productos:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
