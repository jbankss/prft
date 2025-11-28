import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { brand_id } = await req.json();

    if (!brand_id) {
      throw new Error('brand_id is required');
    }

    // Validate brand exists
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, name')
      .eq('id', brand_id)
      .single();

    if (brandError || !brand) {
      throw new Error('Invalid brand_id');
    }

    console.log(`Sending test webhook for brand: ${brand.name}`);

    // Get webhook secret from database
    const { data: integration, error: integrationError } = await supabase
      .from('brand_integrations')
      .select('webhook_secret')
      .eq('brand_id', brand_id)
      .eq('integration_type', 'shopify')
      .eq('is_active', true)
      .single();

    if (integrationError || !integration?.webhook_secret) {
      throw new Error('Shopify integration not configured for this brand. Please configure it first in the Shopify tab.');
    }

    const secret = integration.webhook_secret;

    // Create a mock Shopify order payload
    const testOrderPayload = {
      id: Math.floor(Math.random() * 1000000000),
      order_number: Math.floor(Math.random() * 10000),
      created_at: new Date().toISOString(),
      total_price: "125.00",
      subtotal_price: "100.00",
      total_tax: "25.00",
      currency: "USD",
      customer: {
        id: Math.floor(Math.random() * 1000000),
        email: "test@example.com",
        first_name: "Test",
        last_name: "Customer"
      },
      line_items: [
        {
          id: Math.floor(Math.random() * 1000000000),
          variant_id: Math.floor(Math.random() * 1000000000),
          title: "Test Product 1",
          quantity: 2,
          price: "25.00",
          vendor: "Test Vendor A",
          sku: "TEST-SKU-001",
          name: "Test Product 1"
        },
        {
          id: Math.floor(Math.random() * 1000000000),
          variant_id: Math.floor(Math.random() * 1000000000),
          title: "Test Product 2",
          quantity: 1,
          price: "50.00",
          vendor: "Test Vendor B",
          sku: "TEST-SKU-002",
          name: "Test Product 2"
        }
      ]
    };

    // Calculate HMAC signature
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(testOrderPayload));
    const keyData = encoder.encode(secret);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
    const hmacBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

    // Call the shopify-orders webhook endpoint
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/shopify-orders?brand_id=${brand_id}`;
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Hmac-Sha256': hmacBase64,
        'X-Shopify-Shop-Domain': 'test-shop.myshopify.com',
        'X-Shopify-Topic': 'orders/create'
      },
      body: JSON.stringify(testOrderPayload)
    });

    const responseText = await webhookResponse.text();
    
    console.log(`Test webhook response: ${webhookResponse.status} - ${responseText}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test webhook sent successfully',
        order_id: testOrderPayload.id,
        response_status: webhookResponse.status
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Test webhook error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
