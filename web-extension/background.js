/**
 * ZenGram Background Service Worker
 * Enforces declarative network redirection to direct inbox
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('ZenGram Extension Installed.');

  // Set up redirect rules using declarativeNetRequest
  const rules = [
    {
      id: 1,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: { url: 'https://www.instagram.com/direct/inbox/' }
      },
      condition: {
        urlFilter: '||instagram.com/$',
        resourceTypes: ['main_frame']
      }
    },
    {
      id: 2,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: { url: 'https://www.instagram.com/direct/inbox/' }
      },
      condition: {
        urlFilter: '||instagram.com/explore*',
        resourceTypes: ['main_frame']
      }
    },
    {
      id: 3,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: { url: 'https://www.instagram.com/direct/inbox/' }
      },
      condition: {
        urlFilter: '||instagram.com/reels*',
        resourceTypes: ['main_frame']
      }
    }
  ];

  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1, 2, 3],
    addRules: rules
  });
});
