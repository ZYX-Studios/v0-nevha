import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server-admin';

export const dynamic = 'force-dynamic';
// GET /api/admin/homeowners/dues-status - Get homeowners with their dues status
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    
    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const homeowner_ids = searchParams.get('homeowner_ids'); // comma-separated list
    
    if (!homeowner_ids) {
      return NextResponse.json({ error: 'homeowner_ids parameter is required' }, { status: 400 });
    }
    
    const ids = homeowner_ids.split(',').filter(id => id.trim());
    
    if (ids.length === 0) {
      return NextResponse.json({ dues_status: {} });
    }
    
    // Get dues status for the specified homeowners
    const { data: duesData, error } = await supabase
      .from('hoa_dues')
      .select('homeowner_id, annual_amount, amount_paid, is_paid_in_full, payment_date')
      .eq('dues_year', year)
      .in('homeowner_id', ids);
    
    if (error) {
      console.error('Error fetching dues status:', error);
      return NextResponse.json({ error: 'Failed to fetch dues status' }, { status: 500 });
    }
    
    // Get the annual amount from config if no dues record exists
    const { data: config, error: configError } = await supabase
      .from('hoa_dues_config')
      .select('annual_amount')
      .eq('dues_year', year)
      .eq('is_active', true)
      .single();
    
    if (configError && configError.code !== 'PGRST116') {
      console.error('Error fetching dues config:', configError);
      return NextResponse.json({ error: 'Failed to fetch dues configuration' }, { status: 500 });
    }
    
    // Build the response object
    const duesStatus: Record<string, any> = {};
    
    // Initialize all homeowners with default values
    ids.forEach(id => {
      duesStatus[id] = {
        homeowner_id: id,
        annual_amount: config?.annual_amount || 0,
        amount_paid: 0,
        is_paid_in_full: false,
        payment_date: null,
        balance_due: config?.annual_amount || 0,
        is_good_standing: false
      };
    });
    
    // Update with actual dues data
    duesData?.forEach(dues => {
      duesStatus[dues.homeowner_id] = {
        ...duesStatus[dues.homeowner_id],
        annual_amount: dues.annual_amount,
        amount_paid: dues.amount_paid,
        is_paid_in_full: dues.is_paid_in_full,
        payment_date: dues.payment_date,
        balance_due: dues.annual_amount - dues.amount_paid,
        is_good_standing: dues.is_paid_in_full
      };
    });
    
    return NextResponse.json({
      year,
      dues_status: duesStatus
    });
    
  } catch (error) {
    console.error('Error in GET /api/admin/homeowners/dues-status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
