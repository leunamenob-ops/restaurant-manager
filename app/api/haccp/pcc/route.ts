import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoriaId = searchParams.get('categoria');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    let query = supabase
      .from('haccp_pcc')
      .select('id_pcc, nombre_pcc, categoria_id');

    if (categoriaId && categoriaId !== 'todas') {
      query = query.eq('categoria_id', categoriaId);
    }

    const { data, error } = await query.order('nombre_pcc');

    if (error) throw error;

    return NextResponse.json(data || []);

  } catch (error: any) {
    console.error('Error cargando PCCs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
