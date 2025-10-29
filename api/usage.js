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
    const today = new Date().toDateString();
    const key = `usage:${today}`;

    if (req.method === 'GET') {
      // Get today's usage
      const data = await kv.get(key);

      if (!data) {
        return new Response(JSON.stringify({
          date: today,
          seconds: 0,
          videosCount: 0,
          countedVideos: []
        }), { status: 200, headers });
      }

      return new Response(JSON.stringify(data), { status: 200, headers });
    } else if (req.method === 'POST') {
      // Update usage
      const body = await req.json();
      const { seconds, videosCount, countedVideos } = body;

      const usageData = {
        date: today,
        seconds: seconds || 0,
        videosCount: videosCount || 0,
        countedVideos: countedVideos || []
      };

      // Store with 7 day expiration
      await kv.set(key, usageData, { ex: 604800 });

      return new Response(JSON.stringify({ success: true, data: usageData }), { status: 200, headers });
    } else {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
    }
  } catch (error) {
    console.error('Usage API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers });
  }
}
