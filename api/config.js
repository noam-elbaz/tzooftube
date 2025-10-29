import { kv } from '@vercel/kv';

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
    if (req.method === 'GET') {
      // Get configuration
      const dailyTimeLimit = await kv.get('config:dailyTimeLimit') || 10800; // Default 3 hours
      const enabled = await kv.get('config:enabled') !== false; // Default true

      return new Response(JSON.stringify({
        dailyTimeLimit,
        enabled
      }), { status: 200, headers });
    } else if (req.method === 'POST') {
      // Update configuration
      const body = await req.json();
      const { dailyTimeLimit, enabled } = body;

      if (dailyTimeLimit !== undefined) {
        await kv.set('config:dailyTimeLimit', dailyTimeLimit);
      }

      if (enabled !== undefined) {
        await kv.set('config:enabled', enabled);
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    } else {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
    }
  } catch (error) {
    console.error('Config API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers });
  }
}
