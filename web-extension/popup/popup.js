document.getElementById('btn-open-inbox').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://www.instagram.com/direct/inbox/' });
});
