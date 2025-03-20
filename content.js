// 在页面加载完成后执行
window.addEventListener('load', function() {
  // 检查是否需要应用已保存的设置
  chrome.storage.sync.get(['hideRadio', 'hideCheckbox', 'hideResults', 'hideInputs'], function(result) {
    if (result.hideRadio) {
      toggleRadioVisibility(true);
    }
    if (result.hideCheckbox) {
      toggleCheckboxVisibility(true);
    }
    if (result.hideResults) {
      toggleResultsVisibility(true);
    }
    if (result.hideInputs) {
      toggleInputsVisibility(true);
    }
  });
});

// 监听来自popup或background的消息
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log('收到消息:', message);
  
  switch (message.type) {
    case 'radio':
      toggleRadioVisibility(message.hide);
      break;
    case 'checkbox':
      toggleCheckboxVisibility(message.hide);
      break;
    case 'results':
      toggleResultsVisibility(message.hide);
      break;
    case 'inputs':
      toggleInputsVisibility(message.hide);
      break;
  }
  
  // 返回确认消息
  sendResponse({ success: true });
  return true;
});

// 控制单选按钮的可见性
function toggleRadioVisibility(hide) {
  const radioInputs = document.querySelectorAll('input[type="radio"]');
  radioInputs.forEach(function(input) {
    input.style.opacity = hide ? '0' : '1';
  });
}

// 控制多选按钮的可见性
function toggleCheckboxVisibility(hide) {
  const checkboxInputs = document.querySelectorAll('input[type="checkbox"]');
  checkboxInputs.forEach(function(input) {
    input.style.opacity = hide ? '0' : '1';
  });
}

// 控制结果区域的可见性
function toggleResultsVisibility(hide) {
  const targetDivs = document.querySelectorAll('div.space-y-4.text-sm.bg-bg-light.p-4.rounded-lg');
  targetDivs.forEach(function(div) {
    div.style.opacity = hide ? '0' : '1';
  });
}

// 控制填空输入框的可见性
function toggleInputsVisibility(hide) {
  const targetInputs = document.querySelectorAll('input');
  targetInputs.forEach(function(input) {
    input.style.color = hide ? 'transparent' : 'black';
  });
}

// 监听DOM变化，处理动态加载的元素
const observer = new MutationObserver(function(mutations) {
  chrome.storage.sync.get(['hideRadio', 'hideCheckbox', 'hideResults', 'hideInputs'], function(result) {
    if (result.hideRadio) {
      toggleRadioVisibility(true);
    }
    if (result.hideCheckbox) {
      toggleCheckboxVisibility(true);
    }
    if (result.hideResults) {
      toggleResultsVisibility(true);
    }
    if (result.hideInputs) {
      toggleInputsVisibility(true);
    }
  });
});

// 配置观察器
observer.observe(document.body, {
  childList: true,
  subtree: true
}); 