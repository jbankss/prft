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
    const { brand_id, from_date } = await req.json();
    
    if (!brand_id || !from_date) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Missing required parameters: brand_id, from_date' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the integration config to get the stored API token
    const { data: integration, error: integrationError } = await supabase
      .from('brand_integrations')
      .select('api_access_token, shop_domain')
      .eq('brand_id', brand_id)
      .eq('integration_type', 'shopify')
      .single();

    if (integrationError || !integration) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Shopify integration not configured. Please complete the setup wizard first.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!integration.api_access_token || !integration.shop_domain) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'API access token or shop domain not configured. Please reconfigure the integration.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const access_token = integration.api_access_token;
    const shop_domain = integration.shop_domain;

    console.log(`Starting historical import for brand ${brand_id} from ${from_date}`);

    // Update import status
    await supabase
      .from('brand_integrations')
      .update({ 
        import_status: 'importing',
        import_from_date: from_date 
      })
      .eq('brand_id', brand_id)
      .eq('integration_type', 'shopify');

    const results = {
      success: true,
      orders_processed: 0,
      invoices_created: 0,
      accounts_created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    let hasNextPage = true;
    let pageInfo = '';
    const pageSize = 50;

    try {
      while (hasNextPage) {
        // Build the API URL
        let url = `https://${shop_domain}/admin/api/2024-01/orders.json?status=any&limit=${pageSize}&created_at_min=${from_date}T00:00:00Z`;
        
        if (pageInfo) {
          url = `https://${shop_domain}/admin/api/2024-01/orders.json?page_info=${pageInfo}&limit=${pageSize}`;
        }

        console.log(`Fetching orders from: ${url}`);

        const response = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': access_token,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Shopify API error: ${response.status} - ${errorText}`);
          throw new Error(`Shopify API error: ${response.status}`);
        }

        const data = await response.json();
        const orders = data.orders || [];

        console.log(`Fetched ${orders.length} orders`);

        // Process each order
        for (const order of orders) {
          try {
            // Check if order already exists
            const { data: existing } = await supabase
              .from('invoices')
              .select('id')
              .eq('shopify_order_id', order.id.toString())
              .maybeSingle();

            if (existing) {
              results.skipped++;
              continue;
            }

            // Process line items
            for (const item of order.line_items || []) {
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
                const { data: newAccount, error: createError } = await supabase
                  .from('accounts')
                  .insert({
                    account_name: vendor,
                    brand_id: brand_id,
                    balance: 0,
                    status: 'active',
                    notes: `Auto-created from historical import on ${new Date().toISOString().split('T')[0]}`
                  })
                  .select()
                  .single();

                if (createError) {
                  console.error(`Failed to create account for ${vendor}:`, createError);
                  continue;
                }
                account = newAccount;
                results.accounts_created++;
              }

              if (!account) continue;

              const amount = parseFloat(item.pre_tax_price || (item.price * item.quantity));
              
              const { error: insertError } = await supabase
                .from('invoices')
                .insert({
                  account_id: account.id,
                  invoice_number: `SHOP-${order.order_number}-${item.id}`,
                  amount: amount,
                  status: order.financial_status === 'paid' ? 'paid' : 'pending',
                  paid_date: order.financial_status === 'paid' ? order.created_at.split('T')[0] : null,
                  due_date: order.created_at.split('T')[0],
                  shopify_order_id: order.id.toString(),
                  source: 'shopify',
                  notes: `Historical import: ${vendor}, Qty: ${item.quantity}, Product: ${item.name}`,
                });

              if (insertError) {
                console.error(`Failed to create invoice:`, insertError);
                results.errors.push(`Order ${order.order_number}: ${insertError.message}`);
              } else {
                results.invoices_created++;
              }
            }

            results.orders_processed++;
          } catch (err) {
            console.error(`Error processing order ${order.id}:`, err);
            results.errors.push(`Order ${order.order_number}: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }

        // Check for pagination
        const linkHeader = response.headers.get('link');
        if (linkHeader && linkHeader.includes('rel="next"')) {
          const match = linkHeader.match(/page_info=([^>]+)>; rel="next"/);
          if (match) {
            pageInfo = match[1];
          } else {
            hasNextPage = false;
          }
        } else {
          hasNextPage = false;
        }

        // Small delay to avoid rate limiting
        if (hasNextPage) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (err) {
      console.error('Import error:', err);
      results.errors.push(err instanceof Error ? err.message : 'Unknown error');
      results.success = false;
    }

    // Update import status
    await supabase
      .from('brand_integrations')
      .update({ 
        import_status: results.errors.length > 0 ? 'completed_with_errors' : 'completed',
        last_import_at: new Date().toISOString()
      })
      .eq('brand_id', brand_id)
      .eq('integration_type', 'shopify');

    // Log the import
    await supabase.from('webhook_logs').insert({
      brand_id: brand_id,
      integration_type: 'shopify',
      event_type: 'historical_import',
      status: results.errors.length > 0 ? 'completed_with_errors' : 'success',
      response_summary: `Imported ${results.orders_processed} orders, ${results.invoices_created} invoices, ${results.accounts_created} accounts`,
      invoices_created: results.invoices_created,
      accounts_created: results.accounts_created,
    });

    console.log(`Import complete: ${results.orders_processed} orders, ${results.invoices_created} invoices`);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Import error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
