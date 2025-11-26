import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, brandId } = await req.json();
    
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Image URL is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Fetch brands for logo recognition
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: brands } = await supabase
      .from('brands')
      .select('id, name, logo_url')
      .limit(50);

    const brandNames = brands?.map(b => b.name).join(', ') || '';

    // Prepare the prompt
    const systemPrompt = `You are an expert at analyzing creative assets and extracting relevant metadata.

Analyze the image and provide tags in the following categories:
1. Colors: Primary and secondary colors visible in the image (e.g., "red", "blue", "neutral")
2. Moods: Emotional tone or atmosphere (e.g., "energetic", "calm", "professional", "playful")
3. Environments: Setting or context (e.g., "outdoor", "studio", "urban", "nature")
4. Brand Recognition: Only if you can clearly identify a brand logo from this list: ${brandNames}

CRITICAL RULES FOR BRAND TAGGING:
- Only tag with a brand name if you can see their logo with 95%+ confidence
- If you're not absolutely certain, DO NOT include the brand tag
- Better to skip the brand tag than to guess incorrectly

Return ONLY a JSON object in this exact format:
{
  "tags": ["tag1", "tag2", "tag3"],
  "confidence": 0.95
}

Keep tags simple, lowercase, and relevant. Maximum 8 total tags.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze this image and provide tags.' },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 402 }
        );
      }

      throw new Error('AI analysis failed');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content returned from AI');
    }

    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON response from AI');
    }

    const result = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in analyze-image function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
