import { kv } from '@vercel/kv';

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
    if (req.method === 'GET') {
      // Get configuration
      const dailyTimeLimit = await kv.get('config:dailyTimeLimit') || 10800; // Default 3 hours
      const enabled = await kv.get('config:enabled') !== false; // Default true

      res.status(200).json({
        dailyTimeLimit,
        enabled
      });
    } else if (req.method === 'POST') {
      // Update configuration
      const { dailyTimeLimit, enabled } = req.body;

      if (dailyTimeLimit !== undefined) {
        await kv.set('config:dailyTimeLimit', dailyTimeLimit);
      }

      if (enabled !== undefined) {
        await kv.set('config:enabled', enabled);
      }

      res.status(200).json({ success: true });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Config API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
