import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileBase64, fileName } = await req.json();

    if (!fileBase64) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing invoice: ${fileName}`);

    // Use Lovable AI with vision capabilities to extract the total
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an invoice processing assistant. Your ONLY job is to find and extract the GRAND TOTAL or TOTAL AMOUNT from invoices.

CRITICAL INSTRUCTIONS:
- Look for the final total amount, NOT subtotals or line items
- Common labels: "Total", "Grand Total", "Total Due", "Amount Due", "Balance Due", "Total Amount"
- The total is usually at the bottom of the invoice
- Return ONLY the numeric value (e.g., 1234.56)
- If there are multiple "total" amounts, choose the largest one which is typically the grand total
- Do NOT include currency symbols, just the number
- If you cannot find a total, respond with "0"`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract the TOTAL amount from this invoice. Return ONLY the number, nothing else.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${fileBase64}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('AI Response:', content);

    // Parse the response to extract the number
    const cleanedContent = content.replace(/[^0-9.,]/g, '').replace(/,/g, '');
    const total = parseFloat(cleanedContent);

    if (isNaN(total)) {
      console.log('Could not parse total from:', content);
      return new Response(
        JSON.stringify({ total: null, raw: content }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Extracted total:', total);

    return new Response(
      JSON.stringify({ total, raw: content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in extract-invoice-total:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process invoice';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
