// YouTube API configuration
let YOUTUBE_API_KEY = '';
const MAX_RESULTS = 50; // Fetch 50 videos per channel (YouTube API max)
const VIDEOS_PER_PAGE = 24;

// Watch time tracking
let DAILY_LIMIT_SECONDS = 3 * 60 * 60; // 3 hours in seconds (will be loaded from config)
let watchTimeSeconds = 0;
let watchTimer = null;
let videoStartTime = null;
let player = null;
let videosWatchedCount = 0;
let currentVideoWatchTime = 0;
let currentVideoId = null;
let countedVideos = new Set();

// State management
let channels = [];
let currentChannel = null;
let allVideos = [];
let displayedVideos = [];
let currentPage = 0;
let isLoading = false;

// DOM elements
const videosSection = document.getElementById('videos-section');
const videoPlayerSection = document.getElementById('video-player-section');
const videosList = document.getElementById('videos-list');
const videoContainer = document.getElementById('video-container');
const channelTitle = document.getElementById('channel-title');
const backToVideosBtn = document.getElementById('back-to-videos-btn');
const showMoreBtn = document.getElementById('show-more-btn');

// Initialize the app
async function init() {
    await loadYouTubeApiKey();
    await loadConfig();
    await loadWatchTime();
    await loadChannels();
    renderChannelsList();
    await loadAllVideos();
    setupEventListeners();
    updateTimerDisplay();
}

// Load YouTube API key from server
async function loadYouTubeApiKey() {
    try {
        const response = await fetch('/api/youtube-key');
        const data = await response.json();
        YOUTUBE_API_KEY = data.apiKey;
    } catch (error) {
        console.error('Error loading YouTube API key:', error);
        // Fallback for local development
        YOUTUBE_API_KEY = 'AIzaSyCISQvsNnbSZJIuYUWJjhoYSOGS_OCi6D0';
    }
}

// Load configuration from Vercel KV
async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        const data = await response.json();
        DAILY_LIMIT_SECONDS = data.dailyTimeLimit || 10800;
    } catch (error) {
        console.error('Error loading config:', error);
        // Use default if API fails
        DAILY_LIMIT_SECONDS = 10800;
    }
}

// Load channels from JSON file
async function loadChannels() {
    try {
        const response = await fetch('channels.json');
        const data = await response.json();
        channels = data.channels;

        // Fetch real thumbnails from YouTube API
        await fetchChannelThumbnails();
    } catch (error) {
        console.error('Error loading channels:', error);
        videosList.innerHTML = '<div class="loading">Error loading channels. Please check channels.json file.</div>';
    }
}

// Fetch actual channel thumbnails from YouTube API
async function fetchChannelThumbnails() {
    try {
        const channelIds = channels.map(c => c.id).join(',');
        const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelIds}&key=${YOUTUBE_API_KEY}`;

        const response = await fetch(url);
        if (!response.ok) {
            console.error('Error fetching channel thumbnails');
            return;
        }

        const data = await response.json();

        // Update channel thumbnails with real URLs
        data.items.forEach(channelData => {
            const channel = channels.find(c => c.id === channelData.id);
            if (channel && channelData.snippet.thumbnails) {
                channel.thumbnail = channelData.snippet.thumbnails.default?.url ||
                                  channelData.snippet.thumbnails.medium?.url ||
                                  channelData.snippet.thumbnails.high?.url;
            }
        });
    } catch (error) {
        console.error('Error fetching channel thumbnails:', error);
    }
}

// Load all videos from all channels
async function loadAllVideos() {
    videosList.innerHTML = '<div class="loading">Loading videos...</div>';

    try {
        // Fetch videos from all channels in parallel
        const videoPromises = channels.map(channel =>
            fetchChannelVideos(channel.playlistId, channel)
        );

        const channelVideosArrays = await Promise.all(videoPromises);

        // Combine all videos into one array
        allVideos = channelVideosArrays.flat();

        // Sort by publish date (newest first)
        allVideos.sort((a, b) => {
            const dateA = new Date(a.snippet.publishedAt);
            const dateB = new Date(b.snippet.publishedAt);
            return dateB - dateA;
        });

        // Fetch video statistics (view counts) for all videos
        await fetchVideoStatistics();

        // Initialize pagination
        currentPage = 0;
        renderVideosWithPagination(allVideos);
    } catch (error) {
        console.error('Error loading videos:', error);
        videosList.innerHTML = '<div class="loading">Error loading videos. Please check your API key.</div>';
    }
}

// Fetch video statistics (view counts, likes, etc.)
async function fetchVideoStatistics() {
    // YouTube API allows fetching up to 50 video IDs at once
    const videoIds = allVideos.map(video => video.snippet.resourceId.videoId);

    if (videoIds.length === 0) return;

    // Batch requests into groups of 50
    const batchSize = 50;
    const batches = [];

    for (let i = 0; i < videoIds.length; i += batchSize) {
        batches.push(videoIds.slice(i, i + batchSize));
    }

    // Fetch statistics for each batch
    for (const batch of batches) {
        const ids = batch.join(',');
        const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids}&key=${YOUTUBE_API_KEY}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Error fetching video statistics:', errorData);
                continue;
            }

            const data = await response.json();

            // Map statistics to videos
            data.items.forEach(videoData => {
                const video = allVideos.find(v => v.snippet.resourceId.videoId === videoData.id);
                if (video) {
                    video.statistics = videoData.statistics;
                }
            });
        } catch (error) {
            console.error('Error in batch fetch:', error);
        }
    }
}

// Format view count
function formatViewCount(count) {
    const num = parseInt(count);
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1).replace('.0', '') + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1).replace('.0', '') + 'K';
    }
    return num.toString();
}

// Fetch videos from YouTube API
async function fetchChannelVideos(playlistId, channel) {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${MAX_RESULTS}&playlistId=${playlistId}&key=${YOUTUBE_API_KEY}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            const errorData = await response.json();
            console.error(`Error fetching videos for ${channel.name}:`, errorData);
            console.error(`Playlist ID: ${playlistId}`);
            console.error(`Status: ${response.status}`);
            return []; // Return empty array instead of throwing
        }

        const data = await response.json();

        // Add channel info to each video
        return data.items.map(item => ({
            ...item,
            channelInfo: channel
        }));
    } catch (error) {
        console.error(`Failed to fetch videos for ${channel.name}:`, error);
        return []; // Return empty array on error
    }
}

// Render videos with pagination
function renderVideosWithPagination(videos) {
    displayedVideos = videos;
    currentPage = 0;
    videosList.innerHTML = '';

    if (videos.length === 0) {
        videosList.innerHTML = '<div class="loading">No videos found.</div>';
        updateShowMoreButton();
        return;
    }

    // Load first page
    loadMoreVideos();
    updateShowMoreButton();
}

// Load more videos (pagination)
function loadMoreVideos() {
    if (isLoading) return;

    const startIndex = currentPage * VIDEOS_PER_PAGE;
    const endIndex = startIndex + VIDEOS_PER_PAGE;
    const videosToShow = displayedVideos.slice(startIndex, endIndex);

    if (videosToShow.length === 0) {
        updateShowMoreButton();
        return;
    }

    isLoading = true;

    // Update button to loading state
    if (showMoreBtn) {
        showMoreBtn.textContent = 'Loading...';
        showMoreBtn.classList.add('loading');
    }

    // Simulate slight delay for better UX
    setTimeout(() => {
        videosToShow.forEach(video => {
            const snippet = video.snippet;
            const videoId = snippet.resourceId.videoId;
            const thumbnail = snippet.thumbnails.medium.url;
            const title = snippet.title;
            const publishedAt = new Date(snippet.publishedAt);
            const timeAgo = getTimeAgo(publishedAt);
            const channelName = video.channelInfo ? video.channelInfo.name : (currentChannel ? currentChannel.name : 'Unknown');

            // Get view count if available
            const viewCount = video.statistics && video.statistics.viewCount
                ? formatViewCount(video.statistics.viewCount) + ' views'
                : '';

            const videoCard = document.createElement('div');
            videoCard.className = 'video-card';
            videoCard.innerHTML = `
                <div class="video-thumbnail-container">
                    <img src="${thumbnail}" alt="${title}" class="video-thumbnail">
                </div>
                <div class="video-info">
                    <div class="video-title">${title}</div>
                    <div class="video-meta">${channelName}${viewCount ? ' • ' + viewCount : ''} • ${timeAgo}</div>
                </div>
            `;

            videoCard.addEventListener('click', () => playVideo(video));
            videosList.appendChild(videoCard);
        });

        currentPage++;
        isLoading = false;

        // Update button state
        if (showMoreBtn) {
            showMoreBtn.textContent = 'Show More Videos';
            showMoreBtn.classList.remove('loading');
        }

        updateShowMoreButton();
    }, 300);
}

// Update show more button visibility
function updateShowMoreButton() {
    if (!showMoreBtn) return;

    const currentVideosShown = currentPage * VIDEOS_PER_PAGE;
    const hasMoreVideos = currentVideosShown < displayedVideos.length;

    if (hasMoreVideos) {
        showMoreBtn.classList.remove('hidden');
    } else {
        showMoreBtn.classList.add('hidden');
    }
}

// Render video cards (legacy, kept for compatibility)
function renderVideos(videos) {
    renderVideosWithPagination(videos);
}

// Play video in YouTube player
function playVideo(video) {
    const videoId = video.snippet.resourceId.videoId;
    const title = video.snippet.title;
    const channelName = video.channelInfo ? video.channelInfo.name : 'Unknown';
    const publishedAt = new Date(video.snippet.publishedAt);
    const timeAgo = getTimeAgo(publishedAt);
    const viewCount = video.statistics && video.statistics.viewCount
        ? formatViewCount(video.statistics.viewCount) + ' views'
        : '';

    // Reset video watch time tracking
    currentVideoWatchTime = 0;
    currentVideoId = videoId;

    // Clear container and create div for player
    videoContainer.innerHTML = '<div id="youtube-player"></div>';

    // Create YouTube player with API
    if (typeof YT !== 'undefined' && YT.Player) {
        player = new YT.Player('youtube-player', {
            videoId: videoId,
            playerVars: {
                autoplay: 1,
                enablejsapi: 1
            },
            events: {
                onStateChange: onPlayerStateChange
            }
        });
    } else {
        // Fallback to iframe if API not loaded
        videoContainer.innerHTML = `
            <iframe
                src="https://www.youtube.com/embed/${videoId}?autoplay=1"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen>
            </iframe>
        `;
    }

    // Update metadata
    document.getElementById('video-title').textContent = title;
    document.getElementById('channel-name').textContent = channelName;
    document.getElementById('view-count').textContent = viewCount;
    document.getElementById('publish-date').textContent = timeAgo;

    // Render suggested videos
    renderSuggestedVideos(video);

    // Hide videos section, show player section
    videosSection.classList.add('hidden');
    videoPlayerSection.classList.remove('hidden');

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Handle YouTube player state changes
function onPlayerStateChange(event) {
    // YT.PlayerState.PLAYING = 1
    // YT.PlayerState.PAUSED = 2
    // YT.PlayerState.ENDED = 0
    if (event.data === 1) {
        // Video is playing
        startWatchTimer();
    } else {
        // Video is paused, ended, or buffering
        stopWatchTimer();
    }
}

// Render suggested videos
function renderSuggestedVideos(currentVideo) {
    const suggestedContainer = document.getElementById('suggested-videos');
    if (!suggestedContainer) return;

    suggestedContainer.innerHTML = '';

    // Get other videos (excluding current)
    const suggested = allVideos
        .filter(v => v.snippet.resourceId.videoId !== currentVideo.snippet.resourceId.videoId)
        .slice(0, 10); // Show 10 suggested videos

    suggested.forEach(video => {
        const snippet = video.snippet;
        const thumbnail = snippet.thumbnails.medium.url;
        const title = snippet.title;
        const channelName = video.channelInfo ? video.channelInfo.name : 'Unknown';
        const publishedAt = new Date(snippet.publishedAt);
        const timeAgo = getTimeAgo(publishedAt);
        const viewCount = video.statistics && video.statistics.viewCount
            ? formatViewCount(video.statistics.viewCount) + ' views'
            : '';

        const suggestedCard = document.createElement('div');
        suggestedCard.className = 'suggested-video-card';
        suggestedCard.innerHTML = `
            <div class="suggested-thumbnail">
                <img src="${thumbnail}" alt="${title}">
            </div>
            <div class="suggested-info">
                <div class="suggested-title">${title}</div>
                <div class="suggested-channel">${channelName}</div>
                <div class="suggested-stats">${viewCount}${viewCount && timeAgo ? ' • ' : ''}${timeAgo}</div>
            </div>
        `;

        suggestedCard.addEventListener('click', () => playVideo(video));
        suggestedContainer.appendChild(suggestedCard);
    });
}

// Close video player and return to home
function closeVideoPlayer() {
    // Stop watch timer
    stopWatchTimer();

    // Reset current video tracking
    currentVideoWatchTime = 0;
    currentVideoId = null;

    // Destroy player instance
    if (player && player.destroy) {
        player.destroy();
        player = null;
    }

    videoPlayerSection.classList.add('hidden');
    videosSection.classList.remove('hidden');
    videoContainer.innerHTML = ''; // Stop video playback
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Setup event listeners
function setupEventListeners() {
    // Back to videos button
    backToVideosBtn.addEventListener('click', closeVideoPlayer);

    // Logo click to go home
    const logoHome = document.getElementById('logo-home');
    if (logoHome) {
        logoHome.addEventListener('click', () => {
            // If video player is open, close it
            if (!videoPlayerSection.classList.contains('hidden')) {
                closeVideoPlayer();
            }
            // Clear channel filter and show all videos
            currentChannel = null;
            channelTitle.textContent = 'Latest Videos';
            renderVideos(allVideos);
            closeSidebar();
        });
    }

    // Hamburger menu
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const sidebarClose = document.getElementById('sidebar-close');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (hamburgerMenu) {
        hamburgerMenu.addEventListener('click', openSidebar);
    }

    if (sidebarClose) {
        sidebarClose.addEventListener('click', closeSidebar);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }

    // Show more button
    if (showMoreBtn) {
        showMoreBtn.addEventListener('click', () => {
            loadMoreVideos();
        });
    }
}

// Render channels list in sidebar
function renderChannelsList() {
    const channelsList = document.getElementById('channels-list');
    if (!channelsList) return;

    channelsList.innerHTML = '';

    // Sort channels alphabetically by name
    const sortedChannels = [...channels].sort((a, b) =>
        a.name.localeCompare(b.name)
    );

    sortedChannels.forEach(channel => {
        const channelItem = document.createElement('div');
        channelItem.className = 'channel-item';
        channelItem.innerHTML = `
            <img src="${channel.thumbnail}" alt="${channel.name}" class="channel-item-thumbnail">
            <span class="channel-item-name">${channel.name}</span>
        `;

        channelItem.addEventListener('click', () => {
            selectChannel(channel);
        });

        channelsList.appendChild(channelItem);
    });
}

// Select a channel and show its videos
function selectChannel(channel) {
    currentChannel = channel;

    // Filter videos for this channel
    const channelVideos = allVideos.filter(video =>
        video.channelInfo && video.channelInfo.id === channel.id
    );

    // Update title
    channelTitle.textContent = channel.name;

    // Sort channel videos by date (newest first)
    channelVideos.sort((a, b) => {
        const dateA = new Date(a.snippet.publishedAt);
        const dateB = new Date(b.snippet.publishedAt);
        return dateB - dateA;
    });

    // Render filtered videos with pagination
    renderVideosWithPagination(channelVideos);

    // Close sidebar and video player if open
    closeSidebar();
    if (!videoPlayerSection.classList.contains('hidden')) {
        closeVideoPlayer();
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update active state in sidebar
    updateSidebarActiveState(channel.id);
}

// Update active state in sidebar
function updateSidebarActiveState(channelId) {
    const channelItems = document.querySelectorAll('.channel-item');
    channelItems.forEach((item, index) => {
        const sortedChannels = [...channels].sort((a, b) =>
            a.name.localeCompare(b.name)
        );
        if (sortedChannels[index].id === channelId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// Open sidebar
function openSidebar() {
    const sidebar = document.getElementById('sidebar-menu');
    const overlay = document.getElementById('sidebar-overlay');

    if (sidebar) sidebar.classList.add('active');
    if (overlay) overlay.classList.add('active');

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

// Close sidebar
function closeSidebar() {
    const sidebar = document.getElementById('sidebar-menu');
    const overlay = document.getElementById('sidebar-overlay');

    if (sidebar) sidebar.classList.remove('active');
    if (overlay) overlay.classList.remove('active');

    // Re-enable body scroll
    document.body.style.overflow = '';
}

// Helper function to format time ago
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
        }
    }

    return 'just now';
}

// Watch time management functions
async function loadWatchTime() {
    try {
        const response = await fetch('/api/usage');
        const data = await response.json();

        watchTimeSeconds = data.seconds || 0;
        videosWatchedCount = data.videosCount || 0;
        countedVideos = new Set(data.countedVideos || []);
    } catch (error) {
        console.error('Error loading watch time:', error);
        // Fallback to localStorage for local development
        const stored = localStorage.getItem('watchTimeData');
        if (stored) {
            const data = JSON.parse(stored);
            const today = new Date().toDateString();
            if (data.date === today) {
                watchTimeSeconds = data.seconds || 0;
                videosWatchedCount = data.videosCount || 0;
                countedVideos = new Set(data.countedVideos || []);
            }
        }
    }
}

async function saveWatchTime() {
    const usageData = {
        seconds: watchTimeSeconds,
        videosCount: videosWatchedCount,
        countedVideos: Array.from(countedVideos)
    };

    try {
        await fetch('/api/usage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(usageData)
        });
    } catch (error) {
        console.error('Error saving watch time:', error);
        // Fallback to localStorage for local development
        const today = new Date().toDateString();
        localStorage.setItem('watchTimeData', JSON.stringify({
            date: today,
            ...usageData
        }));
    }
}

function startWatchTimer() {
    if (watchTimer) return; // Already running

    videoStartTime = Date.now();
    watchTimer = setInterval(() => {
        watchTimeSeconds++;
        currentVideoWatchTime++;

        // Check if this video has been watched for at least 1 minute
        if (currentVideoWatchTime === 60 && currentVideoId && !countedVideos.has(currentVideoId)) {
            videosWatchedCount++;
            countedVideos.add(currentVideoId);
        }

        saveWatchTime();
        updateTimerDisplay();

        // Check if limit reached
        if (watchTimeSeconds >= DAILY_LIMIT_SECONDS) {
            stopWatchTimer();
            showTimesUpOverlay();
        }
    }, 1000);
}

function stopWatchTimer() {
    if (watchTimer) {
        clearInterval(watchTimer);
        watchTimer = null;
        videoStartTime = null;
    }
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
    const timeWatchedEl = document.getElementById('time-watched');
    const timeLeftEl = document.getElementById('time-left');
    const videosWatchedEl = document.getElementById('videos-watched');

    if (!timeWatchedEl || !timeLeftEl || !videosWatchedEl) return;

    const timeLeft = Math.max(0, DAILY_LIMIT_SECONDS - watchTimeSeconds);

    videosWatchedEl.textContent = videosWatchedCount;
    timeWatchedEl.textContent = formatTime(watchTimeSeconds);
    timeLeftEl.textContent = formatTime(timeLeft);

    // Update colors based on time left
    timeLeftEl.classList.remove('warning', 'danger');
    if (timeLeft <= 30 * 60) { // 30 minutes or less
        timeLeftEl.classList.add('danger');
    } else if (timeLeft <= 60 * 60) { // 1 hour or less
        timeLeftEl.classList.add('warning');
    }
}

// Show time's up overlay
function showTimesUpOverlay() {
    const overlay = document.getElementById('times-up-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');

        // Stop the video if playing
        if (player && player.pauseVideo) {
            player.pauseVideo();
        }

        stopWatchTimer();
    }
}

// Hide time's up overlay
function hideTimesUpOverlay() {
    const overlay = document.getElementById('times-up-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

// Start the app
init();
