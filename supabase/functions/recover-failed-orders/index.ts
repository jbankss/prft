import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brand_id } = await req.json();
    
    if (!brand_id) {
      return new Response(JSON.stringify({ error: 'brand_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Starting recovery for brand: ${brand_id}`);

    // Find failed webhooks that don't have a successful counterpart
    const { data: failedLogs, error: logsError } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('brand_id', brand_id)
      .eq('status', 'error')
      .order('created_at', { ascending: false });

    if (logsError) {
      console.error('Error fetching failed logs:', logsError);
      throw logsError;
    }

    if (!failedLogs || failedLogs.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No failed orders to recover',
        recovered: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${failedLogs.length} failed webhooks to check`);

    const recoveryResults = {
      recovered: 0,
      skipped: 0,
      failed: 0,
      details: [] as any[],
    };

    for (const log of failedLogs) {
      const orderId = log.shopify_order_id;
      if (!orderId) {
        recoveryResults.skipped++;
        continue;
      }

      // Check if this order was already successfully processed
      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('id')
        .eq('shopify_order_id', orderId)
        .maybeSingle();

      if (existingInvoice) {
        console.log(`Order ${orderId} already has invoices, skipping`);
        recoveryResults.skipped++;
        continue;
      }

      // Try to recover from request_data
      const order = log.request_data;
      if (!order || !order.line_items) {
        console.log(`No valid order data for ${orderId}`);
        recoveryResults.skipped++;
        continue;
      }

      try {
        const invoicesToCreate = [];
        const accountsCreated = [];

        for (const item of order.line_items) {
          const vendor = item.vendor;
          if (!vendor) continue;

          // Find or create account
          let { data: accounts } = await supabase
            .from('accounts')
            .select('id, account_name')
            .eq('brand_id', brand_id)
            .ilike('account_name', vendor);

          let account = accounts && accounts.length > 0 ? accounts[0] : null;

          if (!account) {
            console.log(`Creating account for vendor: ${vendor}`);
            const { data: newAccount, error: createError } = await supabase
              .from('accounts')
              .insert({
                account_name: vendor,
                brand_id: brand_id,
                balance: 0,
                status: 'active',
                notes: `Auto-created during recovery on ${new Date().toISOString().split('T')[0]}`
              })
              .select()
              .single();

            if (createError) {
              console.error(`Failed to create account for ${vendor}:`, createError);
              continue;
            }
            account = newAccount;
            accountsCreated.push(vendor);
          }

          if (!account) continue;

          const amount = parseFloat(item.pre_tax_price || (item.price * item.quantity));
          
          invoicesToCreate.push({
            account_id: account.id,
            invoice_number: `SHOP-${order.order_number}-${item.id}`,
            amount: amount,
            status: 'paid',
            paid_date: new Date().toISOString().split('T')[0],
            due_date: new Date().toISOString().split('T')[0],
            shopify_order_id: orderId,
            source: 'shopify',
            notes: `Recovered: Vendor: ${vendor}, Qty: ${item.quantity}, Product: ${item.name}`,
          });
        }

        if (invoicesToCreate.length > 0) {
          const { error: insertError } = await supabase
            .from('invoices')
            .insert(invoicesToCreate);

          if (insertError) {
            console.error(`Failed to create invoices for order ${orderId}:`, insertError);
            recoveryResults.failed++;
            recoveryResults.details.push({
              orderId,
              status: 'failed',
              error: insertError.message,
            });
            continue;
          }

          // Log successful recovery
          await supabase.from('webhook_logs').insert({
            brand_id: brand_id,
            integration_type: 'shopify',
            event_type: 'order_recovered',
            status: 'success',
            request_data: order,
            response_summary: `Recovered ${invoicesToCreate.length} invoice(s), ${accountsCreated.length} new account(s)`,
            shopify_order_id: orderId,
            invoices_created: invoicesToCreate.length,
            accounts_created: accountsCreated.length,
          });

          console.log(`Recovered order ${orderId}: ${invoicesToCreate.length} invoices`);
          recoveryResults.recovered++;
          recoveryResults.details.push({
            orderId,
            status: 'recovered',
            invoices: invoicesToCreate.length,
            newAccounts: accountsCreated,
          });
        }
      } catch (err) {
        console.error(`Error recovering order ${orderId}:`, err);
        recoveryResults.failed++;
        recoveryResults.details.push({
          orderId,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    console.log(`Recovery complete: ${recoveryResults.recovered} recovered, ${recoveryResults.skipped} skipped, ${recoveryResults.failed} failed`);

    return new Response(JSON.stringify(recoveryResults), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Recovery error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
