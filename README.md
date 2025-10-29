# TzoofTube

A YouTube video aggregator designed for managing children's YouTube consumption with time tracking and parental controls.

## Features

- 🎥 Curated channel list with 17 science/tech/entertainment channels
- ⏱️ Daily watch time tracking (configurable limit)
- 📊 Video count tracking (minimum 1 minute watched)
- 🎨 YouTube-style dark theme UI
- 📱 Responsive design for mobile and desktop
- 🔒 Parental admin dashboard
- 💾 Persistent storage with Vercel KV (Redis)

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

### 3. Set up environment variables

Create a `.env.local` file:

```env
YOUTUBE_API_KEY=your_youtube_api_key_here
```

Get your YouTube API key from: https://console.cloud.google.com/apis/credentials

### 4. Deploy to Vercel

1. Push your code to GitHub
2. Import your project to Vercel
3. Add environment variable `YOUTUBE_API_KEY` in Vercel dashboard
4. Enable Vercel KV (Redis) in the Storage tab
5. Deploy!

### 5. Enable Vercel KV

In your Vercel project dashboard:
1. Go to the **Storage** tab
2. Click **Create Database**
3. Select **KV (Redis)**
4. Click **Continue**
5. Accept the terms and create the database
6. The KV environment variables will be automatically added to your project

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
- **Backend**: Vercel serverless functions
- **Database**: Vercel KV (Redis) for usage tracking and configuration
- **API**: YouTube Data API v3 for fetching videos

## Project Structure

```
tzooftube/
├── api/                    # Serverless API endpoints
│   ├── config.js          # Configuration management
│   ├── usage.js           # Usage tracking
│   └── youtube-key.js     # API key endpoint
├── index.html             # Main app
├── admin.html             # Admin dashboard
├── app.js                 # Frontend JavaScript
├── styles.css             # Styling
├── channels.json          # Channel configuration
└── package.json           # Dependencies
```

## License

MIT
