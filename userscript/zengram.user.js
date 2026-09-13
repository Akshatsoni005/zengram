// ==UserScript==
// @name         ZenGram - Distraction-Free Instagram Chat Suite
// @namespace    https://github.com/zengram/app
// @version      1.0.0
// @description  Strict Direct Messages only: Blocks Home Feed, Explore, and Reels tab. Sandboxes in-chat reels, allows friend-only stories, and adds working voice/video calls!
// @author       ZenGram
// @match        https://*.instagram.com/*
// @run-at       document-start
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  'use strict';

  // Inject CSS styles
  const CSS = `
    a[href="/"],
    a[href="/explore/"],
    a[href="/reels/"],
    div[role="navigation"] a[href="/"],
    div[role="navigation"] a[href="/explore/"],
    div[role="navigation"] a[href="/reels/"],
    footer,
    div[role="complementary"] {
      display: none !important;
    }
    .zengram-call-panel {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      margin-left: auto;
      padding-right: 12px;
      z-index: 99;
    }
    .zengram-call-action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      background: rgba(255, 255, 255, 0.1);
      color: #efefef;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s;
    }
    .zengram-call-action-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: scale(1.05);
    }
    .zengram-call-action-btn.accent {
      background: #0095f6;
      color: #fff;
    }
    .zengram-modal-scrim {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      z-index: 999990;
    }
    #zengram-reel-sandbox {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999991;
    }
    .zengram-modal-card {
      position: relative;
      z-index: 999995;
      background: #121212;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 16px;
      width: 90%;
      max-width: 440px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
    }
    .zengram-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .zengram-tag {
      font-size: 13px;
      font-weight: 600;
      color: #0095f6;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    #zengram-close-btn {
      background: none;
      border: none;
      color: #fff;
      font-size: 24px;
      line-height: 1;
      cursor: pointer;
    }
    .zengram-video-frame {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #000;
      min-height: 480px;
    }
    .zengram-video-frame video,
    .zengram-video-frame iframe {
      width: 100%;
      height: 100%;
      max-height: 600px;
      border: none;
    }
    .zengram-card-bottom {
      padding: 10px 14px;
      font-size: 11px;
      color: #8e8e8e;
      text-align: center;
      background: #181818;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    #zengram-call-dialog {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999992;
    }
    .zengram-call-card {
      position: relative;
      z-index: 999996;
      background: #1c1c1e;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 20px;
      width: 90%;
      max-width: 380px;
      padding: 24px;
      text-align: center;
      color: #fff;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
    }
    .zengram-call-avatar {
      width: 72px;
      height: 72px;
      background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
      color: #fff;
      font-size: 28px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      margin: 0 auto 16px auto;
    }
    .zengram-call-actions-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin: 16px 0;
    }
    .zengram-primary-btn {
      background: #0095f6;
      color: #fff;
      border: none;
      padding: 12px 16px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
    }
    .zengram-secondary-btn {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 11px 16px;
      border-radius: 10px;
      font-weight: 500;
      font-size: 13px;
      cursor: pointer;
    }
    .zengram-call-tips {
      background: rgba(255, 255, 255, 0.04);
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 16px;
      text-align: left;
    }
    .zengram-call-tips p {
      margin: 4px 0;
      font-size: 11px;
      color: #8e8e8e;
    }
    .zengram-dismiss-btn {
      background: none;
      border: none;
      color: #ff3b30;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  (document.head || document.documentElement).appendChild(styleEl);

  // Engine logic
  const INBOX_URL = 'https://www.instagram.com/direct/inbox/';
  const ALLOWED_PATHS = ['/direct', '/call', '/accounts', '/challenge', '/two_factor', '/re_login', '/p/', '/your_activity', '/create'];
  const PROFILE_REGEX = /^\/([A-Za-z0-9._]{1,30})\/?$/;
  const STORY_REGEX = /^\/stories\/([A-Za-z0-9._]{1,30})\/?/;
  const RESERVED_SLUGS = new Set(['explore', 'reels', 'stories', 'direct', 'accounts', 'about', 'developer', 'legal', 'help', 'api']);

  function isPathPermitted(p) {
    if (p === '/' || p === '') return false;
    if (p.includes('/saved')) return true;
    if (p.startsWith('/explore') || p.startsWith('/reels')) return false;
    for (const a of ALLOWED_PATHS) {
      if (p.startsWith(a)) return true;
    }
    const sm = p.match(STORY_REGEX);
    if (sm && !RESERVED_SLUGS.has(sm[1].toLowerCase())) return true;
    const pm = p.match(PROFILE_REGEX);
    if (pm && !RESERVED_SLUGS.has(pm[1].toLowerCase())) return true;
    return false;
  }

  function enforceRouteGuard() {
    const cur = window.location.pathname;
    if (!isPathPermitted(cur)) {
      window.location.replace(INBOX_URL);
    }
  }

  const wrapHistory = (m) => {
    const o = history[m];
    history[m] = function () {
      o.apply(this, arguments);
      setTimeout(enforceRouteGuard, 15);
    };
  };
  wrapHistory('pushState');
  wrapHistory('replaceState');
  window.addEventListener('popstate', enforceRouteGuard);

  // Intercept clicks
  document.addEventListener('click', function (e) {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href) return;

    // Allow in-page modal triggers (#, empty href, javascript:)
    if (href === '#' || href === '' || href.startsWith('javascript:') || href.startsWith('#')) {
      return;
    }

    // Allow Creator "Create" button explicitly (opens upload modal)
    if (a.querySelector('svg[aria-label*="New post"], svg[aria-label*="Create"]') || 
        (a.innerText && a.innerText.trim().toLowerCase().includes('create')) ||
        href.includes('/create')) {
      return;
    }

    try {
      const u = new URL(href, window.location.origin);
      const p = u.pathname;

      if (p.includes('/reel/') || p.includes('/reels/')) {
        const inChat = !!a.closest('[role="main"], div[tabindex="-1"], div[role="row"]');
        const inSaved = window.location.pathname.includes('/saved') || !!a.closest('div[role="tabpanel"], article, main');
        if (inChat || window.location.pathname.startsWith('/direct/') || inSaved) {
          e.preventDefault();
          e.stopPropagation();
          openReelSandbox(u.href, a);
          return;
        } else {
          e.preventDefault();
          e.stopPropagation();
          enforceRouteGuard();
          return;
        }
      }

      if (!isPathPermitted(p)) {
        e.preventDefault();
        e.stopPropagation();
        window.location.replace(INBOX_URL);
      }
    } catch (err) {}
  }, true);

  function openReelSandbox(reelUrl, triggerEl) {
    let old = document.getElementById('zengram-reel-sandbox');
    if (old) old.remove();

    const shortcode = (reelUrl.match(/\/reel\/([A-Za-z0-9_-]+)/) || [])[1] || '';
    let directSrc = null;
    if (triggerEl) {
      const p = triggerEl.closest('div[role="button"]') || triggerEl.parentElement;
      const v = p ? p.querySelector('video') : null;
      if (v && v.src) directSrc = v.src;
    }

    const modal = document.createElement('div');
    modal.id = 'zengram-reel-sandbox';
    modal.innerHTML = `
      <div class="zengram-modal-scrim"></div>
      <div class="zengram-modal-card">
        <div class="zengram-card-top">
          <div class="zengram-tag">Chat Reel Attachment</div>
          <button id="zengram-close-btn">&times;</button>
        </div>
        <div class="zengram-video-frame">
          ${directSrc ? `<video src="${directSrc}" controls autoplay loop playsinline></video>` : 
            `<iframe src="https://www.instagram.com/reel/${shortcode}/embed/" frameborder="0" scrolling="no" allowfullscreen></iframe>`}
        </div>
        <div class="zengram-card-bottom">
          <span>🔒 Infinite reels feed & recommendations blocked.</span>
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
  }

  function sanitizeDOM() {
    ['a[href="/"]', 'a[href="/explore/"]', 'a[href="/reels/"]'].forEach(s => {
      document.querySelectorAll(s).forEach(el => {
        const p = el.closest('div[role="button"]') || el.parentElement;
        if (p) p.style.display = 'none';
        el.style.display = 'none';
      });
    });
    injectCallButtons();
  }

  function injectCallButtons() {
    if (!window.location.pathname.startsWith('/direct/t/')) return;
    const header = document.querySelector('div[role="main"] header');
    if (!header || header.querySelector('#zengram-call-panel')) return;

    let partner = 'Contact';
    const n = header.querySelector('span[dir="auto"], h2');
    if (n && n.innerText) partner = n.innerText.trim().split('\n')[0];

    const p = document.createElement('div');
    p.id = 'zengram-call-panel';
    p.className = 'zengram-call-panel';
    p.innerHTML = `
      <button id="zengram-btn-voice" class="zengram-call-action-btn" title="Voice Call">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
      </button>
      <button id="zengram-btn-video" class="zengram-call-action-btn accent" title="Video Call">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
      </button>
    `;
    header.appendChild(p);

    p.querySelector('#zengram-btn-voice').addEventListener('click', () => launchCall(partner, 'voice'));
    p.querySelector('#zengram-btn-video').addEventListener('click', () => launchCall(partner, 'video'));
  }

  function launchCall(partner, type) {
    const threadKey = (window.location.pathname.match(/\/direct\/t\/([0-9A-Za-z_-]+)/) || [])[1] || 'call';
    const room = 'insta-' + threadKey.substring(0, 14);
    const url = `https://meet.jit.si/${room}#config.startWithVideoMuted=${type === 'voice'}&config.prejoinPageEnabled=false`;

    let d = document.getElementById('zengram-call-dialog');
    if (d) d.remove();

    d = document.createElement('div');
    d.id = 'zengram-call-dialog';
    d.innerHTML = `
      <div class="zengram-modal-scrim"></div>
      <div class="zengram-call-card">
        <div class="zengram-call-avatar">${partner.charAt(0).toUpperCase()}</div>
        <h3>${type === 'video' ? 'Video' : 'Voice'} Call</h3>
        <p>Calling <strong>${partner}</strong></p>
        <div class="zengram-call-actions-group">
          <button id="zengram-open-win" class="zengram-primary-btn">▶️ Open Dedicated Call Window</button>
          <button id="zengram-send-link" class="zengram-secondary-btn">📋 Paste Join Link in Chat</button>
        </div>
        <div class="zengram-call-tips">
          <p>✓ Camera & Mic hardware accelerated</p>
          <p>✓ Works on Web & Phone without Meta limits</p>
        </div>
        <button id="zengram-close-call" class="zengram-dismiss-btn">Cancel</button>
      </div>
    `;
    document.body.appendChild(d);

    const close = () => d.remove();
    d.querySelector('#zengram-close-call').addEventListener('click', close);
    d.querySelector('.zengram-modal-scrim').addEventListener('click', close);
    d.querySelector('#zengram-open-win').addEventListener('click', () => {
      window.open(url, 'ZenGramCall', 'width=800,height=700');
      close();
    });
    d.querySelector('#zengram-send-link').addEventListener('click', () => {
      const inp = document.querySelector('div[role="textbox"]');
      if (inp) {
        inp.focus();
        document.execCommand('insertText', false, `📞 Join my ${type} call: ${url}`);
      }
      close();
    });
  }

  enforceRouteGuard();
  sanitizeDOM();
  const obs = new MutationObserver(sanitizeDOM);
  obs.observe(document.documentElement, { childList: true, subtree: true });
  setInterval(() => { enforceRouteGuard(); sanitizeDOM(); }, 300);

})();
