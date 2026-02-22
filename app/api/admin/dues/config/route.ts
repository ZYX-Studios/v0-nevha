import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server-admin';
import { requireAdminAPI } from "@/lib/supabase/guards"
// GET /api/admin/dues/config - Get dues configuration
export async function GET(request: NextRequest) {
  const authError = await requireAdminAPI()
  if (authError) return authError

  try {
    const denied = await requireAdminAPI()
    if (denied) return denied
    const supabase = createAdminClient();
    
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');
    
    let query = supabase
      .from('hoa_dues_config')
      .select('*')
      .order('dues_year', { ascending: false });
    
    if (year) {
      query = query.eq('dues_year', parseInt(year));
    }
    
    const { data: configs, error } = await query;
    
    if (error) {
      console.error('Error fetching dues config:', error);
      return NextResponse.json({ error: 'Failed to fetch dues configuration' }, { status: 500 });
    }
    
    return NextResponse.json({
      configs: year ? configs : configs,
      current: year ? configs[0] : configs.find((c: any) => c.is_active) || configs[0]
    });
    
  } catch (error) {
    console.error('Error in GET /api/admin/dues/config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/dues/config - Create or update dues configuration
export async function POST(request: NextRequest) {
  const authError = await requireAdminAPI()
  if (authError) return authError

  try {
    const denied = await requireAdminAPI()
    if (denied) return denied
    const supabase = createAdminClient();
    
    const body = await request.json();
    const {
      dues_year,
      annual_amount,
      due_date,
      late_fee_amount = 0,
      late_fee_grace_days = 30,
      is_active = true
    } = body;
    
    // Validate required fields
    if (!dues_year || !annual_amount || !due_date) {
      return NextResponse.json(
        { error: 'Missing required fields: dues_year, annual_amount, due_date' },
        { status: 400 }
      );
    }
    
    if (annual_amount <= 0) {
      return NextResponse.json(
        { error: 'Annual amount must be greater than 0' },
        { status: 400 }
      );
    }
    
    if (dues_year < 2024) {
      return NextResponse.json(
        { error: 'Dues year must be 2024 or later' },
        { status: 400 }
      );
    }
    
    // If setting this config as active, deactivate others for the same year
    if (is_active) {
      await supabase
        .from('hoa_dues_config')
        .update({ is_active: false })
        .eq('dues_year', dues_year);
    }
    
    // Insert or update the configuration
    const { data: config, error } = await supabase
      .from('hoa_dues_config')
      .upsert({
        dues_year,
        annual_amount,
        due_date,
        late_fee_amount,
        late_fee_grace_days,
        is_active,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'dues_year'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error saving dues config:', error);
      return NextResponse.json({ error: 'Failed to save dues configuration' }, { status: 500 });
    }
    
    // Log the activity (Note: actor_user_id will be null since we're using admin client)
    await supabase
      .from('activity_logs')
      .insert({
        actor_user_id: null,
        action: 'DUES_CONFIG_UPDATED',
        entity: 'hoa_dues_config',
        entity_id: config.id,
        diff_json: {
          dues_year,
          annual_amount,
          due_date,
          late_fee_amount,
          late_fee_grace_days,
          is_active
        }
      });
    
    return NextResponse.json({
      success: true,
      config,
      message: 'Dues configuration saved successfully'
    });
    
  } catch (error) {
    console.error('Error in POST /api/admin/dues/config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
