document.addEventListener('DOMContentLoaded', () => {
  const deviceWrapper = document.getElementById('device-wrapper');
  const viewToggleBtn = document.getElementById('view-mode-toggle');
  const testFeedBtn = document.getElementById('test-feed-block');
  const testReelsBtn = document.getElementById('test-reels-block');
  const toast = document.getElementById('toast-banner');

  // 1. Phone vs Desktop Switcher
  let isMobile = true;
  viewToggleBtn.addEventListener('click', () => {
    isMobile = !isMobile;
    if (isMobile) {
      deviceWrapper.className = 'device-mobile';
      viewToggleBtn.textContent = '📱 Mobile Phone View';
      viewToggleBtn.classList.add('active');
    } else {
      deviceWrapper.className = 'device-desktop';
      viewToggleBtn.textContent = '💻 Desktop Web View';
      viewToggleBtn.classList.remove('active');
    }
  });

  // 2. Toast Notifier
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3200);
  }

  // 3. Test Blockers
  testFeedBtn.addEventListener('click', () => {
    showToast('🚫 Blocked: Home Feed is disabled in ZenGram to prevent mindless scrolling.');
  });

  testReelsBtn.addEventListener('click', () => {
    showToast('🚫 Blocked: Infinite Reels feed is disabled. You can only view Reels sent in DMs.');
  });

  // 4. In-Chat Reel Click -> Open Sandboxed Single Player
  const reelTrigger = document.getElementById('chat-reel-trigger');
  reelTrigger.addEventListener('click', () => {
    let existing = document.getElementById('zengram-reel-sandbox');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'zengram-reel-sandbox';
    modal.innerHTML = `
      <div class="zengram-modal-scrim"></div>
      <div class="zengram-modal-card">
        <div class="zengram-card-top">
          <div class="zengram-tag">Shared Chat Reel</div>
          <button id="zengram-close-btn">&times;</button>
        </div>
        <div class="zengram-video-frame" style="background:#111; color:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px; text-align:center;">
          <div style="font-size:48px; margin-bottom:12px;">🎬</div>
          <h4 style="margin-bottom:8px;">140W RTX 4050 vs 4060 Test</h4>
          <p style="font-size:12px; color:#8e8e8e; max-width:280px; margin-bottom:16px;">
            Single standalone video playing inside chat sandbox.
          </p>
          <div style="background:#222; border-radius:20px; padding:6px 16px; font-size:12px; color:#27c93f;">
            ▶️ Playing (0:32) • No Next Reel • No Algorithmic Feed
          </div>
        </div>
        <div class="zengram-card-bottom">
          <span>🔒 ZenGram: Distraction-free playback for direct messages only.</span>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector('#zengram-close-btn').addEventListener('click', close);
    modal.querySelector('.zengram-modal-scrim').addEventListener('click', close);
  });

  // 5. Calling Support (Voice & Video)
  const callVoiceBtn = document.getElementById('btn-call-audio');
  const callVideoBtn = document.getElementById('btn-call-video');

  function openCallDialog(type) {
    let dialog = document.getElementById('zengram-call-dialog');
    if (dialog) dialog.remove();

    const activeName = document.getElementById('active-chat-name').textContent;

    dialog = document.createElement('div');
    dialog.id = 'zengram-call-dialog';
    dialog.innerHTML = `
      <div class="zengram-modal-scrim"></div>
      <div class="zengram-call-card">
        <div class="zengram-call-avatar">${activeName.charAt(0)}</div>
        <h3>${type === 'video' ? 'Video' : 'Voice'} Call</h3>
        <p>Connecting with <strong>${activeName}</strong></p>
        <div class="zengram-call-actions-group">
          <button id="zengram-launch-call-btn" class="zengram-primary-btn">
            ▶️ Open Dedicated ${type === 'video' ? 'Video' : 'Audio'} Call Window
          </button>
          <button id="zengram-send-invite-btn" class="zengram-secondary-btn">
            📋 Paste Instant Join Link in Chat
          </button>
        </div>
        <div class="zengram-call-tips">
          <p>✓ Hardware accelerated (Camera & Mic authorized)</p>
          <p>✓ Bypasses Meta web calling restrictions seamlessly</p>
        </div>
        <button id="zengram-cancel-call-btn" class="zengram-dismiss-btn">Cancel</button>
      </div>
    `;
    document.body.appendChild(dialog);

    const close = () => dialog.remove();
    dialog.querySelector('#zengram-cancel-call-btn').addEventListener('click', close);
    dialog.querySelector('.zengram-modal-scrim').addEventListener('click', close);

    dialog.querySelector('#zengram-launch-call-btn').addEventListener('click', () => {
      showToast(`📞 ${type === 'video' ? 'Video' : 'Audio'} call window initialized with camera/mic stream!`);
      close();
    });

    dialog.querySelector('#zengram-send-invite-btn').addEventListener('click', () => {
      addMessage(`📞 Quick call link: https://meet.jit.si/zengram-${activeName.toLowerCase().replace(/\s+/g,'')}`, 'outgoing');
      close();
    });
  }

  callVoiceBtn.addEventListener('click', () => openCallDialog('voice'));
  callVideoBtn.addEventListener('click', () => openCallDialog('video'));

  // 6. Stories: Person in Chat or Search
  const storyModal = document.getElementById('story-modal');
  const closeStoryBtn = document.getElementById('close-story-btn');
  const storyScrim = document.getElementById('story-scrim');
  const chatContactBtn = document.getElementById('chat-contact-btn');
  const storyUsername = document.getElementById('story-username');
  const storyAvatarMini = document.getElementById('story-avatar-mini');

  function openStory(username, letter) {
    storyUsername.textContent = username;
    storyAvatarMini.textContent = letter;
    storyModal.classList.remove('hidden');
  }

  function closeStory() {
    storyModal.classList.add('hidden');
  }

  chatContactBtn.addEventListener('click', () => {
    const name = document.getElementById('active-chat-name').textContent;
    const letter = document.getElementById('active-avatar-letter').textContent;
    openStory(name, letter);
  });

  closeStoryBtn.addEventListener('click', closeStory);
  storyScrim.addEventListener('click', closeStory);

  // 7. Search Profile
  const searchNavBtn = document.querySelector('[data-view="search"]');
  const inboxNavBtn = document.querySelector('[data-view="inbox"]');
  const searchPane = document.getElementById('search-pane');
  const closeSearchBtn = document.getElementById('close-search-btn');
  const viewSearchedStoryBtn = document.getElementById('view-searched-story-btn');

  searchNavBtn.addEventListener('click', () => {
    searchPane.classList.remove('hidden');
    searchNavBtn.classList.add('active');
    inboxNavBtn.classList.remove('active');
  });

  function closeSearch() {
    searchPane.classList.add('hidden');
    searchNavBtn.classList.remove('active');
    inboxNavBtn.classList.add('active');
  }

  closeSearchBtn.addEventListener('click', closeSearch);
  inboxNavBtn.addEventListener('click', closeSearch);

  viewSearchedStoryBtn.addEventListener('click', () => {
    openStory('Ananya Sen', 'A');
  });

  // 7b. Saved Posts Pane
  const savedNavBtn = document.getElementById('nav-saved-btn');
  const savedPane = document.getElementById('saved-pane');
  const closeSavedBtn = document.getElementById('close-saved-btn');
  const viewSavedPostBtn = document.getElementById('view-saved-post-btn');
  const viewSavedReelBtn = document.getElementById('view-saved-reel-btn');

  savedNavBtn.addEventListener('click', () => {
    savedPane.classList.remove('hidden');
    searchPane.classList.add('hidden');
    savedNavBtn.classList.add('active');
    searchNavBtn.classList.remove('active');
    inboxNavBtn.classList.remove('active');
  });

  function closeSaved() {
    savedPane.classList.add('hidden');
    savedNavBtn.classList.remove('active');
    inboxNavBtn.classList.add('active');
  }

  closeSavedBtn.addEventListener('click', closeSaved);
  inboxNavBtn.addEventListener('click', closeSaved);

  viewSavedPostBtn.addEventListener('click', () => {
    showToast('✓ Opened Saved Post (/p/formula_sheet): View formulas without feed distraction.');
  });

  viewSavedReelBtn.addEventListener('click', () => {
    // Open in-chat style single-reel sandbox!
    reelTrigger.click();
    showToast('✓ Playing Saved Reel in isolated Zen sandbox! Infinite scroll disabled.');
  });

  // 8. Chat Sending Logic
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-msg-btn');
  const messagesContainer = document.getElementById('messages-container');

  function addMessage(text, type = 'outgoing') {
    const bubble = document.createElement('div');
    bubble.className = `msg-bubble ${type}`;
    bubble.innerHTML = `<p>${text}</p>`;
    messagesContainer.appendChild(bubble);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  sendBtn.addEventListener('click', () => {
    const val = chatInput.value.trim();
    if (val) {
      addMessage(val, 'outgoing');
      chatInput.value = '';
    }
  });

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sendBtn.click();
    }
  });

  // 9. Contact Switcher
  document.querySelectorAll('.convo-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.convo-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const name = item.dataset.name;
      const avatar = item.dataset.avatar;
      const hasStory = item.dataset.story === 'true';

      document.getElementById('active-chat-name').textContent = name;
      document.getElementById('active-avatar-letter').textContent = avatar;

      const avatarRing = document.getElementById('active-header-avatar');
      const sub = document.getElementById('active-chat-sub');
      if (hasStory) {
        avatarRing.classList.add('has-story');
        sub.textContent = 'Has Active Story • Tap to View';
      } else {
        avatarRing.classList.remove('has-story');
        sub.textContent = 'Active now';
      }
    });
  });

  // 10. Showcase Modal & Tab Switching
  const showcaseModal = document.getElementById('showcase-modal');
  const showcaseScrim = document.getElementById('showcase-scrim');
  const closeShowcaseBtn = document.getElementById('close-showcase-btn');
  const btnOpenShowcase = document.getElementById('btn-open-showcase');
  const btnOpenPrivacy = document.getElementById('btn-open-privacy');

  const tabs = ['features', 'creators', 'privacy', 'downloads'];

  function switchShowcaseTab(tabName) {
    tabs.forEach(t => {
      const btn = document.getElementById(`tab-btn-${t}`);
      const content = document.getElementById(`tab-content-${t}`);
      if (btn) btn.classList.toggle('active', t === tabName);
      if (content) content.classList.toggle('hidden', t !== tabName);
    });
  }

  tabs.forEach(t => {
    const btn = document.getElementById(`tab-btn-${t}`);
    if (btn) {
      btn.addEventListener('click', () => switchShowcaseTab(t));
    }
  });

  function openShowcase(defaultTab = 'features') {
    switchShowcaseTab(defaultTab);
    showcaseModal.classList.remove('hidden');
  }

  function closeShowcase() {
    showcaseModal.classList.add('hidden');
  }

  if (btnOpenShowcase) btnOpenShowcase.addEventListener('click', () => openShowcase('features'));
  if (btnOpenPrivacy) btnOpenPrivacy.addEventListener('click', () => openShowcase('privacy'));
  if (closeShowcaseBtn) closeShowcaseBtn.addEventListener('click', closeShowcase);
  if (showcaseScrim) showcaseScrim.addEventListener('click', closeShowcase);
});
