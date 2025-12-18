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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Create progress record for real-time tracking
    const { data: progressRecord, error: progressError } = await supabase
      .from('import_progress')
      .insert({
        brand_id: brand_id,
        status: 'starting',
        total_orders: 0,
        orders_processed: 0,
        invoices_created: 0,
        accounts_created: 0,
        skipped: 0,
        errors: 0,
        error_details: [],
      })
      .select()
      .single();

    if (progressError) {
      console.error('Failed to create progress record:', progressError);
    }

    const progressId = progressRecord?.id;

    // Helper to update progress
    const updateProgress = async (updates: Record<string, unknown>) => {
      if (progressId) {
        await supabase
          .from('import_progress')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', progressId);
      }
    };

    // Update import status
    await supabase
      .from('brand_integrations')
      .update({ 
        import_status: 'importing',
        import_from_date: from_date 
      })
      .eq('brand_id', brand_id)
      .eq('integration_type', 'shopify');

    await updateProgress({ status: 'fetching_orders' });

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
    let totalOrdersFetched = 0;

    // Account cache for smart matching
    const accountCache: Map<string, string> = new Map();

    // Smart account finding with fuzzy matching
    const findOrCreateAccount = async (vendor: string): Promise<string | null> => {
      const normalizedVendor = vendor.trim().toLowerCase();
      
      // Check cache first
      if (accountCache.has(normalizedVendor)) {
        return accountCache.get(normalizedVendor)!;
      }

      // Try exact match (case-insensitive)
      let { data: accounts } = await supabase
        .from('accounts')
        .select('id, account_name')
        .eq('brand_id', brand_id)
        .ilike('account_name', vendor.trim());

      if (accounts && accounts.length > 0) {
        accountCache.set(normalizedVendor, accounts[0].id);
        return accounts[0].id;
      }

      // Try fuzzy match - contains
      const { data: fuzzyAccounts } = await supabase
        .from('accounts')
        .select('id, account_name')
        .eq('brand_id', brand_id)
        .or(`account_name.ilike.%${vendor.trim()}%,account_name.ilike.${vendor.trim()}%`);

      if (fuzzyAccounts && fuzzyAccounts.length > 0) {
        accountCache.set(normalizedVendor, fuzzyAccounts[0].id);
        console.log(`Fuzzy matched "${vendor}" to "${fuzzyAccounts[0].account_name}"`);
        return fuzzyAccounts[0].id;
      }

      // Create new account
      const { data: newAccount, error: createError } = await supabase
        .from('accounts')
        .insert({
          account_name: vendor.trim(),
          brand_id: brand_id,
          balance: 0,
          status: 'active',
          notes: `Auto-created from Shopify import on ${new Date().toISOString().split('T')[0]}`
        })
        .select()
        .single();

      if (createError) {
        console.error(`Failed to create account for ${vendor}:`, createError);
        
        // Self-healing: try to find again in case of race condition
        const { data: retryAccounts } = await supabase
          .from('accounts')
          .select('id')
          .eq('brand_id', brand_id)
          .ilike('account_name', vendor.trim())
          .limit(1);

        if (retryAccounts && retryAccounts.length > 0) {
          accountCache.set(normalizedVendor, retryAccounts[0].id);
          return retryAccounts[0].id;
        }
        
        return null;
      }

      accountCache.set(normalizedVendor, newAccount.id);
      results.accounts_created++;
      return newAccount.id;
    };

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
        totalOrdersFetched += orders.length;

        console.log(`Fetched ${orders.length} orders (total: ${totalOrdersFetched})`);
        
        await updateProgress({ 
          status: 'processing',
          total_orders: totalOrdersFetched 
        });

        // Process each order
        for (const order of orders) {
          try {
            // Process line items
            for (const item of order.line_items || []) {
              const vendor = item.vendor;
              if (!vendor) continue;

              // Create invoice number based on line item to ensure uniqueness
              const invoiceNumber = `SHOP-${order.order_number}-${item.id}`;

              // Check if THIS SPECIFIC line item invoice already exists (duplicate prevention)
              const { data: existing } = await supabase
                .from('invoices')
                .select('id')
                .eq('invoice_number', invoiceNumber)
                .maybeSingle();

              if (existing) {
                results.skipped++;
                continue;
              }

              // Use smart account finding
              const accountId = await findOrCreateAccount(vendor);

              if (!accountId) {
                results.errors.push(`Order ${order.order_number}: Failed to find/create account for vendor "${vendor}"`);
                continue;
              }

              const amount = parseFloat(item.pre_tax_price || (item.price * item.quantity));
              
              // Use upsert with invoice_number as conflict key for extra safety
              const { error: insertError } = await supabase
                .from('invoices')
                .upsert({
                  account_id: accountId,
                  invoice_number: invoiceNumber,
                  amount: amount,
                  status: order.financial_status === 'paid' ? 'paid' : 'pending',
                  paid_date: order.financial_status === 'paid' ? order.created_at.split('T')[0] : null,
                  due_date: order.created_at.split('T')[0],
                  shopify_order_id: order.id.toString(),
                  source: 'shopify',
                  notes: `${vendor}, Qty: ${item.quantity}, Product: ${item.name}`,
                }, {
                  onConflict: 'invoice_number',
                  ignoreDuplicates: true
                });

              if (insertError) {
                // Check if it's a duplicate error - if so, just skip
                if (insertError.message?.includes('duplicate') || insertError.code === '23505') {
                  results.skipped++;
                } else {
                  console.error(`Failed to create invoice:`, insertError);
                  results.errors.push(`Order ${order.order_number}: ${insertError.message}`);
                }
              } else {
                results.invoices_created++;
              }
            }

            results.orders_processed++;

            // Update progress every 5 orders
            if (results.orders_processed % 5 === 0) {
              await updateProgress({
                orders_processed: results.orders_processed,
                invoices_created: results.invoices_created,
                accounts_created: results.accounts_created,
                skipped: results.skipped,
                errors: results.errors.length,
                error_details: results.errors.slice(-10), // Keep last 10 errors
              });
            }
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

    // Final progress update
    await updateProgress({
      status: results.errors.length > 0 ? 'completed_with_errors' : 'completed',
      orders_processed: results.orders_processed,
      invoices_created: results.invoices_created,
      accounts_created: results.accounts_created,
      skipped: results.skipped,
      errors: results.errors.length,
      error_details: results.errors.slice(-20),
      completed_at: new Date().toISOString(),
    });

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
      response_summary: `Imported ${results.orders_processed} orders, ${results.invoices_created} invoices, ${results.accounts_created} accounts, ${results.skipped} skipped`,
      invoices_created: results.invoices_created,
      accounts_created: results.accounts_created,
    });

    console.log(`Import complete: ${results.orders_processed} orders, ${results.invoices_created} invoices, ${results.skipped} skipped`);

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
