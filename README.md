# TzoofTube

A YouTube video aggregator designed for managing children's YouTube consumption with time tracking and parental controls.

## Features

- 🎥 Curated channel list with 17 science/tech/entertainment channels
- ⏱️ Daily watch time tracking (configurable limit)
- 📊 Video count tracking (minimum 1 minute watched)
- 🎨 YouTube-style dark theme UI
- 📱 Responsive design for mobile and desktop
- 🔒 Parental admin dashboard
- 💾 Persistent storage with Supabase (PostgreSQL)

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/noam-elbaz/tzooftube.git
cd tzooftube
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to **SQL Editor**
3. Copy the contents of `supabase-schema.sql` and run it
4. Go to **Settings** → **API** and copy:
   - Project URL (SUPABASE_URL)
   - Anon/Public key (SUPABASE_ANON_KEY)

### 4. Set up environment variables

Create a `.env.local` file:

```env
YOUTUBE_API_KEY=your_youtube_api_key_here
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get your YouTube API key from: https://console.cloud.google.com/apis/credentials

### 5. Deploy to Vercel

1. Push your code to GitHub
2. Import your project to Vercel
3. In Vercel, go to **Integrations** and add **Supabase**
4. Or manually add environment variables:
   - `YOUTUBE_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
5. Deploy!

## Local Development

```bash
npm run dev
```

Visit `http://localhost:3000`

## Admin Dashboard

Access the admin panel at `/admin.html` to:
- View today's usage statistics
- Change daily time limit
- Monitor videos watched

## How It Works

- **Frontend**: Vanilla JavaScript, no frameworks
- **Backend**: Vercel serverless functions (Edge runtime)
- **Database**: Supabase (PostgreSQL) for usage tracking and configuration
- **API**: YouTube Data API v3 for fetching videos

## Project Structure

```
tzooftube/
├── api/                    # Serverless API endpoints
│   ├── config.js          # Configuration management (Supabase)
│   ├── usage.js           # Usage tracking (Supabase)
│   └── youtube-key.js     # API key endpoint
├── index.html             # Main app
├── admin.html             # Admin dashboard
├── app.js                 # Frontend JavaScript
├── styles.css             # Styling
├── channels.json          # Channel configuration
├── supabase-schema.sql    # Database schema
└── package.json           # Dependencies
```

## Database Schema

Two tables in Supabase:

### `config` table
- `key` (text, primary key) - Configuration key
- `value` (integer) - Configuration value
- `updated_at` (timestamp) - Last update time

### `usage` table
- `date` (date, primary key) - Usage date (YYYY-MM-DD)
- `seconds` (integer) - Total seconds watched
- `videos_count` (integer) - Number of videos watched
- `counted_videos` (jsonb) - Array of video IDs watched for 1+ minute
- `updated_at` (timestamp) - Last update time

## License

MIT
