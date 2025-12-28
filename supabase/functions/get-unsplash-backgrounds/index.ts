import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TimePeriod {
  name: string;
  query: string;
  startHour: number;
  endHour: number;
}

const TIME_PERIODS: TimePeriod[] = [
  { name: 'night', query: 'night cityscape dark moody', startHour: 22, endHour: 5 },
  { name: 'dawn', query: 'dawn sky sunrise purple orange', startHour: 5, endHour: 6.5 },
  { name: 'sunrise', query: 'golden sunrise landscape warm', startHour: 6.5, endHour: 8 },
  { name: 'morning', query: 'morning light fresh minimal', startHour: 8, endHour: 11 },
  { name: 'noon', query: 'bright daylight clear sky', startHour: 11, endHour: 14 },
  { name: 'afternoon', query: 'golden hour warm afternoon', startHour: 14, endHour: 17 },
  { name: 'sunset', query: 'sunset orange pink sky', startHour: 17, endHour: 19.5 },
  { name: 'dusk', query: 'dusk twilight blue hour city', startHour: 19.5, endHour: 22 },
];

function getTimePeriod(hour: number): TimePeriod {
  // Handle night period spanning midnight
  if (hour >= 22 || hour < 5) {
    return TIME_PERIODS[0]; // night
  }
  
  const period = TIME_PERIODS.find(p => {
    if (p.name === 'night') return false;
    return hour >= p.startHour && hour < p.endHour;
  });
  
  return period || TIME_PERIODS[3]; // default to morning
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const unsplashAccessKey = Deno.env.get('UNSPLASH_ACCESS_KEY');
    
    if (!unsplashAccessKey) {
      console.error('UNSPLASH_ACCESS_KEY not configured');
      throw new Error('Unsplash API key not configured');
    }

    // Get hour from request or use current UTC hour
    const { hour: requestHour } = await req.json().catch(() => ({}));
    const hour = requestHour !== undefined ? requestHour : new Date().getUTCHours();
    
    const timePeriod = getTimePeriod(hour);
    console.log(`Fetching images for time period: ${timePeriod.name} (hour: ${hour})`);

    // Fetch 10 images from Unsplash
    const searchUrl = new URL('https://api.unsplash.com/search/photos');
    searchUrl.searchParams.set('query', timePeriod.query);
    searchUrl.searchParams.set('per_page', '10');
    searchUrl.searchParams.set('orientation', 'landscape');
    searchUrl.searchParams.set('content_filter', 'high');

    const response = await fetch(searchUrl.toString(), {
      headers: {
        'Authorization': `Client-ID ${unsplashAccessKey}`,
        'Accept-Version': 'v1',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Unsplash API error:', response.status, errorText);
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Found ${data.results?.length || 0} images`);

    // Map to our format with full attribution
    const images = data.results.map((photo: any) => ({
      id: photo.id,
      url: `${photo.urls.raw}&w=1920&q=80&fm=jpg&fit=crop`,
      blurHash: photo.blur_hash,
      photographer: photo.user.name,
      photographerUsername: photo.user.username,
      photographerUrl: `https://unsplash.com/@${photo.user.username}?utm_source=stck&utm_medium=referral`,
      unsplashUrl: `${photo.links.html}?utm_source=stck&utm_medium=referral`,
      downloadLocation: photo.links.download_location, // For tracking downloads per Unsplash guidelines
    }));

    // Cache for 4 hours
    const expiresAt = Date.now() + (4 * 60 * 60 * 1000);

    return new Response(
      JSON.stringify({
        images,
        timePeriod: timePeriod.name,
        expiresAt,
        fetchedAt: Date.now(),
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=14400', // 4 hours
        },
      }
    );
  } catch (error) {
    console.error('Error in get-unsplash-backgrounds:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
