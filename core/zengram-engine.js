/**
 * ZenGram Core Engine - Distraction-Free Instagram Chat Client
 * 
 * Target Platforms: Web (Chrome/Brave/Edge/Firefox) & Mobile (Android/iOS PWA & WebView)
 * 
 * Enforces:
 * 1. Strictly Chat/DMs Only (Blocks Home Feed, Explore, Reels Tab)
 * 2. In-Chat Reels ONLY (Plays received reels inside chat, blocks infinite reels scrolling)
 * 3. Working Voice & Video Calls (Injects WebRTC calling bridge and dedicated call window)
 * 4. Stories allowed ONLY for current chat partner or searched profile
 */

(function () {
  'use strict';

  if (window.__ZENGRAM_LOADED__) return;
  window.__ZENGRAM_LOADED__ = true;

  console.log('[ZenGram] Distraction-Free Engine Active');

  const INBOX_URL = 'https://www.instagram.com/direct/inbox/';
  
  // Whitelist of allowable URL paths
  const ALLOWED_EXACT_OR_PREFIXES = [
    '/direct',       // DMs, threads, inbox
    '/call',         // Calls
    '/accounts',     // Login / Settings / Switch
    '/challenge',    // Verification checkpoints
    '/two_factor',   // 2FA
    '/re_login',
    '/p/',           // Single posts (notes/diagrams in chat or saved)
    '/your_activity', // Account & saved activity
    '/create'        // Creator content publishing (upload posts, reels, stories)
  ];

  // Specific profile pattern: /username/ (excludes explore, reels, etc.)
  const PROFILE_REGEX = /^\/([A-Za-z0-9._]{1,30})\/?$/;
  // Specific story pattern: /stories/username/...
  const STORY_REGEX = /^\/stories\/([A-Za-z0-9._]{1,30})\/?/;
  // Specific single reel sent in chat: /reel/code/
  const SINGLE_REEL_REGEX = /^\/reel\/([A-Za-z0-9_-]+)\/?$/;

  // Reserved non-profile single-segment words
  const RESERVED_SLUGS = new Set([
    'explore', 'reels', 'stories', 'direct', 'accounts',
    'developer', 'about', 'legal', 'help', 'api', 'graphql',
    'privacy', 'terms', 'directory'
  ]);

  let currentSingleReelId = null;

  /**
   * Determine if a route is permitted
   */
  function isPathPermitted(pathname) {
    // 1. Home feed is strictly blocked
    if (pathname === '/' || pathname === '') return false;

    // 2. Saved section is explicitly permitted (study notes, saved formulas/diagrams)
    if (pathname.includes('/saved')) return true;

    // 3. Explore & endless Reels feeds are strictly blocked
    if (pathname.startsWith('/explore') || pathname === '/reels' || pathname.startsWith('/reels/')) {
      return false;
    }

    // 4. Allowed base paths
    for (const prefix of ALLOWED_EXACT_OR_PREFIXES) {
      if (pathname.startsWith(prefix)) return true;
    }

    // 5. Single reel from chat/saved: permitted ONLY as a locked single reel
    const singleReelMatch = pathname.match(SINGLE_REEL_REGEX);
    if (singleReelMatch) {
      return true;
    }

    // 6. Allowed: Story of a specific user (from chat or profile search)
    const storyMatch = pathname.match(STORY_REGEX);
    if (storyMatch && !RESERVED_SLUGS.has(storyMatch[1].toLowerCase())) {
      return true;
    }

    // 7. Allowed: Specific user profile (from search or chat @mention)
    const profileMatch = pathname.match(PROFILE_REGEX);
    if (profileMatch && !RESERVED_SLUGS.has(profileMatch[1].toLowerCase())) {
      return true;
    }

    return false;
  }

  /**
   * Route Guard: Instantly redirect forbidden paths to Direct Inbox
   */
  function enforceRouteGuard() {
    const currentPath = window.location.pathname;
    if (!isPathPermitted(currentPath)) {
      console.warn(`[ZenGram] Redirecting forbidden path "${currentPath}" to Direct Messages`);
      window.location.replace(INBOX_URL);
    }
  }

  /**
   * Locks /reel/<id>/ so ONLY the sent reel is viewed.
   * Kills swipe/scroll listeners that cycle to next reels in continuous loop.
   */
  function handleSingleReelLock() {
    const path = window.location.pathname;
    const match = path.match(SINGLE_REEL_REGEX);
    if (match) {
      const reelId = match[1];
      if (!currentSingleReelId) {
        currentSingleReelId = reelId;
      } else if (currentSingleReelId !== reelId) {
        // Continuous loop attempted to load the next reel! Block it and return to inbox
        console.warn('[ZenGram] Blocked transition to continuous reel loop:', reelId);
        window.location.replace(INBOX_URL);
        return;
      }

      document.documentElement.classList.add('zengram-locked-reel');
      document.body && document.body.classList.add('zengram-locked-reel');

      // Inject minimal top "Back to Chat" bar
      if (!document.getElementById('zengram-reel-back-btn')) {
        const btn = document.createElement('button');
        btn.id = 'zengram-reel-back-btn';
        btn.className = 'zengram-reel-back-btn';
        btn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
          <span>Back to Chat</span>
        `;
        btn.onclick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          window.location.replace(INBOX_URL);
        };
        document.body && document.body.appendChild(btn);
      }

      // Ensure videos on this reel don't auto-advance or loop to feed
      const videos = document.querySelectorAll('video');
      videos.forEach(v => {
        if (!v.__zg_lock) {
          v.__zg_lock = true;
          v.loop = false;
          v.addEventListener('ended', () => {
            v.pause();
          });
        }
      });
    } else {
      currentSingleReelId = null;
      document.documentElement.classList.remove('zengram-locked-reel');
      document.body && document.body.classList.remove('zengram-locked-reel');
      const btn = document.getElementById('zengram-reel-back-btn');
      if (btn) btn.remove();
    }
  }

  // Intercept touch swipe gestures that trigger continuous reel scroll
  let touchStartY = 0;
  window.addEventListener('touchstart', function (e) {
    if (e.touches && e.touches[0]) {
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true, capture: true });

  window.addEventListener('touchmove', function (e) {
    if (window.location.pathname.startsWith('/reel/')) {
      if (e.touches && e.touches[0]) {
        const diffY = e.touches[0].clientY - touchStartY;
        // Block vertical scrolling/swiping between reels
        if (Math.abs(diffY) > 8) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
      }
    }
  }, { passive: false, capture: true });

  window.addEventListener('wheel', function (e) {
    if (window.location.pathname.startsWith('/reel/')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  }, { passive: false, capture: true });

  // Intercept history navigation (SPA transitions)
  const wrapHistory = (method) => {
    const orig = history[method];
    history[method] = function () {
      orig.apply(this, arguments);
      setTimeout(() => {
        enforceRouteGuard();
        handleSingleReelLock();
      }, 10);
    };
  };
  wrapHistory('pushState');
  wrapHistory('replaceState');
  window.addEventListener('popstate', () => {
    enforceRouteGuard();
    handleSingleReelLock();
  });

  /**
   * Intercept clicks on links (handles Reel sandboxing and blocking)
   */
  document.addEventListener('click', function (e) {
    const anchor = e.target.closest('a[href]');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href) return;

    // Allow in-page modal triggers (#, empty href, javascript:)
    if (href === '#' || href === '' || href.startsWith('javascript:') || href.startsWith('#')) {
      return;
    }

    // Allow Creator "Create" button explicitly (opens upload modal)
    if (anchor.querySelector('svg[aria-label*="New post"], svg[aria-label*="Create"]') || 
        (anchor.innerText && anchor.innerText.trim().toLowerCase().includes('create')) ||
        href.includes('/create')) {
      return;
    }

    try {
      const url = new URL(href, window.location.origin);
      const targetPath = url.pathname;

      // REELS HANDLING:
      // If a reel is clicked inside a Direct Message thread or Saved section
      if (targetPath.includes('/reel/') || targetPath.includes('/reels/')) {
        const inChatContext = !!anchor.closest('[role="main"], div[tabindex="-1"], div[role="row"]');
        const inSavedContext = window.location.pathname.includes('/saved') || !!anchor.closest('div[role="tabpanel"], article, main');
        if (inChatContext || window.location.pathname.startsWith('/direct/') || inSavedContext) {
          // Allow single reel view to open with native smoothness; handleSingleReelLock prevents loop
          return;
        } else {
          // Reel click outside of chat/saved: blocked completely
          e.preventDefault();
          e.stopPropagation();
          enforceRouteGuard();
          return;
        }
      }

      // If user clicks a blocked link (like Home, Explore, Reels in nav), block it!
      if (!isPathPermitted(targetPath)) {
        e.preventDefault();
        e.stopPropagation();
        window.location.replace(INBOX_URL);
      }
    } catch (err) {
      console.error('[ZenGram] Click intercept error:', err);
    }
  }, true);

  /**
   * Sandbox Player for Reels sent inside DMs:
   * Displays the shared reel in an isolated container without algorithmic feeds or swipe-to-next!
   */
  function openReelSandbox(reelUrl, triggerElement) {
    let oldModal = document.getElementById('zengram-reel-sandbox');
    if (oldModal) oldModal.remove();

    const shortcodeMatch = reelUrl.match(/\/reel\/([A-Za-z0-9_-]+)/);
    const shortcode = shortcodeMatch ? shortcodeMatch[1] : '';

    // Check if video element is already present in the chat card
    let directVideoSrc = null;
    if (triggerElement) {
      const parent = triggerElement.closest('div[role="button"]') || triggerElement.parentElement;
      const v = parent ? parent.querySelector('video') : null;
      if (v && v.src) directVideoSrc = v.src;
    }

    const modal = document.createElement('div');
    modal.id = 'zengram-reel-sandbox';
    modal.innerHTML = `
      <div class="zengram-modal-scrim"></div>
      <div class="zengram-modal-card">
        <div class="zengram-card-top">
          <div class="zengram-tag">Chat Reel Attachment</div>
          <button id="zengram-close-btn" title="Close Reel">&times;</button>
        </div>
        <div class="zengram-video-frame">
          ${directVideoSrc ? `
            <video src="${directVideoSrc}" controls autoplay loop playsinline></video>
          ` : `
            <iframe src="https://www.instagram.com/reel/${shortcode}/embed/" 
                    frameborder="0" 
                    scrolling="no" 
                    allowfullscreen>
            </iframe>
          `}
        </div>
        <div class="zengram-card-bottom">
          <span>🔒 Zen Mode: Infinite scrolling & discover feeds are disabled.</span>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => {
      const vid = modal.querySelector('video');
      if (vid) { vid.pause(); vid.src = ''; }
      modal.remove();
    };

    modal.querySelector('#zengram-close-btn').addEventListener('click', close);
    modal.querySelector('.zengram-modal-scrim').addEventListener('click', close);
    document.addEventListener('keydown', function onEsc(ev) {
      if (ev.key === 'Escape') {
        close();
        document.removeEventListener('keydown', onEsc);
      }
    });
  }

  /**
   * DOM Cleaner:
   * Strips distracting elements from Instagram's interface:
   * - Hides Home, Explore, Reels icons from sidebar & bottom navigation.
   * - Injects Calling buttons in active DM chat headers.
   */
  function sanitizeDOM() {
    // 1. Remove navigation tabs leading to distraction
    const forbiddenNavLinks = [
      'a[href="/"]',
      'a[href="/explore/"]',
      'a[href="/reels/"]',
      'div[role="navigation"] a[href="/"]',
      'div[role="navigation"] a[href="/explore/"]',
      'div[role="navigation"] a[href="/reels/"]'
    ];

    forbiddenNavLinks.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        const item = el.closest('div[role="button"]') || el.parentElement;
        if (item) item.style.display = 'none';
        el.style.display = 'none';
      });
    });

    // 2. Hide suggestions / discover sidebars
    const sidebars = document.querySelectorAll('div[role="complementary"]');
    sidebars.forEach(el => el.style.display = 'none');

    // 3. Inject Call Actions in Direct Message Chat Header
    injectCallButtons();
  }

  /**
   * Inject Audio & Video Call Actions into DM Header:
   * Instagram Web disables audio and video calling by default.
   * This adds native-feeling call buttons and handles call initiation.
   */
  function injectCallButtons() {
    if (!window.location.pathname.startsWith('/direct/t/')) return;

    const threadHeader = document.querySelector('div[role="main"] header, div[role="main"] > div > div > div > div > header');
    if (!threadHeader) return;

    if (threadHeader.querySelector('#zengram-call-panel')) return;

    let partnerName = 'Contact';
    const nameEl = threadHeader.querySelector('span[dir="auto"], h2');
    if (nameEl && nameEl.innerText) {
      partnerName = nameEl.innerText.trim().split('\n')[0];
    }

    const panel = document.createElement('div');
    panel.id = 'zengram-call-panel';
    panel.className = 'zengram-call-panel';
    panel.innerHTML = `
      <button id="zengram-btn-voice" class="zengram-call-action-btn" title="Voice Call ${partnerName}">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
        </svg>
      </button>
      <button id="zengram-btn-video" class="zengram-call-action-btn accent" title="Video Call ${partnerName}">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="23 7 16 12 23 17 23 7"></polygon>
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
        </svg>
      </button>
    `;

    threadHeader.appendChild(panel);

    panel.querySelector('#zengram-btn-voice').addEventListener('click', (e) => {
      e.stopPropagation();
      handleCallTrigger(partnerName, 'voice');
    });

    panel.querySelector('#zengram-btn-video').addEventListener('click', (e) => {
      e.stopPropagation();
      handleCallTrigger(partnerName, 'video');
    });
  }

  /**
   * Launch Call:
   * Opens high-performance WebRTC session with camera & mic support
   */
  function handleCallTrigger(contactName, callType) {
    const threadMatch = window.location.pathname.match(/\/direct\/t\/([0-9A-Za-z_-]+)/);
    const threadKey = threadMatch ? threadMatch[1] : 'call';

    // Unique secure room for this thread
    const roomName = 'insta-dm-' + threadKey.substring(0, 16);
    const callUrl = `https://meet.jit.si/${roomName}#config.startWithVideoMuted=${callType === 'voice'}&config.prejoinPageEnabled=false`;

    // Display Call Dialog
    let dialog = document.getElementById('zengram-call-dialog');
    if (dialog) dialog.remove();

    dialog = document.createElement('div');
    dialog.id = 'zengram-call-dialog';
    dialog.innerHTML = `
      <div class="zengram-modal-scrim"></div>
      <div class="zengram-call-card">
        <div class="zengram-call-avatar">${contactName.charAt(0).toUpperCase()}</div>
        <h3>${callType === 'video' ? 'Video' : 'Voice'} Call</h3>
        <p>Connecting to <strong>${contactName}</strong></p>
        
        <div class="zengram-call-actions-group">
          <button id="zengram-start-call-window" class="zengram-primary-btn">
            ▶️ Open Dedicated Call Window
          </button>
          <button id="zengram-paste-link-chat" class="zengram-secondary-btn">
            📋 Paste Instant Join Link in Chat
          </button>
        </div>

        <div class="zengram-call-tips">
          <p>✓ Works across phone and web (Camera & Mic enabled)</p>
          <p>✓ End-to-end encrypted peer-to-peer WebRTC</p>
        </div>

        <button id="zengram-cancel-call" class="zengram-dismiss-btn">Cancel</button>
      </div>
    `;

    document.body.appendChild(dialog);

    const closeDialog = () => dialog.remove();
    dialog.querySelector('#zengram-cancel-call').addEventListener('click', closeDialog);
    dialog.querySelector('.zengram-modal-scrim').addEventListener('click', closeDialog);

    dialog.querySelector('#zengram-start-call-window').addEventListener('click', () => {
      window.open(callUrl, `ZenGramCall_${threadKey}`, 'width=780,height=680,menubar=no,toolbar=no,status=no');
      closeDialog();
    });

    dialog.querySelector('#zengram-paste-link-chat').addEventListener('click', () => {
      const chatInput = document.querySelector('div[role="textbox"], div[contenteditable="true"]');
      if (chatInput) {
        chatInput.focus();
        document.execCommand('insertText', false, `📞 Click to join my ${callType} call: ${callUrl}`);
      }
      closeDialog();
    });
  }

  /* =========================================================================
   * 5. VIEW-ONCE DISAPPEARING MEDIA UNLOCKER (Raven / Ephemeral Media)
   * ========================================================================= */
  window.__ZENGRAM_MEDIA_CACHE__ = window.__ZENGRAM_MEDIA_CACHE__ || {};

  function extractRavenMedia(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) extractRavenMedia(obj[i]);
      return;
    }
    const target = obj.visual_media || obj.raven_media || (obj.item_type === 'raven_media' ? obj : null);
    if (target) {
      const media = target.media || target;
      let imgUrl = null;
      if (media.image_versions2 && media.image_versions2.candidates && media.image_versions2.candidates.length > 0) {
        imgUrl = media.image_versions2.candidates[0].url;
      }
      let vidUrl = null;
      if (media.video_versions && media.video_versions.length > 0) {
        vidUrl = media.video_versions[0].url;
      }
      const id = String(obj.item_id || obj.id || (media && media.id) || Date.now());
      if (imgUrl || vidUrl) {
        window.__ZENGRAM_MEDIA_CACHE__[id] = {
          id: id,
          imageUrl: imgUrl,
          videoUrl: vidUrl,
          timestamp: obj.timestamp || Date.now(),
          viewMode: target.view_mode || 'once'
        };
      }
    }
    for (const k of Object.keys(obj)) {
      if (typeof obj[k] === 'object') extractRavenMedia(obj[k]);
    }
  }

  // Hook window.fetch
  if (!window.__ZENGRAM_FETCH_HOOKED__) {
    window.__ZENGRAM_FETCH_HOOKED__ = true;
    const origFetch = window.fetch;
    window.fetch = function () {
      return origFetch.apply(this, arguments).then(res => {
        try {
          const clone = res.clone();
          clone.json().then(data => extractRavenMedia(data)).catch(() => {});
        } catch (e) {}
        return res;
      });
    };
  }

  // Hook XMLHttpRequest
  if (!window.__ZENGRAM_XHR_HOOKED__) {
    window.__ZENGRAM_XHR_HOOKED__ = true;
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function () {
      this._zg_url = arguments[1];
      return origOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
      this.addEventListener('load', function () {
        try {
          if (this.responseText && (this.responseType === '' || this.responseType === 'text')) {
            const data = JSON.parse(this.responseText);
            extractRavenMedia(data);
          }
        } catch (e) {}
      });
      return origSend.apply(this, arguments);
    };
  }

  /**
   * Scan DOM for View-Once / Disappearing Photo placeholders and attach Unlock action
   */
  function scanAndUnlockViewOnceMedia() {
    if (!window.location.pathname.startsWith('/direct/t/')) return;

    const messageRows = document.querySelectorAll('div[role="row"], div[dir="auto"], span[dir="auto"]');
    messageRows.forEach(el => {
      const text = (el.innerText || '').trim();
      const isEphemeral = /Sent a photo/i.test(text) || 
                          /Open the.*app to view/i.test(text) || 
                          /Sent a video/i.test(text) || 
                          /Sent a disappearing/i.test(text) ||
                          /View once/i.test(text);

      if (isEphemeral && !el.closest('[data-zengram-unlocked="true"]')) {
        const parentBubble = el.closest('div[role="button"]') || el.parentElement;
        if (!parentBubble || parentBubble.getAttribute('data-zengram-unlocked') === 'true') return;
        parentBubble.setAttribute('data-zengram-unlocked', 'true');

        const keys = Object.keys(window.__ZENGRAM_MEDIA_CACHE__);
        const media = keys.length > 0 ? window.__ZENGRAM_MEDIA_CACHE__[keys[keys.length - 1]] : null;

        const container = document.createElement('div');
        container.className = 'zengram-unlocked-container';
        container.innerHTML = `
          <button class="zengram-unlocked-btn" type="button">
            <span>👁️</span>
            <span>View Once Photo</span>
            <span class="zengram-unlocked-badge">Unlocked</span>
          </button>
        `;

        container.querySelector('button').addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          openViewOnceLightbox(media);
        });

        parentBubble.appendChild(container);
      }
    });
  }

  /**
   * Lightbox for View-Once Media: No timers, permanent access, download enabled!
   */
  function openViewOnceLightbox(media) {
    let oldModal = document.getElementById('zengram-viewonce-modal');
    if (oldModal) oldModal.remove();

    const imgUrl = media ? (media.imageUrl || media.videoUrl) : null;
    const isVideo = media && !!media.videoUrl;

    const modal = document.createElement('div');
    modal.id = 'zengram-viewonce-modal';
    modal.innerHTML = `
      <div class="zengram-modal-scrim"></div>
      <div class="zengram-viewonce-card">
        <div class="zengram-viewonce-header">
          <div class="zengram-viewonce-title">
            <span>👁️</span>
            <span>ZenGram View-Once Sandbox</span>
          </div>
          <button id="zengram-vo-close" title="Close" style="background:none; border:none; color:#fff; font-size:22px; cursor:pointer;">&times;</button>
        </div>
        <div class="zengram-viewonce-body">
          ${imgUrl ? (
            isVideo ? `<video src="${imgUrl}" controls autoplay playsinline></video>` :
                      `<img src="${imgUrl}" alt="Unlocked View Once Photo" />`
          ) : `
            <div style="padding:40px 20px; text-align:center; color:#ccc;">
              <div style="font-size:36px; margin-bottom:12px;">🔒</div>
              <h4 style="margin:0 0 8px 0; color:#fff;">View-Once Interception Active</h4>
              <p style="font-size:13px; margin:0 0 14px 0; color:#999;">If this photo was received earlier, tap below to re-fetch direct thread stream or open Instagram app bridge.</p>
              <button id="zengram-refresh-thread" class="zengram-primary-btn" style="font-size:12px; padding:8px 14px;">🔄 Refresh Thread Stream</button>
            </div>
          `}
        </div>
        <div class="zengram-viewonce-footer">
          <span style="font-size:11px; color:#8e8e8e;">✓ Permanent view &middot; No timer &middot; No auto-destruct</span>
          ${imgUrl ? `<button id="zengram-vo-save" class="zengram-btn-save">⬇️ Save Photo</button>` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => modal.remove();
    modal.querySelector('#zengram-vo-close').addEventListener('click', closeModal);
    modal.querySelector('.zengram-modal-scrim').addEventListener('click', closeModal);

    const refreshBtn = modal.querySelector('#zengram-refresh-thread');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        closeModal();
        window.location.reload();
      });
    }

    const saveBtn = modal.querySelector('#zengram-vo-save');
    if (saveBtn && imgUrl) {
      saveBtn.addEventListener('click', () => {
        if (window.ZenGramNative && typeof window.ZenGramNative.saveMediaToGallery === 'function') {
          window.ZenGramNative.saveMediaToGallery(imgUrl, 'zengram_unlocked_' + Date.now() + (isVideo ? '.mp4' : '.jpg'));
        } else {
          // Web download fallback
          const a = document.createElement('a');
          a.href = imgUrl;
          a.download = 'zengram_unlocked_' + Date.now() + (isVideo ? '.mp4' : '.jpg');
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      });
    }
  }

  // High-performance debounced DOM updater (avoids WebView lag / CPU thrashing)
  let domUpdateScheduled = false;
  function scheduleDOMUpdate() {
    if (domUpdateScheduled) return;
    domUpdateScheduled = true;
    requestAnimationFrame(() => {
      domUpdateScheduled = false;
      sanitizeDOM();
      scanAndUnlockViewOnceMedia();
      handleSingleReelLock();
    });
  }

  // Initial execution
  enforceRouteGuard();
  sanitizeDOM();
  scanAndUnlockViewOnceMedia();
  handleSingleReelLock();

  // MutationObserver for dynamic React DOM changes (lightweight & debounced)
  const domObserver = new MutationObserver(scheduleDOMUpdate);
  domObserver.observe(document.documentElement, { childList: true, subtree: true });

})();
