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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
    
    for (const item of order.line_items) {
      const vendor = item.vendor;
      if (!vendor) continue;

      // Find matching account by vendor name (case-insensitive)
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id, brand_id, account_name')
        .ilike('account_name', vendor);

      if (accounts && accounts.length > 0) {
        const account = accounts[0];
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

        console.log(`Matched vendor "${vendor}" to account "${account.account_name}"`);
      } else {
        console.log(`No matching account found for vendor: ${vendor}`);
      }
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
        invoices_created: invoicesToCreate.length 
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
