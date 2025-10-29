import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    if (req.method === 'GET') {
      // Get today's usage
      const { data, error } = await supabase
        .from('usage')
        .select('*')
        .eq('date', today)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        return new Response(JSON.stringify({
          date: today,
          seconds: 0,
          videosCount: 0,
          countedVideos: []
        }), { status: 200, headers });
      }

      return new Response(JSON.stringify({
        date: data.date,
        seconds: data.seconds,
        videosCount: data.videos_count,
        countedVideos: data.counted_videos || []
      }), { status: 200, headers });
    } else if (req.method === 'POST') {
      // Update usage
      const body = await req.json();
      const { seconds, videosCount, countedVideos } = body;

      const { error } = await supabase
        .from('usage')
        .upsert({
          date: today,
          seconds: seconds || 0,
          videos_count: videosCount || 0,
          counted_videos: countedVideos || [],
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        data: { date: today, seconds, videosCount, countedVideos }
      }), { status: 200, headers });
    } else {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
    }
  } catch (error) {
    console.error('Usage API error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }), { status: 500, headers });
  }
}
