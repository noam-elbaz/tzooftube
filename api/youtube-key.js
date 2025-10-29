export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  if (req.method === 'GET') {
    // Return YouTube API key from environment variable
    return new Response(JSON.stringify({
      apiKey: process.env.YOUTUBE_API_KEY
    }), { status: 200, headers });
  } else {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }
}
