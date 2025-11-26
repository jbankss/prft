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

  try {
    const webhookSecret = Deno.env.get('SHOPIFY_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('SHOPIFY_WEBHOOK_SECRET not configured');
      return new Response('Webhook secret not configured', { status: 500 });
    }

    // Get the HMAC header
    const hmacHeader = req.headers.get('X-Shopify-Hmac-Sha256');
    if (!hmacHeader) {
      console.error('Missing HMAC header');
      return new Response('Unauthorized', { status: 401 });
    }

    // Get raw body for verification
    const rawBody = await req.text();
    
    // Verify webhook signature
    const isValid = await verifyShopifyWebhook(rawBody, hmacHeader, webhookSecret);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response('Unauthorized', { status: 401 });
    }

    // Parse the order data
    const order = JSON.parse(rawBody);
    console.log('Processing Shopify order:', order.id);

    // Get brand_id from query params (must match "Enzo Milwaukee")
    const url = new URL(req.url);
    const brandId = url.searchParams.get('brand_id');
    
    if (!brandId) {
      console.error('Missing brand_id parameter');
      return new Response('Brand ID required', { status: 400 });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify brand exists and is "Enzo Milwaukee"
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

    // Check if we've already processed this order
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('shopify_order_id', order.id.toString())
      .maybeSingle();

    if (existingInvoice) {
      console.log('Order already processed:', order.id);
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
        brand_id: account.brand_id,
        invoice_number: `SHOP-${order.order_number}-${item.id}`,
        amount: amount,
        description: `Shopify Order #${order.order_number} - ${item.name}`,
        status: 'paid',
        paid_date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        shopify_order_id: order.id.toString(),
        source: 'shopify',
        notes: `Vendor: ${vendor}, Quantity: ${item.quantity}`,
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
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
