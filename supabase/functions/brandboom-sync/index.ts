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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { brandId, fromDate } = await req.json();

    if (!brandId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: brandId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting BrandBoom sync for brand: ${brandId}`);

    // Get BrandBoom integration config
    const { data: integration, error: integrationError } = await supabase
      .from('brand_integrations')
      .select('*')
      .eq('brand_id', brandId)
      .eq('integration_type', 'brandboom')
      .eq('is_active', true)
      .maybeSingle();

    if (integrationError || !integration) {
      console.error('BrandBoom integration not found:', integrationError);
      return new Response(
        JSON.stringify({ error: 'BrandBoom integration not configured for this brand' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = integration.api_access_token;
    const baseUrl = integration.shop_domain === 'manage.brandboom.net'
      ? 'https://manage.brandboom.net/api/v1'
      : 'https://manage.brandboom.com/api/v1';

    // Log sync start
    const { data: syncLog } = await supabase
      .from('brandboom_sync_logs')
      .insert({
        brand_id: brandId,
        sync_type: 'orders',
        status: 'running',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    let ordersProcessed = 0;
    let invoicesCreated = 0;
    let accountsCreated = 0;
    let hasMore = true;
    let page = 1;
    const errors: string[] = [];

    try {
      while (hasMore) {
        // Fetch orders from BrandBoom
        let ordersUrl = `${baseUrl}/orders?page=${page}&limit=50`;
        if (fromDate) {
          ordersUrl += `&created_after=${fromDate}`;
        }

        console.log(`Fetching orders page ${page} from ${ordersUrl}`);

        const ordersResponse = await fetch(ordersUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });

        if (!ordersResponse.ok) {
          throw new Error(`BrandBoom API error: ${ordersResponse.status}`);
        }

        const ordersData = await ordersResponse.json();
        const orders = ordersData.orders || ordersData.data || [];

        if (orders.length === 0) {
          hasMore = false;
          break;
        }

        for (const order of orders) {
          try {
            // Check if order already exists
            const { data: existingOrder } = await supabase
              .from('brandboom_orders')
              .select('id')
              .eq('brandboom_order_id', order.id.toString())
              .maybeSingle();

            if (existingOrder) {
              console.log(`Order ${order.id} already exists, skipping`);
              continue;
            }

            // Find or create account for the buyer
            const buyerName = order.buyer_name || order.buyer?.name || order.customer_name || 'Unknown Buyer';
            const buyerEmail = order.buyer_email || order.buyer?.email || order.customer_email;

            // Case-insensitive match for existing account across all sources (Shopify, BrandBoom, manual)
            let { data: existingAccounts } = await supabase
              .from('accounts')
              .select('id, account_name')
              .eq('brand_id', brandId)
              .ilike('account_name', buyerName);

            let accountId: string;

            if (existingAccounts && existingAccounts.length > 0) {
              accountId = existingAccounts[0].id;
              console.log(`Found existing account: ${existingAccounts[0].account_name}`);
            } else {
              // Create new account
              const { data: newAccount, error: accountError } = await supabase
                .from('accounts')
                .insert({
                  account_name: buyerName,
                  brand_id: brandId,
                  balance: 0,
                  status: 'active',
                  notes: `Auto-created from BrandBoom on ${new Date().toISOString().split('T')[0]}`
                })
                .select()
                .single();

              if (accountError || !newAccount) {
                console.error('Error creating account:', accountError);
                errors.push(`Failed to create account for ${buyerName}`);
                continue;
              }

              accountId = newAccount.id;
              accountsCreated++;
              console.log(`Created new account: ${buyerName}`);
            }

            // Store the order in brandboom_orders
            const { error: orderError } = await supabase
              .from('brandboom_orders')
              .insert({
                brand_id: brandId,
                brandboom_order_id: order.id.toString(),
                buyer_name: buyerName,
                buyer_email: buyerEmail,
                order_date: order.created_at || order.order_date || new Date().toISOString(),
                ship_date: order.ship_date,
                cancel_date: order.cancel_date,
                total_amount: parseFloat(order.total || order.total_amount || 0),
                status: order.status || 'pending',
                payment_status: order.payment_status || 'pending',
                shipping_status: order.shipping_status,
                order_type: order.order_type,
                notes: order.notes,
                raw_data: order
              });

            if (orderError) {
              console.error('Error creating brandboom order:', orderError);
              errors.push(`Failed to create order ${order.id}`);
              continue;
            }

            // Import the invoice from BrandBoom (NOT create - just import existing data)
            const invoiceNumber = order.invoice_number || `BB-${order.id}`;
            const invoiceAmount = parseFloat(order.total || order.total_amount || 0);
            const paidAmount = parseFloat(order.paid_amount || order.amount_paid || 0);
            
            // Determine invoice status based on payment info
            let invoiceStatus = 'pending';
            if (paidAmount >= invoiceAmount && invoiceAmount > 0) {
              invoiceStatus = 'paid';
            } else if (paidAmount > 0) {
              invoiceStatus = 'partial';
            }

            // Check for invoice PDF attachment
            let pdfUrl: string | null = null;
            if (order.invoice_pdf_url || order.invoice_url) {
              const invoicePdfSource = order.invoice_pdf_url || order.invoice_url;
              
              try {
                // Download the PDF from BrandBoom
                const pdfResponse = await fetch(invoicePdfSource, {
                  headers: { 'Authorization': `Bearer ${apiKey}` }
                });

                if (pdfResponse.ok) {
                  const pdfBlob = await pdfResponse.blob();
                  const pdfPath = `invoices/${accountId}/${invoiceNumber}.pdf`;
                  
                  // Upload to Supabase storage
                  const { error: uploadError } = await supabase
                    .storage
                    .from('design-assets')
                    .upload(pdfPath, pdfBlob, {
                      contentType: 'application/pdf',
                      upsert: true
                    });

                  if (!uploadError) {
                    pdfUrl = pdfPath;
                    console.log(`Uploaded invoice PDF: ${pdfPath}`);

                    // Optionally run OCR to verify/extract total
                    try {
                      const { data: ocrData } = await supabase.functions.invoke('extract-invoice-total', {
                        body: { filePath: pdfPath, bucket: 'design-assets' }
                      });
                      if (ocrData?.total) {
                        console.log(`OCR extracted total: ${ocrData.total}, API total: ${invoiceAmount}`);
                      }
                    } catch (ocrError) {
                      console.warn('OCR extraction failed:', ocrError);
                    }
                  } else {
                    console.error('Error uploading PDF:', uploadError);
                  }
                }
              } catch (pdfError) {
                console.warn('Error downloading invoice PDF:', pdfError);
              }
            }

            // Create the invoice record (importing existing BrandBoom invoice data)
            const { error: invoiceError } = await supabase
              .from('invoices')
              .insert({
                account_id: accountId,
                invoice_number: invoiceNumber,
                amount: invoiceAmount,
                paid_amount: paidAmount,
                status: invoiceStatus,
                due_date: order.due_date || order.ship_date,
                paid_date: invoiceStatus === 'paid' ? new Date().toISOString().split('T')[0] : null,
                source: 'brandboom',
                pdf_url: pdfUrl,
                notes: `Imported from BrandBoom order ${order.id}`
              });

            if (invoiceError) {
              console.error('Error creating invoice:', invoiceError);
              errors.push(`Failed to create invoice for order ${order.id}`);
            } else {
              invoicesCreated++;
            }

            ordersProcessed++;
          } catch (orderError) {
            console.error(`Error processing order ${order.id}:`, orderError);
            errors.push(`Error processing order ${order.id}: ${orderError}`);
          }
        }

        // Check for pagination
        hasMore = orders.length === 50;
        page++;
      }

      // Update sync log with success
      await supabase
        .from('brandboom_sync_logs')
        .update({
          status: errors.length > 0 ? 'completed_with_errors' : 'completed',
          completed_at: new Date().toISOString(),
          records_synced: ordersProcessed,
          error_message: errors.length > 0 ? errors.slice(0, 5).join('; ') : null
        })
        .eq('id', syncLog.id);

      // Update last import timestamp
      await supabase
        .from('brand_integrations')
        .update({ last_import_at: new Date().toISOString() })
        .eq('brand_id', brandId)
        .eq('integration_type', 'brandboom');

      // Log to webhook_logs for activity tracking
      await supabase.from('webhook_logs').insert({
        brand_id: brandId,
        integration_type: 'brandboom',
        event_type: 'sync_completed',
        status: errors.length > 0 ? 'completed_with_errors' : 'success',
        response_summary: `Synced ${ordersProcessed} orders, created ${invoicesCreated} invoices, ${accountsCreated} new accounts`,
        invoices_created: invoicesCreated,
        accounts_created: accountsCreated
      });

      return new Response(
        JSON.stringify({
          success: true,
          ordersProcessed,
          invoicesCreated,
          accountsCreated,
          errors: errors.slice(0, 10)
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (syncError) {
      console.error('Sync error:', syncError);
      
      // Update sync log with error
      if (syncLog) {
        await supabase
          .from('brandboom_sync_logs')
          .update({
            status: 'error',
            completed_at: new Date().toISOString(),
            error_message: syncError instanceof Error ? syncError.message : 'Unknown error'
          })
          .eq('id', syncLog.id);
      }

      throw syncError;
    }

  } catch (error) {
    console.error('Error in BrandBoom sync:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
