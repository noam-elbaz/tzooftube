import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  if (req.method === 'GET') {
    // Get credentials (for admin panel)
    try {
      const { data, error } = await supabase
        .from('credentials')
        .select('*')
        .eq('key', 'user_credentials')
        .single();

      if (error) throw error;

      const credentials = data?.value || { username: 'tzofia', pin: '4545' };

      return new Response(JSON.stringify(credentials), {
        status: 200,
        headers
      });
    } catch (error) {
      // If no credentials exist, return defaults
      return new Response(JSON.stringify({ username: 'tzofia', pin: '4545' }), {
        status: 200,
        headers
      });
    }
  } else if (req.method === 'POST') {
    try {
      const body = await req.json();

      // Login request
      if (body.username !== undefined && body.pin !== undefined) {
        const { data, error } = await supabase
          .from('credentials')
          .select('*')
          .eq('key', 'user_credentials')
          .single();

        const storedCredentials = data?.value || { username: 'tzofia', pin: '4545' };

        if (body.username.toLowerCase() === storedCredentials.username.toLowerCase() &&
            body.pin === storedCredentials.pin) {
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers
          });
        } else {
          return new Response(JSON.stringify({ success: false, message: 'Invalid credentials' }), {
            status: 401,
            headers
          });
        }
      }

      // Update credentials (from admin panel)
      if (body.newUsername !== undefined || body.newPin !== undefined) {
        const { data: currentData } = await supabase
          .from('credentials')
          .select('*')
          .eq('key', 'user_credentials')
          .single();

        const currentCredentials = currentData?.value || { username: 'tzofia', pin: '4545' };

        const updatedCredentials = {
          username: body.newUsername || currentCredentials.username,
          pin: body.newPin || currentCredentials.pin
        };

        const { error } = await supabase
          .from('credentials')
          .upsert({
            key: 'user_credentials',
            value: updatedCredentials,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, credentials: updatedCredentials }), {
          status: 200,
          headers
        });
      }

      return new Response(JSON.stringify({ success: false, message: 'Invalid request' }), {
        status: 400,
        headers
      });
    } catch (error) {
      console.error('Auth error:', error);
      return new Response(JSON.stringify({ success: false, message: 'Server error' }), {
        status: 500,
        headers
      });
    }
  }

  return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), {
    status: 405,
    headers
  });
}
