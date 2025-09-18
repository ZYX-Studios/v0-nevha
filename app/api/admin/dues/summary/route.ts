import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server-admin';

// GET /api/admin/dues/summary - Get dues collection summary
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    
    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    
    // Get dues summary using our database function
    const { data: summary, error } = await supabase
      .rpc('get_dues_summary', { p_year: year });
    
    if (error) {
      console.error('Error fetching dues summary:', error);
      return NextResponse.json({ error: 'Failed to fetch dues summary' }, { status: 500 });
    }
    
    // Get dues configuration for the year
    const { data: config, error: configError } = await supabase
      .from('hoa_dues_config')
      .select('*')
      .eq('dues_year', year)
      .eq('is_active', true)
      .single();
    
    if (configError && configError.code !== 'PGRST116') {
      console.error('Error fetching dues config:', configError);
      return NextResponse.json({ error: 'Failed to fetch dues configuration' }, { status: 500 });
    }
    
    return NextResponse.json({
      year,
      summary: summary[0] || {
        total_homeowners: 0,
        paid_in_full: 0,
        partial_payments: 0,
        no_payments: 0,
        total_collected: 0,
        total_outstanding: 0,
        collection_rate: 0
      },
      config: config || null
    });
    
  } catch (error) {
    console.error('Error in GET /api/admin/dues/summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
