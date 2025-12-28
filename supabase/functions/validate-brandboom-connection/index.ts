import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, environment, brandId } = await req.json();

    if (!apiKey || !environment || !brandId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: apiKey, environment, brandId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine BrandBoom API base URL based on environment
    const baseUrl = environment === 'sandbox' 
      ? 'https://manage.brandboom.net/api/v1'
      : 'https://manage.brandboom.com/api/v1';

    console.log(`Testing BrandBoom connection to ${baseUrl}`);

    // Test the connection by fetching account info or orders
    // Note: BrandBoom API documentation is limited, this is a best-effort implementation
    const testResponse = await fetch(`${baseUrl}/orders?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.error('BrandBoom API error:', testResponse.status, errorText);
      
      if (testResponse.status === 401 || testResponse.status === 403) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid API key or insufficient permissions. Please verify your credentials.' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `BrandBoom API error: ${testResponse.status}` 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await testResponse.json();
    console.log('BrandBoom connection successful');

    // Initialize Supabase to save the connection
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if integration already exists
    const { data: existing } = await supabase
      .from('brand_integrations')
      .select('id')
      .eq('brand_id', brandId)
      .eq('integration_type', 'brandboom')
      .maybeSingle();

    const shopDomain = environment === 'sandbox' 
      ? 'manage.brandboom.net' 
      : 'manage.brandboom.com';

    if (existing) {
      // Update existing integration
      await supabase
        .from('brand_integrations')
        .update({
          api_access_token: apiKey,
          shop_domain: shopDomain,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      // Create new integration
      await supabase
        .from('brand_integrations')
        .insert({
          brand_id: brandId,
          integration_type: 'brandboom',
          api_access_token: apiKey,
          shop_domain: shopDomain,
          is_active: true
        });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Successfully connected to BrandBoom',
        environment,
        orderCount: data?.orders?.length || 0
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error validating BrandBoom connection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
