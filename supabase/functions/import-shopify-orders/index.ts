import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
} | undefined;

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
    const { brand_id, from_date, mode = 'import', repair = false } = await req.json();
    
    if (!brand_id || !from_date) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Missing required parameters: brand_id, from_date' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the integration config
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

    // SCAN MODE: Just count orders and check what's new
    if (mode === 'scan') {
      console.log(`Scanning orders for brand ${brand_id} from ${from_date}`);
      
      const scanResult = await scanOrders(supabase, shop_domain, access_token, brand_id, from_date);
      
      return new Response(JSON.stringify({
        success: true,
        mode: 'scan',
        ...scanResult
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // REPAIR MODE: Wipe existing data first
    if (repair) {
      console.log(`Repair mode: wiping existing Shopify data for brand ${brand_id}`);
      
      // Get accounts first, then delete invoices
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id')
        .eq('brand_id', brand_id);
      
      if (accounts && accounts.length > 0) {
        const accountIds = (accounts as any[]).map((a: any) => a.id);
        await supabase
          .from('invoices')
          .delete()
          .eq('source', 'shopify')
          .in('account_id', accountIds);
      }
      
      console.log('Existing Shopify invoices cleared');
    }

    console.log(`Starting historical import for brand ${brand_id} from ${from_date}`);

    // Create progress record
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

    const progressId = (progressRecord as any)?.id;

    // Update import status
    await supabase
      .from('brand_integrations')
      .update({ 
        import_status: 'importing',
        import_from_date: from_date 
      })
      .eq('brand_id', brand_id)
      .eq('integration_type', 'shopify');

    // Run import in background so user doesn't need to stay on page
    const importPromise = runImport(
      supabase, 
      shop_domain, 
      access_token, 
      brand_id, 
      from_date, 
      progressId
    );

    // Use EdgeRuntime.waitUntil for background execution
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) {
      EdgeRuntime.waitUntil(importPromise);
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Import started in background. You can leave this page.',
        progress_id: progressId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Fallback: run synchronously
      const results = await importPromise;
      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

// Scan orders to count what needs to be imported
async function scanOrders(
  supabase: any,
  shop_domain: string,
  access_token: string,
  brand_id: string,
  from_date: string
) {
  let totalOrders = 0;
  let newOrders = 0;
  let existingOrders = 0;
  let hasNextPage = true;
  let pageInfo = '';
  const pageSize = 250; // Max for counting

  // Get existing invoice numbers for this brand
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id')
    .eq('brand_id', brand_id);
  
  const accountIds = (accounts as any[] || []).map((a: any) => a.id);
  
  let existingSet = new Set<string>();
  
  if (accountIds.length > 0) {
    const { data: existingInvoices } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('source', 'shopify')
      .in('account_id', accountIds);
    
    existingSet = new Set((existingInvoices as any[] || []).map((i: any) => i.invoice_number));
  }

  while (hasNextPage) {
    let url = `https://${shop_domain}/admin/api/2024-01/orders.json?status=any&limit=${pageSize}&created_at_min=${from_date}T00:00:00Z`;
    
    if (pageInfo) {
      url = `https://${shop_domain}/admin/api/2024-01/orders.json?page_info=${pageInfo}&limit=${pageSize}`;
    }

    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': access_token,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data = await response.json();
    const orders = data.orders || [];
    
    for (const order of orders) {
      totalOrders++;
      let orderHasNewItems = false;
      
      for (const item of order.line_items || []) {
        if (!item.vendor) continue;
        const invoiceNumber = `SHOP-${order.order_number}-${item.id}`;
        
        if (!existingSet.has(invoiceNumber)) {
          orderHasNewItems = true;
          break;
        }
      }
      
      if (orderHasNewItems) {
        newOrders++;
      } else {
        existingOrders++;
      }
    }

    // Check pagination
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

    // Rate limit protection
    if (hasNextPage) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return {
    total_orders: totalOrders,
    new_orders: newOrders,
    existing_orders: existingOrders
  };
}

// Run the actual import
async function runImport(
  supabase: any,
  shop_domain: string,
  access_token: string,
  brand_id: string,
  from_date: string,
  progressId: string | null
) {
  const updateProgress = async (updates: Record<string, unknown>) => {
    if (progressId) {
      await supabase
        .from('import_progress')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', progressId);
    }
  };

  await updateProgress({ status: 'fetching_orders' });

  const results = {
    success: true,
    orders_processed: 0,
    invoices_created: 0,
    accounts_created: 0,
    errors: [] as string[],
  };

  let hasNextPage = true;
  let pageInfo = '';
  const pageSize = 50;
  let totalOrdersFetched = 0;

  // Account cache for smart matching
  const accountCache: Map<string, string> = new Map();

  const findOrCreateAccount = async (vendor: string): Promise<string | null> => {
    const normalizedVendor = vendor.trim().toLowerCase();
    
    if (accountCache.has(normalizedVendor)) {
      return accountCache.get(normalizedVendor)!;
    }

    // Try exact match (case-insensitive)
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, account_name')
      .eq('brand_id', brand_id)
      .ilike('account_name', vendor.trim());

    if (accounts && accounts.length > 0) {
      accountCache.set(normalizedVendor, (accounts as any[])[0].id);
      return (accounts as any[])[0].id;
    }

    // Try fuzzy match
    const { data: fuzzyAccounts } = await supabase
      .from('accounts')
      .select('id, account_name')
      .eq('brand_id', brand_id)
      .or(`account_name.ilike.%${vendor.trim()}%,account_name.ilike.${vendor.trim()}%`);

    if (fuzzyAccounts && fuzzyAccounts.length > 0) {
      accountCache.set(normalizedVendor, (fuzzyAccounts as any[])[0].id);
      console.log(`Fuzzy matched "${vendor}" to "${(fuzzyAccounts as any[])[0].account_name}"`);
      return (fuzzyAccounts as any[])[0].id;
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
      
      // Self-healing: retry find
      const { data: retryAccounts } = await supabase
        .from('accounts')
        .select('id')
        .eq('brand_id', brand_id)
        .ilike('account_name', vendor.trim())
        .limit(1);

      if (retryAccounts && retryAccounts.length > 0) {
        accountCache.set(normalizedVendor, (retryAccounts as any[])[0].id);
        return (retryAccounts as any[])[0].id;
      }
      
      return null;
    }

    accountCache.set(normalizedVendor, (newAccount as any).id);
    results.accounts_created++;
    return (newAccount as any).id;
  };

  try {
    while (hasNextPage) {
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

      for (const order of orders) {
        try {
          // Use actual order date from Shopify, not import time
          const orderDate = order.created_at.split('T')[0];
          
          for (const item of order.line_items || []) {
            const vendor = item.vendor;
            if (!vendor) continue;

            const invoiceNumber = `SHOP-${order.order_number}-${item.id}`;

            // Check if exists
            const { data: existing } = await supabase
              .from('invoices')
              .select('id')
              .eq('invoice_number', invoiceNumber)
              .maybeSingle();

            if (existing) {
              continue; // Skip silently - already imported
            }

            const accountId = await findOrCreateAccount(vendor);

            if (!accountId) {
              results.errors.push(`Order ${order.order_number}: Failed to find/create account for "${vendor}"`);
              continue;
            }

            const amount = parseFloat(item.pre_tax_price || String(item.price * item.quantity));
            
            // Use actual order date for due_date and paid_date
            const { error: insertError } = await supabase
              .from('invoices')
              .upsert({
                account_id: accountId,
                invoice_number: invoiceNumber,
                amount: amount,
                status: order.financial_status === 'paid' ? 'paid' : 'pending',
                paid_date: order.financial_status === 'paid' ? orderDate : null,
                due_date: orderDate, // Use actual order date
                shopify_order_id: order.id.toString(),
                source: 'shopify',
                notes: `${vendor}, Qty: ${item.quantity}, Product: ${item.name}`,
                created_at: order.created_at, // Preserve original order timestamp
              }, {
                onConflict: 'invoice_number',
                ignoreDuplicates: true
              });

            if (insertError) {
              if (!insertError.message?.includes('duplicate') && insertError.code !== '23505') {
                console.error(`Failed to create invoice:`, insertError);
                results.errors.push(`Order ${order.order_number}: ${insertError.message}`);
              }
            } else {
              results.invoices_created++;
            }
          }

          results.orders_processed++;

          if (results.orders_processed % 5 === 0) {
            await updateProgress({
              orders_processed: results.orders_processed,
              invoices_created: results.invoices_created,
              accounts_created: results.accounts_created,
              errors: results.errors.length,
              error_details: results.errors.slice(-10),
            });
          }
        } catch (err) {
          console.error(`Error processing order ${order.id}:`, err);
          results.errors.push(`Order ${order.order_number}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      // Pagination
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

      if (hasNextPage) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  } catch (err) {
    console.error('Import error:', err);
    results.errors.push(err instanceof Error ? err.message : 'Unknown error');
    results.success = false;
  }

  // Final update
  await updateProgress({
    status: results.errors.length > 0 ? 'completed_with_errors' : 'completed',
    orders_processed: results.orders_processed,
    invoices_created: results.invoices_created,
    accounts_created: results.accounts_created,
    skipped: 0, // Not tracking skipped anymore
    errors: results.errors.length,
    error_details: results.errors.slice(-20),
    completed_at: new Date().toISOString(),
  });

  await supabase
    .from('brand_integrations')
    .update({ 
      import_status: results.errors.length > 0 ? 'completed_with_errors' : 'completed',
      last_import_at: new Date().toISOString()
    })
    .eq('brand_id', brand_id)
    .eq('integration_type', 'shopify');

  await supabase.from('webhook_logs').insert({
    brand_id: brand_id,
    integration_type: 'shopify',
    event_type: 'historical_import',
    status: results.errors.length > 0 ? 'completed_with_errors' : 'success',
    response_summary: `Imported ${results.orders_processed} orders, ${results.invoices_created} invoices, ${results.accounts_created} new accounts`,
    invoices_created: results.invoices_created,
    accounts_created: results.accounts_created,
  });

  console.log(`Import complete: ${results.orders_processed} orders, ${results.invoices_created} invoices`);

  return results;
}

// Add shutdown handler for background tasks
addEventListener('beforeunload', (ev: Event) => {
  console.log('Function shutdown');
});
