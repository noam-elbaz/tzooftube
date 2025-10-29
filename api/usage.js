import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const today = new Date().toDateString();
    const key = `usage:${today}`;

    if (req.method === 'GET') {
      // Get today's usage
      const data = await kv.get(key);

      if (!data) {
        res.status(200).json({
          date: today,
          seconds: 0,
          videosCount: 0,
          countedVideos: []
        });
        return;
      }

      res.status(200).json(data);
    } else if (req.method === 'POST') {
      // Update usage
      const { seconds, videosCount, countedVideos } = req.body;

      const usageData = {
        date: today,
        seconds: seconds || 0,
        videosCount: videosCount || 0,
        countedVideos: countedVideos || []
      };

      // Store with 7 day expiration
      await kv.set(key, usageData, { ex: 604800 });

      res.status(200).json({ success: true, data: usageData });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Usage API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
