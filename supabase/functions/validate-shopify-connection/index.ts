import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shop_domain, api_access_token } = await req.json();

    if (!shop_domain || !api_access_token) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing shop domain or API access token" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean up shop domain
    let cleanDomain = shop_domain.trim().toLowerCase();
    if (!cleanDomain.includes('.myshopify.com')) {
      cleanDomain = `${cleanDomain}.myshopify.com`;
    }
    cleanDomain = cleanDomain.replace(/^https?:\/\//, '');

    console.log(`Validating Shopify connection for: ${cleanDomain}`);

    // Call Shopify Admin API to validate the token
    const response = await fetch(`https://${cleanDomain}/admin/api/2024-01/shop.json`, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': api_access_token,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Shopify API error: ${response.status} - ${errorText}`);
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Invalid API access token. Please check your token and try again." 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 404) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Store not found. Please check your store URL." 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Shopify API error: ${response.status}` 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const shopName = data.shop?.name || 'Unknown Store';
    const shopEmail = data.shop?.email || '';

    console.log(`Successfully validated connection to: ${shopName}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        shop_name: shopName,
        shop_email: shopEmail,
        shop_domain: cleanDomain
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error validating Shopify connection:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
