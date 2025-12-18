import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
} | undefined;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration
const CHUNK_SIZE = 250; // Orders per chunk
const BATCH_INSERT_SIZE = 50; // Orders per batch insert
const PROGRESS_UPDATE_INTERVAL = 25; // Update progress every N orders
const SHOPIFY_PAGE_SIZE = 50; // Orders per Shopify API call
const INTER_PAGE_DELAY_MS = 300; // Delay between Shopify API calls

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { 
      brand_id, 
      from_date, 
      mode = 'import', 
      repair = false,
      expected_new_orders = 0,
      page_cursor = null,
      chunk_number = 1,
      progress_id = null
    } = await req.json();
    
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

    // REPAIR MODE: Wipe existing data first (only on first chunk)
    if (repair && chunk_number === 1) {
      console.log(`Repair mode: wiping existing Shopify orders for brand ${brand_id}`);
      
      await supabase
        .from('shopify_orders')
        .delete()
        .eq('brand_id', brand_id);
      
      console.log('Existing Shopify orders cleared');
    }

    console.log(`Starting chunk ${chunk_number} import for brand ${brand_id} from ${from_date}`);

    let currentProgressId = progress_id;

    // Create progress record only on first chunk
    if (!currentProgressId) {
      const totalChunksEstimate = expected_new_orders > 0 
        ? Math.ceil(expected_new_orders / CHUNK_SIZE) 
        : 1;

      const { data: progressRecord, error: progressError } = await supabase
        .from('import_progress')
        .insert({
          brand_id: brand_id,
          status: 'starting',
          total_orders: 0,
          orders_processed: 0,
          invoices_created: 0, // Now tracks orders created, not invoices
          accounts_created: 0,
          skipped: 0,
          errors: 0,
          error_details: [],
          expected_new_orders: expected_new_orders,
          chunk_number: 1,
          total_chunks_estimate: totalChunksEstimate,
        })
        .select()
        .single();

      if (progressError) {
        console.error('Failed to create progress record:', progressError);
      }

      currentProgressId = (progressRecord as any)?.id;
    } else {
      // Update chunk number for existing progress
      await supabase
        .from('import_progress')
        .update({ 
          chunk_number: chunk_number,
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', currentProgressId);
    }

    // Update import status
    await supabase
      .from('brand_integrations')
      .update({ 
        import_status: 'importing',
        import_from_date: from_date 
      })
      .eq('brand_id', brand_id)
      .eq('integration_type', 'shopify');

    // Run import chunk in background
    const importPromise = runChunkedImport(
      supabase, 
      shop_domain, 
      access_token, 
      brand_id, 
      from_date, 
      currentProgressId,
      page_cursor,
      chunk_number,
      expected_new_orders
    );

    // Use EdgeRuntime.waitUntil for background execution
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) {
      EdgeRuntime.waitUntil(importPromise);
      
      return new Response(JSON.stringify({
        success: true,
        message: `Chunk ${chunk_number} started. Import continues in background.`,
        progress_id: currentProgressId,
        chunk_number: chunk_number
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

  // Get existing order line item keys for this brand
  const { data: existingOrderData } = await supabase
    .from('shopify_orders')
    .select('order_number, line_item_id')
    .eq('brand_id', brand_id);
  
  const existingSet = new Set<string>(
    (existingOrderData as any[] || []).map((o: any) => `${o.order_number}-${o.line_item_id}`)
  );

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
        const key = `${order.order_number}-${item.id}`;
        
        if (!existingSet.has(key)) {
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

// Run chunked import with batch inserts and time estimates
async function runChunkedImport(
  supabase: any,
  shop_domain: string,
  access_token: string,
  brand_id: string,
  from_date: string,
  progressId: string | null,
  startCursor: string | null,
  chunkNumber: number,
  expectedNewOrders: number
) {
  const chunkStartTime = Date.now();
  let ordersInChunk = 0;
  let orderTimesMs: number[] = [];

  // Get current progress from database
  let cumulativeProgress = {
    orders_processed: 0,
    orders_created: 0,
    errors: [] as string[],
    total_orders: 0,
  };

  if (progressId && chunkNumber > 1) {
    const { data: existingProgress } = await supabase
      .from('import_progress')
      .select('orders_processed, invoices_created, errors, error_details, total_orders')
      .eq('id', progressId)
      .single();
    
    if (existingProgress) {
      cumulativeProgress = {
        orders_processed: existingProgress.orders_processed || 0,
        orders_created: existingProgress.invoices_created || 0, // Using invoices_created field for orders
        errors: (existingProgress.error_details as string[]) || [],
        total_orders: existingProgress.total_orders || 0,
      };
    }
  }

  const updateProgress = async (updates: Record<string, unknown>) => {
    if (progressId) {
      await supabase
        .from('import_progress')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', progressId);
    }
  };

  await updateProgress({ status: 'processing', chunk_number: chunkNumber });

  // Pre-fetch all existing order keys (huge optimization!)
  console.log('Pre-fetching existing orders...');
  const { data: existingOrderData } = await supabase
    .from('shopify_orders')
    .select('order_number, line_item_id')
    .eq('brand_id', brand_id);
  
  const existingOrderSet = new Set<string>(
    (existingOrderData as any[] || []).map((o: any) => `${o.order_number}-${o.line_item_id}`)
  );
  console.log(`Found ${existingOrderSet.size} existing order line items`);

  let ordersCreatedInChunk = 0;
  let errorsInChunk: string[] = [];
  let nextCursor: string | null = null;

  let hasNextPage = true;
  let pageInfo = startCursor || '';
  let totalOrdersFetched = cumulativeProgress.total_orders;

  // Batch insert buffer
  let orderBatch: any[] = [];

  const flushOrderBatch = async () => {
    if (orderBatch.length === 0) return;
    
    const { error: batchError } = await supabase
      .from('shopify_orders')
      .upsert(orderBatch, {
        onConflict: 'brand_id,order_number,line_item_id',
        ignoreDuplicates: true
      });

    if (batchError) {
      console.error('Batch insert error:', batchError);
      errorsInChunk.push(`Batch insert failed: ${batchError.message}`);
    } else {
      ordersCreatedInChunk += orderBatch.length;
    }
    
    orderBatch = [];
  };

  try {
    while (hasNextPage && ordersInChunk < CHUNK_SIZE) {
      const orderStartTime = Date.now();
      
      let url: string;
      if (pageInfo) {
        url = `https://${shop_domain}/admin/api/2024-01/orders.json?page_info=${pageInfo}&limit=${SHOPIFY_PAGE_SIZE}`;
      } else {
        url = `https://${shop_domain}/admin/api/2024-01/orders.json?status=any&limit=${SHOPIFY_PAGE_SIZE}&created_at_min=${from_date}T00:00:00Z`;
      }

      console.log(`Fetching orders (chunk ${chunkNumber}, orders in chunk: ${ordersInChunk})`);

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

      for (const order of orders) {
        if (ordersInChunk >= CHUNK_SIZE) {
          // We've hit chunk limit, save cursor for next chunk
          const linkHeader = response.headers.get('link');
          if (linkHeader && linkHeader.includes('rel="next"')) {
            const match = linkHeader.match(/page_info=([^>]+)>; rel="next"/);
            if (match) {
              nextCursor = match[1];
            }
          }
          break;
        }

        try {
          const orderStartMs = Date.now();
          
          // Determine source from sales channel
          let source = 'online';
          if (order.source_name === 'pos' || order.source_name === 'shopify_pos') {
            source = 'pos';
          } else if (order.source_name?.toLowerCase().includes('tiktok')) {
            source = 'tiktok';
          }
          
          for (const item of order.line_items || []) {
            const vendor = item.vendor;
            if (!vendor) continue;

            const key = `${order.order_number}-${item.id}`;

            // Skip if already exists (using pre-fetched set - very fast!)
            if (existingOrderSet.has(key)) {
              continue;
            }

            const amount = parseFloat(item.pre_tax_price || String(parseFloat(item.price) * item.quantity));
            
            // Add to batch - this is REVENUE data
            orderBatch.push({
              brand_id: brand_id,
              shopify_order_id: order.id.toString(),
              order_number: order.order_number.toString(),
              order_date: order.created_at,
              customer_name: order.customer?.first_name 
                ? `${order.customer.first_name} ${order.customer.last_name || ''}`.trim()
                : 'Guest',
              customer_email: order.customer?.email || null,
              vendor: vendor,
              product_name: item.name,
              line_item_id: item.id.toString(),
              quantity: item.quantity,
              unit_price: parseFloat(item.price),
              total_amount: amount,
              source: source,
              status: order.financial_status === 'paid' ? 'completed' : 'pending',
              raw_data: { 
                order_name: order.name,
                fulfillment_status: order.fulfillment_status,
                financial_status: order.financial_status
              },
            });

            // Add to existing set to prevent duplicates within this import
            existingOrderSet.add(key);

            // Flush batch if full
            if (orderBatch.length >= BATCH_INSERT_SIZE) {
              await flushOrderBatch();
            }
          }

          ordersInChunk++;
          orderTimesMs.push(Date.now() - orderStartMs);

          // Update progress periodically
          if (ordersInChunk % PROGRESS_UPDATE_INTERVAL === 0) {
            // Calculate time estimate
            const avgOrderTime = orderTimesMs.length > 0 
              ? orderTimesMs.reduce((a, b) => a + b, 0) / orderTimesMs.length 
              : 100;
            
            const remainingOrders = expectedNewOrders > 0 
              ? expectedNewOrders - (cumulativeProgress.orders_created + ordersCreatedInChunk + orderBatch.length)
              : 0;
            
            const estimatedRemainingMs = remainingOrders * avgOrderTime;
            const estimatedCompletion = new Date(Date.now() + estimatedRemainingMs);

            await updateProgress({
              status: 'processing',
              total_orders: totalOrdersFetched,
              orders_processed: cumulativeProgress.orders_processed + ordersInChunk,
              invoices_created: cumulativeProgress.orders_created + ordersCreatedInChunk + orderBatch.length, // orders created
              accounts_created: 0, // No accounts created from Shopify imports
              errors: cumulativeProgress.errors.length + errorsInChunk.length,
              error_details: [...cumulativeProgress.errors, ...errorsInChunk].slice(-20),
              current_order_number: `#${order.order_number}`,
              current_order_date: order.created_at,
              chunk_number: chunkNumber,
              avg_order_time_ms: Math.round(avgOrderTime),
              estimated_completion_at: estimatedCompletion.toISOString(),
            });
          }
        } catch (err) {
          console.error(`Error processing order ${order.id}:`, err);
          errorsInChunk.push(`Order ${order.order_number}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      // Check for more pages
      const linkHeader = response.headers.get('link');
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const match = linkHeader.match(/page_info=([^>]+)>; rel="next"/);
        if (match) {
          pageInfo = match[1];
          if (ordersInChunk >= CHUNK_SIZE) {
            nextCursor = pageInfo; // Save for next chunk
          }
        } else {
          hasNextPage = false;
        }
      } else {
        hasNextPage = false;
      }

      // Rate limit protection between pages
      if (hasNextPage && ordersInChunk < CHUNK_SIZE) {
        await new Promise(resolve => setTimeout(resolve, INTER_PAGE_DELAY_MS));
      }
    }

    // Flush remaining batch
    await flushOrderBatch();

  } catch (err) {
    console.error('Import chunk error:', err);
    errorsInChunk.push(err instanceof Error ? err.message : 'Unknown error');
  }

  // Determine if we need another chunk
  const needsMoreChunks = nextCursor !== null || (hasNextPage && ordersInChunk >= CHUNK_SIZE);
  const allErrors = [...cumulativeProgress.errors, ...errorsInChunk];
  
  const finalStatus = needsMoreChunks 
    ? 'needs_continuation'
    : (allErrors.length > 0 ? 'completed_with_errors' : 'completed');

  // Calculate final time estimate
  const avgOrderTime = orderTimesMs.length > 0 
    ? orderTimesMs.reduce((a, b) => a + b, 0) / orderTimesMs.length 
    : 100;

  // Final update for this chunk
  await updateProgress({
    status: finalStatus,
    total_orders: totalOrdersFetched,
    orders_processed: cumulativeProgress.orders_processed + ordersInChunk,
    invoices_created: cumulativeProgress.orders_created + ordersCreatedInChunk, // orders created
    accounts_created: 0,
    errors: allErrors.length,
    error_details: allErrors.slice(-20),
    page_cursor: nextCursor,
    chunk_number: chunkNumber,
    avg_order_time_ms: Math.round(avgOrderTime),
    completed_at: needsMoreChunks ? null : new Date().toISOString(),
  });

  // Update integration status
  if (!needsMoreChunks) {
    await supabase
      .from('brand_integrations')
      .update({ 
        import_status: allErrors.length > 0 ? 'completed_with_errors' : 'completed',
        last_import_at: new Date().toISOString()
      })
      .eq('brand_id', brand_id)
      .eq('integration_type', 'shopify');

    await supabase.from('webhook_logs').insert({
      brand_id: brand_id,
      integration_type: 'shopify',
      event_type: 'historical_import',
      status: allErrors.length > 0 ? 'completed_with_errors' : 'success',
      response_summary: `Imported ${cumulativeProgress.orders_processed + ordersInChunk} orders in ${chunkNumber} chunks`,
      invoices_created: 0,
      accounts_created: 0,
    });
  }

  const chunkDuration = (Date.now() - chunkStartTime) / 1000;
  console.log(`Chunk ${chunkNumber} complete in ${chunkDuration.toFixed(1)}s: ${ordersInChunk} orders, ${ordersCreatedInChunk} line items. Status: ${finalStatus}`);

  return {
    success: true,
    chunk_number: chunkNumber,
    orders_in_chunk: ordersInChunk,
    orders_created: ordersCreatedInChunk,
    needs_continuation: needsMoreChunks,
    next_cursor: nextCursor,
    progress_id: progressId,
    errors: errorsInChunk,
  };
}

// Add shutdown handler for background tasks
addEventListener('beforeunload', (ev: Event) => {
  console.log('Function shutdown');
});
