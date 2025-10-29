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

    if (req.method === 'GET') {
      // Get configuration
      const { data, error } = await supabase
        .from('config')
        .select('*')
        .eq('key', 'daily_time_limit')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const dailyTimeLimit = data?.value || 10800; // Default 3 hours

      return new Response(JSON.stringify({
        dailyTimeLimit,
        enabled: true
      }), { status: 200, headers });
    } else if (req.method === 'POST') {
      // Update configuration
      const body = await req.json();
      const { dailyTimeLimit } = body;

      if (dailyTimeLimit !== undefined) {
        const { error } = await supabase
          .from('config')
          .upsert({
            key: 'daily_time_limit',
            value: dailyTimeLimit,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    } else {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
    }
  } catch (error) {
    console.error('Config API error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }), { status: 500, headers });
  }
}
