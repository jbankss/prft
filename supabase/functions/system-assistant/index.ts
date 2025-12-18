import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const brandContext = context?.brand_name ? `The user is currently working with the brand "${context.brand_name}".` : '';
    const pageContext = context?.current_page ? `They are on the "${context.current_page}" page.` : '';

    const systemPrompt = `You are an expert AI assistant for a fashion brand management platform. You help users navigate the software, understand features, troubleshoot issues, and get insights from their data.

${brandContext} ${pageContext}

## Platform Features You Know About:

### Accounts
- Manage vendor/retailer accounts
- Track balances and payment history
- View account activity and communications

### Invoices
- Create and manage invoices
- Track payment status (pending, paid, overdue)
- Link invoices to accounts

### Payments
- Record payments against invoices
- Track payment methods and dates
- View payment history

### Creative (Assets)
- Upload and organize brand assets (images, videos, documents)
- Create collections for campaigns
- Manage asset approvals

### Integrations
- **Shopify**: Automatically create invoices from Shopify orders
  - Setup requires: Store URL, Admin API token, Webhook signing secret
  - Can import historical orders with date range selection
- **BrandBoom**: Manage wholesale orders (coming soon)
- **Square**: Payment processing (coming soon)

### Dashboard
- View key metrics and KPIs
- Track revenue and sales trends
- Monitor vendor performance

## How to Help Users:

1. **Navigation**: Guide them to the right page or feature
2. **Setup Help**: Walk through integration setup step-by-step
3. **Troubleshooting**: Help diagnose issues with clear solutions
4. **Feature Explanation**: Explain what features do in simple terms
5. **Best Practices**: Share tips for using the platform effectively

## Communication Style:
- Be friendly but concise
- Use bullet points for multi-step instructions
- Avoid technical jargon unless necessary
- If you don't know something, say so honestly
- Always provide actionable next steps`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const assistantResponse = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
    
    return new Response(JSON.stringify({ response: assistantResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("system assistant error:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
