// 监听扩展安装或更新
chrome.runtime.onInstalled.addListener(function() {
  console.log('PTA复习助手已安装');
  
  // 初始化存储设置
  chrome.storage.sync.set({
    hideRadio: false,
    hideCheckbox: false,
    hideResults: false,
    hideInputs: false
  });
});

// 监听标签页更新
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url.includes('pintia.cn')) {
    // 当PTA页面加载完成时，尝试应用保存的设置
    chrome.storage.sync.get(['hideRadio', 'hideCheckbox', 'hideResults', 'hideInputs'], function(result) {
      if (result.hideRadio) {
        chrome.tabs.sendMessage(tabId, { type: 'radio', hide: true });
      }
      if (result.hideCheckbox) {
        chrome.tabs.sendMessage(tabId, { type: 'checkbox', hide: true });
      }
      if (result.hideResults) {
        chrome.tabs.sendMessage(tabId, { type: 'results', hide: true });
      }
      if (result.hideInputs) {
        chrome.tabs.sendMessage(tabId, { type: 'inputs', hide: true });
      }
    });
  }
}); 