import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server-admin';
import { requireAdminAPI } from "@/lib/supabase/guards"
// GET /api/admin/dues - Get dues data for a specific year
export async function GET(request: NextRequest) {
  const authError = await requireAdminAPI()
  if (authError) return authError

  try {
    const denied = await requireAdminAPI()
    if (denied) return denied
    const supabase = createAdminClient();
    
    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const status = searchParams.get('status'); // 'paid', 'unpaid', 'partial'
    
    // Get homeowners with dues status using our database function
    const { data: homeownersWithDues, error } = await supabase
      .rpc('get_homeowners_with_dues_status', { p_year: year });
    
    if (error) {
      console.error('Error fetching homeowners with dues:', error);
      return NextResponse.json({ error: 'Failed to fetch dues data' }, { status: 500 });
    }
    
    // Filter by status if specified
    let filteredData = homeownersWithDues;
    if (status) {
      filteredData = homeownersWithDues.filter((homeowner: any) => {
        switch (status) {
          case 'paid':
            return homeowner.is_paid_in_full;
          case 'unpaid':
            return !homeowner.is_paid_in_full && homeowner.amount_paid === 0;
          case 'partial':
            return !homeowner.is_paid_in_full && homeowner.amount_paid > 0;
          default:
            return true;
        }
      });
    }
    
    return NextResponse.json({
      year,
      homeowners: filteredData,
      total: filteredData.length
    });
    
  } catch (error) {
    console.error('Error in GET /api/admin/dues:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/dues - Record a payment
export async function POST(request: NextRequest) {
  const authError = await requireAdminAPI()
  if (authError) return authError

  try {
    const denied = await requireAdminAPI()
    if (denied) return denied
    const supabase = createAdminClient();
    
    const body = await request.json();
    const {
      homeowner_id,
      year,
      amount_paid,
      payment_date,
      payment_method = 'cash',
      receipt_number,
      notes
    } = body;
    
    // Validate required fields
    if (!homeowner_id || !year || !amount_paid) {
      return NextResponse.json(
        { error: 'Missing required fields: homeowner_id, year, amount_paid' },
        { status: 400 }
      );
    }
    
    if (amount_paid <= 0) {
      return NextResponse.json(
        { error: 'Payment amount must be greater than 0' },
        { status: 400 }
      );
    }
    
    // Record the payment using our database function
    const { data: duesId, error } = await supabase
      .rpc('record_hoa_payment', {
        p_homeowner_id: homeowner_id,
        p_year: year,
        p_amount_paid: amount_paid,
        p_payment_date: payment_date || new Date().toISOString().split('T')[0],
        p_payment_method: payment_method,
        p_receipt_number: receipt_number,
        p_notes: notes
      });
    
    if (error) {
      console.error('Error recording payment:', error);
      return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
    }
    
    // Log the activity (Note: actor_user_id will be null since we're using admin client)
    await supabase
      .from('activity_logs')
      .insert({
        actor_user_id: null,
        action: 'PAYMENT_RECORDED',
        entity: 'hoa_dues',
        entity_id: duesId,
        diff_json: {
          homeowner_id,
          year,
          amount_paid,
          payment_date,
          payment_method,
          receipt_number
        }
      });
    
    return NextResponse.json({
      success: true,
      dues_id: duesId,
      message: 'Payment recorded successfully'
    });
    
  } catch (error) {
    console.error('Error in POST /api/admin/dues:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
