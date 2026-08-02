import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('haccp_categorias')
      .select('*')
      .order('nombre');

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error obteniendo categorías:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
