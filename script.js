// Sample movies data (stored in localStorage)
let movies = [];
let currentVideo = null;
let isTheaterMode = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadMovies();
    initializeEventListeners();
    
    // Add sample movie if no movies exist
    if (movies.length === 0) {
        addSampleMovie();
    }
    
    renderMovies();
});

// Load movies from localStorage
function loadMovies() {
    const stored = localStorage.getItem('barni4movies');
    if (stored) {
        movies = JSON.parse(stored);
    }
}

// Save movies to localStorage
function saveMovies() {
    localStorage.setItem('barni4movies', JSON.stringify(movies));
}

// Add sample movie with the provided Dropbox link
function addSampleMovie() {
    const sampleMovie = {
        id: Date.now(),
        title: 'From S01 EP08',
        description: 'Episode 8 of From Season 1 - A gripping horror mystery series',
        url: 'https://www.dropbox.com/scl/fi/797ex2ewfrn6695gwu30r/From_480P_S01_EP08.mp4?rlkey=yax4zn3ufcjhq1s96trvu9whl&st=oi0d6oic&dl=1',
        thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop',
        sources: {
            '480p': 'https://www.dropbox.com/scl/fi/797ex2ewfrn6695gwu30r/From_480P_S01_EP08.mp4?rlkey=yax4zn3ufcjhq1s96trvu9whl&st=oi0d6oic&dl=1'
        },
        category: 'series'
    };
    movies.push(sampleMovie);
    saveMovies();
}

// Convert image URL for Dropbox if needed
function getThumbnailUrl(url) {
    if (!url) return '';
    
    // Convert Dropbox preview links to direct image links
    if (url.includes('dropbox.com') && !url.includes('dl=1')) {
        url = url.replace('dl=0', 'dl=1');
        if (!url.includes('dl=1')) {
            url += (url.includes('?') ? '&' : '?') + 'dl=1';
        }
    }
    
    return url;
}

// Render movies grid
function renderMovies(filteredMovies = null) {
    const moviesGrid = document.getElementById('moviesGrid');
    const moviesToRender = filteredMovies || movies;
    
    if (moviesToRender.length === 0) {
        moviesGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 4rem;">
                <h3 style="color: var(--text-gray);">No movies found</h3>
                <p style="color: var(--text-gray); margin-top: 1rem;">Click the + button to add your first movie!</p>
            </div>
        `;
        return;
    }
    
    moviesGrid.innerHTML = moviesToRender.map(movie => {
        const thumbnailUrl = getThumbnailUrl(movie.thumbnail);
        return `
        <div class="movie-card" data-id="${movie.id}">
            <button class="delete-btn" onclick="deleteMovie(${movie.id})" title="Delete">×</button>
            <div class="movie-thumbnail">
                ${thumbnailUrl ? 
                    `<img src="${thumbnailUrl}" alt="${movie.title}" onerror="this.parentElement.innerHTML='<div style=\\'width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 4rem;\\'>🎬</div>'">` : 
                    `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 4rem;">🎬</div>`
                }
                <div class="play-overlay">
                    <span class="play-icon">▶️</span>
                </div>
            </div>
            <div class="movie-info">
                <h3 class="movie-title">${movie.title}</h3>
                <p class="movie-description">${movie.description || 'No description available'}</p>
                <span class="movie-category">${movie.category}</span>
            </div>
        </div>
    `}).join('');
    
    // Add click event to movie cards
    document.querySelectorAll('.movie-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Prevent play if delete button was clicked
            if (e.target.classList.contains('delete-btn')) return;
            
            const movieId = parseInt(card.dataset.id);
            playMovie(movieId);
        });
    });
}

// Play movie
function playMovie(movieId) {
    const movie = movies.find(m => m.id === movieId);
    if (!movie) return;
    
    currentVideo = movie;
    
    const modal = document.getElementById('videoModal');
    const video = document.getElementById('videoPlayer');
    const title = document.getElementById('videoTitle');
    const description = document.getElementById('videoDescription');
    const loadingSpinner = document.getElementById('loadingSpinner');
    
    // Pick initial source based on connection conditions
    const { src: chosenSrc, qualityKey } = chooseInitialSource(movie);
    video.src = chosenSrc;
    if (qualityKey) video.dataset.currentQuality = qualityKey;
    title.textContent = movie.title;
    description.textContent = movie.description || 'No description available';
    
    // Show modal
    modal.classList.add('active');
    loadingSpinner.classList.add('show');
    
    // Auto play
    video.play().catch(err => {
        console.log('Autoplay prevented:', err);
        loadingSpinner.classList.remove('show');
    });
    
    // Hide loading spinner when video starts playing
    video.addEventListener('playing', () => {
        loadingSpinner.classList.remove('show');
    });
    
    video.addEventListener('waiting', () => {
        loadingSpinner.classList.add('show');
    });
    
    // Prevent right-click and download
    video.oncontextmenu = (e) => {
        e.preventDefault();
        return false;
    };
    
    // Initialize video controls
    initializeVideoControls();
    // Start adaptive switching based on buffering
    startAdaptiveStreaming(movie);
}

// Choose best available source
function getBestSource(movie) {
    if (movie.sources) {
        return movie.sources['1080p'] || movie.sources['720p'] || movie.sources['480p'] || movie.url;
    }
    return movie.url;
}

function chooseInitialSource(movie) {
    const qualityOrder = ['1080p', '720p', '480p'];
    const available = (movie.sources ? qualityOrder.filter(q => !!movie.sources[q]) : []);
    let preferred = '1080p';
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn && conn.effectiveType) {
        const et = conn.effectiveType.toLowerCase();
        if (et.includes('2g')) preferred = '480p';
        else if (et.includes('3g')) preferred = '720p';
        else preferred = '1080p';
    }
    const qualityKey = available.includes(preferred)
        ? preferred
        : (available[0] || null);
    if (qualityKey && movie.sources) {
        return { src: movie.sources[qualityKey], qualityKey };
    }
    return { src: movie.url, qualityKey: null };
}

// Switch quality preserving time and state (internal use if we later need)
function switchQuality(movie, quality) {
    const video = document.getElementById('videoPlayer');
    const currentTime = video.currentTime || 0;
    const wasPaused = video.paused;
    const playbackRate = video.playbackRate;
    const volume = video.volume;
    
    let newSrc = getBestSource(movie);
    if (quality && quality !== 'auto' && movie.sources && movie.sources[quality]) {
        newSrc = movie.sources[quality];
    }
    
    // Hint start-time via media fragments for faster server range (if supported)
    video.src = withTimeFragment(newSrc, currentTime);
    if (quality && quality !== 'auto') video.dataset.currentQuality = quality;
    video.playbackRate = playbackRate;
    video.volume = volume;
    
    const playPromise = video.play();
    if (playPromise) {
        playPromise.catch(() => {});
    }
    
    // Seek once metadata is loaded
    video.addEventListener('loadedmetadata', function handle() {
        video.currentTime = Math.min(currentTime, video.duration || currentTime);
        if (wasPaused) video.pause();
        video.removeEventListener('loadedmetadata', handle);
    });
}

function withTimeFragment(src, seconds) {
    try {
        const base = src.split('#')[0];
        const t = Math.max(0, Math.floor(seconds));
        return `${base}#t=${t}`;
    } catch (_) {
        return src;
    }
}

// Adaptive switching controller
function startAdaptiveStreaming(movie) {
    const video = document.getElementById('videoPlayer');
    const hasMulti = !!(movie.sources && (movie.sources['1080p'] || movie.sources['720p'] || movie.sources['480p']));
    if (!hasMulti) return;
    
    const qualityOrder = ['1080p', '720p', '480p'];
    const available = qualityOrder.filter(q => !!movie.sources[q]);
    if (available.length === 0) return;
    
    let waitingStartMs = null;
    let recentRebufferMs = 0;
    let lastCheckTs = performance.now();
    let stablePlaybackMs = 0;
    let downgradeCooldownMs = 5000;
    let lastSwitchTs = 0;
    
    function currentQualityKey() {
        return video.dataset.currentQuality || available[0];
    }
    function lowerQuality(q) {
        const idx = available.indexOf(q);
        return idx >= 0 && idx < available.length - 1 ? available[idx + 1] : null;
    }
    function higherQuality(q) {
        const idx = available.indexOf(q);
        return idx > 0 ? available[idx - 1] : null;
    }
    
    function tryDowngrade(reason) {
        const now = performance.now();
        if (now - lastSwitchTs < downgradeCooldownMs) return;
        const cur = currentQualityKey();
        const down = lowerQuality(cur);
        if (!down) return;
        lastSwitchTs = now;
        switchQuality(movie, down);
    }
    function tryUpgrade() {
        const now = performance.now();
        if (now - lastSwitchTs < 8000) return;
        const cur = currentQualityKey();
        const up = higherQuality(cur);
        if (!up) return;
        lastSwitchTs = now;
        switchQuality(movie, up);
    }
    
    function bufferAhead() {
        try {
            const b = video.buffered;
            if (!b || b.length === 0) return 0;
            const end = b.end(b.length - 1);
            return Math.max(0, end - video.currentTime);
        } catch (_) { return 0; }
    }
    
    function onWaiting() {
        if (waitingStartMs == null) waitingStartMs = performance.now();
    }
    function onPlaying() {
        const now = performance.now();
        if (waitingStartMs != null) {
            recentRebufferMs += now - waitingStartMs;
            waitingStartMs = null;
        }
        if (bufferAhead() < 3) {
            tryDowngrade('low-buffer');
        }
    }
    function onTimeUpdate() {
        const now = performance.now();
        const dt = now - lastCheckTs;
        lastCheckTs = now;
        if (!video.paused && !video.seeking) {
            if (waitingStartMs == null) {
                stablePlaybackMs += dt;
            }
        }
        // If rebuffering exceeded 1500ms within recent window, downgrade
        if (recentRebufferMs > 1500 || bufferAhead() < 2) {
            tryDowngrade('rebuffer');
            recentRebufferMs = 0;
            stablePlaybackMs = 0;
        }
        // Upgrade after 20s stable playback and comfortable buffer
        if (stablePlaybackMs > 20000 && bufferAhead() > 8) {
            tryUpgrade();
            stablePlaybackMs = 0;
        }
    }
    
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('seeking', () => { recentRebufferMs = 0; stablePlaybackMs = 0; });
    
    // Cleanup when modal closes
    const cleanup = () => {
        video.removeEventListener('waiting', onWaiting);
        video.removeEventListener('playing', onPlaying);
        video.removeEventListener('timeupdate', onTimeUpdate);
    };
    video._adaptiveCleanup = cleanup;
}

// Initialize custom video controls
function initializeVideoControls() {
    const video = document.getElementById('videoPlayer');
    if (video._controlsInit) return; // prevent duplicate listeners across opens
    video._controlsInit = true;
    const playPauseBtn = document.getElementById('playPauseBtn');
    const progressBar = document.getElementById('progressBar');
    const currentTimeEl = document.getElementById('currentTime');
    const durationEl = document.getElementById('duration');
    const volumeBtn = document.getElementById('volumeBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const speedBtn = document.getElementById('speedBtn');
    const speedMenu = document.getElementById('speedMenu');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const theaterBtn = document.getElementById('theaterBtn');
    const centerPlay = document.getElementById('centerPlay');
    const customControls = document.getElementById('customControls');
    const videoWrapper = document.querySelector('.video-wrapper');
    const loadingSpinner = document.getElementById('loadingSpinner');
    
    // Play/Pause
    playPauseBtn.addEventListener('click', togglePlayPause);
    video.addEventListener('click', togglePlayPause);
    
    function togglePlayPause() {
        if (video.paused) {
            video.play();
            playPauseBtn.textContent = '⏸️';
            centerPlay.classList.add('show');
            setTimeout(() => centerPlay.classList.remove('show'), 600);
        } else {
            video.pause();
            playPauseBtn.textContent = '▶️';
            centerPlay.classList.add('show');
            setTimeout(() => centerPlay.classList.remove('show'), 600);
        }
    }
    
    // Update play button when video state changes
    video.addEventListener('play', () => {
        playPauseBtn.textContent = '⏸️';
    });
    
    video.addEventListener('pause', () => {
        playPauseBtn.textContent = '▶️';
    });
    
    // Progress bar
    let isDraggingProgress = false;
    video.addEventListener('timeupdate', () => {
        const progress = (video.currentTime / video.duration) * 100;
        progressBar.value = progress || 0;
        if (!isDraggingProgress) {
            currentTimeEl.textContent = formatTime(video.currentTime);
        }
    });
    
    video.addEventListener('loadedmetadata', () => {
        durationEl.textContent = formatTime(video.duration);
    });
    
    // Scrub behavior: update label while dragging; seek on release
    function applySeek(targetTime) {
        try { loadingSpinner.classList.add('show'); } catch (_) {}
        const current = video.currentTime || 0;
        const jump = Math.abs((current) - (targetTime || 0));
        if (typeof video.fastSeek === 'function') {
            try { video.fastSeek(targetTime); } catch (_) { video.currentTime = targetTime; }
        } else if (jump > 30) {
            try {
                const baseSrc = (video.currentSrc || video.src || '');
                const cleanSrc = baseSrc.split('#')[0];
                const hinted = withTimeFragment(cleanSrc, targetTime);
                const wasPaused = video.paused;
                const rate = video.playbackRate;
                const vol = video.volume;
                video.src = hinted;
                video.playbackRate = rate;
                video.volume = vol;
                video.addEventListener('loadedmetadata', function handle() {
                    video.currentTime = Math.min(targetTime, video.duration || targetTime);
                    if (wasPaused) video.pause();
                    video.removeEventListener('loadedmetadata', handle);
                });
            } catch (_) { video.currentTime = targetTime; }
        } else {
            video.currentTime = targetTime;
        }
    }

    progressBar.addEventListener('input', () => {
        isDraggingProgress = true;
        const time = (progressBar.value / 100) * (video.duration || 0);
        currentTimeEl.textContent = formatTime(time);
    });
    const commitSeek = () => {
        const time = (progressBar.value / 100) * (video.duration || 0);
        applySeek(time);
        isDraggingProgress = false;
    };
    progressBar.addEventListener('change', commitSeek);
    progressBar.addEventListener('mouseup', commitSeek);
    progressBar.addEventListener('touchend', commitSeek, { passive: true });
    
    // Volume control
    volumeSlider.addEventListener('input', () => {
        video.volume = volumeSlider.value / 100;
        updateVolumeIcon();
    });
    
    volumeBtn.addEventListener('click', () => {
        if (video.volume > 0) {
            video.volume = 0;
            volumeSlider.value = 0;
        } else {
            video.volume = 1;
            volumeSlider.value = 100;
        }
        updateVolumeIcon();
    });
    
    function updateVolumeIcon() {
        if (video.volume === 0) {
            volumeBtn.textContent = '🔇';
        } else if (video.volume < 0.5) {
            volumeBtn.textContent = '🔉';
        } else {
            volumeBtn.textContent = '🔊';
        }
    }
    
    // Playback speed
    speedBtn.onclick = (e) => {
        e.stopPropagation();
        speedMenu.classList.toggle('show');
    };
    
    document.querySelectorAll('.speed-option').forEach(option => {
        option.onclick = (e) => {
            e.stopPropagation();
            const speed = parseFloat(option.dataset.speed);
            video.playbackRate = speed;
            speedBtn.textContent = speed + 'x';
            
            document.querySelectorAll('.speed-option').forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            speedMenu.classList.remove('show');
        };
    });
    
    // Close menus when clicking elsewhere
    const closeMenusHandler = () => {
        speedMenu.classList.remove('show');
    };
    document.addEventListener('click', closeMenusHandler);
    
    // Fullscreen
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    
    function toggleFullscreen() {
        // Prefer true container fullscreen for controls overlay
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            if (videoWrapper.requestFullscreen) {
                videoWrapper.requestFullscreen();
            } else if (videoWrapper.webkitRequestFullscreen) {
                videoWrapper.webkitRequestFullscreen();
            } else if (videoWrapper.mozRequestFullScreen) {
                videoWrapper.mozRequestFullScreen();
            } else if (videoWrapper.msRequestFullscreen) {
                videoWrapper.msRequestFullscreen();
            } else if (video.webkitEnterFullscreen) {
                // iOS Safari fallback: enter native video fullscreen
                video.webkitEnterFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }

    // Update icon based on fullscreenchange
    function syncFullscreenIcon() {
        const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
        fullscreenBtn.textContent = isFs ? '🗗' : '⛶';
    }
    document.addEventListener('fullscreenchange', syncFullscreenIcon);
    document.addEventListener('webkitfullscreenchange', syncFullscreenIcon);
    video.addEventListener('seeking', () => { try { loadingSpinner.classList.add('show'); } catch (_) {} });
    const hideSpinner = () => { try { loadingSpinner.classList.remove('show'); } catch (_) {} };
    video.addEventListener('seeked', hideSpinner);
    video.addEventListener('canplay', hideSpinner);
    
    // Theater mode
    theaterBtn.addEventListener('click', () => {
        const modalContent = document.querySelector('.video-modal-content');
        modalContent.classList.toggle('theater-mode');
        isTheaterMode = !isTheaterMode;
        theaterBtn.textContent = isTheaterMode ? '📱' : '🖥️';
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyPress);
    
    function handleKeyPress(e) {
        const modal = document.getElementById('videoModal');
        if (!modal.classList.contains('active')) return;
        
        switch(e.key.toLowerCase()) {
            case ' ':
            case 'k':
                e.preventDefault();
                togglePlayPause();
                break;
            case 'f':
                e.preventDefault();
                toggleFullscreen();
                break;
            case 'm':
                e.preventDefault();
                volumeBtn.click();
                break;
            case 'arrowleft':
                e.preventDefault();
                video.currentTime -= 5;
                break;
            case 'arrowright':
                e.preventDefault();
                video.currentTime += 5;
                break;
            case 'arrowup':
                e.preventDefault();
                video.volume = Math.min(video.volume + 0.1, 1);
                volumeSlider.value = video.volume * 100;
                updateVolumeIcon();
                break;
            case 'arrowdown':
                e.preventDefault();
                video.volume = Math.max(video.volume - 0.1, 0);
                volumeSlider.value = video.volume * 100;
                updateVolumeIcon();
                break;
            case 't':
                e.preventDefault();
                theaterBtn.click();
                break;
        }
    }
    
    // Auto-hide controls on idle (3s)
    let controlsTimeout;
    function armAutoHide() {
        clearTimeout(controlsTimeout);
        videoWrapper.classList.remove('hide-controls');
        customControls.classList.add('show');
        if (!video.paused) {
            controlsTimeout = setTimeout(() => {
                videoWrapper.classList.add('hide-controls');
                customControls.classList.remove('show');
            }, 3000);
        }
    }
    
    // Show on mouse move/enter
    ['mousemove', 'mouseenter'].forEach(evt => {
        videoWrapper.addEventListener(evt, armAutoHide);
    });
    
    // Also on key interactions
    ['play', 'pause', 'seeking', 'volumechange', 'ratechange'].forEach(evt => {
        video.addEventListener(evt, armAutoHide);
    });
    
    // Initial arm
    armAutoHide();
}

// Format time helper
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Delete movie
function deleteMovie(movieId) {
    if (confirm('Are you sure you want to delete this movie?')) {
        movies = movies.filter(m => m.id !== movieId);
        saveMovies();
        renderMovies();
    }
}

// Initialize event listeners
function initializeEventListeners() {
    // Close video modal
    const closeBtn = document.getElementById('closeBtn');
    const videoModal = document.getElementById('videoModal');
    const video = document.getElementById('videoPlayer');
    
    closeBtn.addEventListener('click', () => {
        closeVideoModal();
    });
    
    // Close modal when clicking outside
    videoModal.addEventListener('click', (e) => {
        if (e.target === videoModal) {
            closeVideoModal();
        }
    });
    
    function closeVideoModal() {
        videoModal.classList.remove('active');
        video.pause();
        video.src = '';
        if (video._adaptiveCleanup) { try { video._adaptiveCleanup(); } catch (_) {} }
        // If in fullscreen, exit
        if (document.fullscreenElement || document.webkitFullscreenElement) {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        }
        
        // Reset theater mode
        const modalContent = document.querySelector('.video-modal-content');
        modalContent.classList.remove('theater-mode');
        isTheaterMode = false;
        
        // Remove keyboard event listener
        document.removeEventListener('keydown', handleKeyPress);
    }
    
    // Floating add button
    const floatingAddBtn = document.getElementById('floatingAddBtn');
    const addMovieModal = document.getElementById('addMovieModal');
    const closeAddBtn = document.getElementById('closeAddBtn');
    
    floatingAddBtn.addEventListener('click', () => {
        addMovieModal.classList.add('active');
    });
    
    closeAddBtn.addEventListener('click', () => {
        addMovieModal.classList.remove('active');
    });
    
    // Close add modal when clicking outside
    addMovieModal.addEventListener('click', (e) => {
        if (e.target === addMovieModal) {
            addMovieModal.classList.remove('active');
        }
    });
    
    // Add movie form
    const addMovieForm = document.getElementById('addMovieForm');
    addMovieForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const title = document.getElementById('movieTitle').value;
        const description = document.getElementById('movieDescription').value;
        let url = document.getElementById('movieUrl').value;
        let url1080 = document.getElementById('movieUrl1080').value;
        let url720 = document.getElementById('movieUrl720').value;
        let url480 = document.getElementById('movieUrl480').value;
        const thumbnail = document.getElementById('movieThumbnail').value;
        const category = document.getElementById('movieCategory').value;
        
        // Ensure the URL ends with dl=1
        if (!url.includes('dl=1')) {
            if (url.includes('dl=0')) {
                url = url.replace('dl=0', 'dl=1');
            } else {
                url += (url.includes('?') ? '&' : '?') + 'dl=1';
            }
        }

        // Normalize optional quality URLs
        function normalize(u) {
            if (!u) return '';
            if (!u.includes('dl=1')) {
                if (u.includes('dl=0')) u = u.replace('dl=0', 'dl=1');
                else u += (u.includes('?') ? '&' : '?') + 'dl=1';
            }
            return u;
        }
        url1080 = normalize(url1080);
        url720 = normalize(url720);
        url480 = normalize(url480);
        
        const newMovie = {
            id: Date.now(),
            title,
            description,
            url,
            sources: {
                ...(url1080 ? { '1080p': url1080 } : {}),
                ...(url720 ? { '720p': url720 } : {}),
                ...(url480 ? { '480p': url480 } : {})
            },
            thumbnail,
            category
        };
        
        movies.push(newMovie);
        saveMovies();
        renderMovies();
        
        // Reset form and close modal
        addMovieForm.reset();
        addMovieModal.classList.remove('active');
        
        // Show success message
        alert('Movie added successfully! 🎬');
    });
    
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        
        if (searchTerm === '') {
            renderMovies();
            return;
        }
        
        const filtered = movies.filter(movie => 
            movie.title.toLowerCase().includes(searchTerm) ||
            movie.description.toLowerCase().includes(searchTerm) ||
            movie.category.toLowerCase().includes(searchTerm)
        );
        
        renderMovies(filtered);
    });
    
    // Prevent download shortcuts
    document.addEventListener('keydown', (e) => {
        // Prevent Ctrl+S (save)
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            return false;
        }
    });
}

// Disable right-click on entire page
document.addEventListener('contextmenu', (e) => {
    if (e.target.tagName === 'VIDEO') {
        e.preventDefault();
        return false;
    }
});

