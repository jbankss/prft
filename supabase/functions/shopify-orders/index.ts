import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Verify Shopify webhook signature
async function verifyShopifyWebhook(
  body: string,
  hmacHeader: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(body)
  );
  
  const hashArray = Array.from(new Uint8Array(signature));
  const hashBase64 = btoa(String.fromCharCode(...hashArray));
  
  return hashBase64 === hmacHeader;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let supabase: any;
  let brandId: string | null = null;
  let order: any = null;

  try {
    // Get raw body for verification
    const rawBody = await req.text();
    order = JSON.parse(rawBody);
    console.log('Processing Shopify order:', order.id);

    // Get brand_id from query params
    const url = new URL(req.url);
    brandId = url.searchParams.get('brand_id');
    
    if (!brandId) {
      console.error('Missing brand_id parameter');
      
      // Log the error
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const tempSupabase = createClient(supabaseUrl, supabaseKey);
      
      await tempSupabase.from('webhook_logs').insert({
        brand_id: '00000000-0000-0000-0000-000000000000', // placeholder for missing brand
        integration_type: 'shopify',
        event_type: 'order_created',
        status: 'error',
        request_data: { order_id: order?.id },
        error_message: 'Missing brand_id parameter',
        shopify_order_id: order?.id?.toString()
      });
      
      return new Response('Brand ID required', { status: 400 });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    supabase = createClient(supabaseUrl, supabaseKey);

    // Verify brand exists and get webhook secret
    const { data: brand } = await supabase
      .from('brands')
      .select('id, name')
      .eq('id', brandId)
      .maybeSingle();

    if (!brand) {
      console.error('Brand not found:', brandId);
      return new Response('Invalid brand', { status: 400 });
    }

    console.log('Processing order for brand:', brand.name);

    // Get webhook secret from database
    const { data: integration, error: integrationError } = await supabase
      .from('brand_integrations')
      .select('webhook_secret')
      .eq('brand_id', brandId)
      .eq('integration_type', 'shopify')
      .eq('is_active', true)
      .single();

    if (integrationError || !integration?.webhook_secret) {
      console.error('Shopify integration not configured for brand:', brandId);
      
      await supabase.from('webhook_logs').insert({
        brand_id: brandId,
        integration_type: 'shopify',
        event_type: 'order_created',
        status: 'error',
        request_data: order,
        error_message: 'Shopify integration not configured for this brand',
        shopify_order_id: order.id.toString()
      });
      
      return new Response('Shopify integration not configured', { status: 400 });
    }

    // Verify the webhook signature
    const hmacHeader = req.headers.get('X-Shopify-Hmac-Sha256');
    if (!hmacHeader) {
      console.error('Missing HMAC header');
      return new Response('Unauthorized', { status: 401 });
    }

    const isValid = await verifyShopifyWebhook(rawBody, hmacHeader, integration.webhook_secret);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response('Unauthorized', { status: 401 });
    }

    // Check if we've already processed this order
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('shopify_order_id', order.id.toString())
      .maybeSingle();

    if (existingInvoice) {
      console.log('Order already processed:', order.id);
      
      // Log duplicate order
      await supabase.from('webhook_logs').insert({
        brand_id: brandId,
        integration_type: 'shopify',
        event_type: 'order_created',
        status: 'skipped',
        request_data: order,
        response_summary: 'Order already processed',
        shopify_order_id: order.id.toString(),
        invoices_created: 0,
        accounts_created: 0
      });
      
      return new Response(JSON.stringify({ message: 'Order already processed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Process each line item
    const invoicesToCreate = [];
    const accountsCreated = [];
    
    for (const item of order.line_items) {
      const vendor = item.vendor;
      if (!vendor) continue;

      // Find matching account by vendor name (case-insensitive) within this brand
      let { data: accounts } = await supabase
        .from('accounts')
        .select('id, brand_id, account_name')
        .eq('brand_id', brandId)
        .ilike('account_name', vendor);

      let account = accounts && accounts.length > 0 ? accounts[0] : null;

      // If no account exists, create one
      if (!account) {
        console.log(`Creating new account for vendor: ${vendor}`);
        const { data: newAccount, error: createError } = await supabase
          .from('accounts')
          .insert({
            account_name: vendor,
            brand_id: brandId,
            balance: 0,
            status: 'active',
            notes: `Auto-created from Shopify integration on ${new Date().toISOString().split('T')[0]}`
          })
          .select()
          .single();

        if (createError || !newAccount) {
          console.error('Error creating account:', createError);
          continue;
        }

        account = newAccount;
        accountsCreated.push(vendor);
        console.log(`Created account for vendor "${vendor}"`);
      }

      // At this point, account is guaranteed to be non-null
      if (!account) continue; // Type narrowing for TypeScript
      
      const amount = parseFloat(item.price) * item.quantity;
      
      invoicesToCreate.push({
        account_id: account.id,
        invoice_number: `SHOP-${order.order_number}-${item.id}`,
        amount: amount,
        status: 'paid',
        paid_date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        shopify_order_id: order.id.toString(),
        source: 'shopify',
        notes: `Vendor: ${vendor}, Quantity: ${item.quantity}, Product: ${item.name}`,
      });

      console.log(`Processed vendor "${vendor}" for account "${account.account_name}"`);
    }

    // Insert all invoices
    if (invoicesToCreate.length > 0) {
      const { error } = await supabase
        .from('invoices')
        .insert(invoicesToCreate);

      if (error) {
        console.error('Error creating invoices:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Created ${invoicesToCreate.length} invoices for order ${order.id}`);
    } else {
      console.log('No matching accounts found for any line items');
    }

    // Log successful processing
    await supabase.from('webhook_logs').insert({
      brand_id: brandId,
      integration_type: 'shopify',
      event_type: 'order_created',
      status: 'success',
      request_data: order,
      response_summary: `Created ${invoicesToCreate.length} invoice(s) for ${accountsCreated.length > 0 ? accountsCreated.length + ' new account(s)' : 'existing accounts'}`,
      shopify_order_id: order.id.toString(),
      invoices_created: invoicesToCreate.length,
      accounts_created: accountsCreated.length
    });

    return new Response(
      JSON.stringify({ 
        message: 'Order processed successfully',
        invoices_created: invoicesToCreate.length,
        accounts_created: accountsCreated.length,
        new_accounts: accountsCreated
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Log the error
    if (supabase && brandId) {
      await supabase.from('webhook_logs').insert({
        brand_id: brandId,
        integration_type: 'shopify',
        event_type: 'order_created',
        status: 'error',
        request_data: order,
        error_message: errorMessage,
        shopify_order_id: order?.id?.toString(),
        invoices_created: 0,
        accounts_created: 0
      });
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});