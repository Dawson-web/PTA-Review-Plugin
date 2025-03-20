// 在页面加载完成后执行
window.addEventListener("load", function () {
  // 检查是否需要应用已保存的设置
  chrome.storage.sync.get(
    ["hideRadio", "hideCheckbox", "hideResults", "hideInputs"],
    function (result) {
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
    }
  );
});

// 监听来自popup或background的消息
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log("收到消息:", message);

  switch (message.type) {
    case "radio":
      toggleRadioVisibility(message.hide);
      break;
    case "checkbox":
      toggleCheckboxVisibility(message.hide);
      break;
    case "results":
      toggleResultsVisibility(message.hide);
      break;
    case "inputs":
      toggleInputsVisibility(message.hide);
      break;
    case "exportAnswers":
      exportAnswers();
      break;
  }

  // 返回确认消息
  sendResponse({ success: true });
  return true;
});

// 控制单选按钮的可见性
function toggleRadioVisibility(hide) {
  const radioInputs = document.querySelectorAll('input[type="radio"]');
  radioInputs.forEach(function (input) {
    input.style.opacity = hide ? "0" : "1";
  });
}

// 控制多选按钮的可见性
function toggleCheckboxVisibility(hide) {
  const checkboxInputs = document.querySelectorAll('input[type="checkbox"]');
  checkboxInputs.forEach(function (input) {
    input.style.opacity = hide ? "0" : "1";
  });
}

// 控制结果区域的可见性
function toggleResultsVisibility(hide) {
  const targetDivs = document.querySelectorAll(
    "div.space-y-4.text-sm.bg-bg-light.p-4.rounded-lg"
  );
  targetDivs.forEach(function (div) {
    div.style.opacity = hide ? "0" : "1";
  });
}

// 控制填空输入框的可见性
function toggleInputsVisibility(hide) {
  const targetInputs = document.querySelectorAll("input");
  targetInputs.forEach(function (input) {
    input.style.color = hide ? "transparent" : "black";
  });
}

// 导出答题记录
function exportAnswers() {
  // 获取目标元素
  const element = document.querySelector(
    'div[class*="flex"][class*="flex-col"][class*="h-[var(--height-exclude-header)]"][class*="overflow-auto"]'
  );

  if (!element) return;

  // 克隆元素（包括子元素）
  const clonedElement = element.cloneNode(true);

  // 内联关键样式（确保独立显示）
  inlineStyles(clonedElement);

  // 构建完整的 HTML 内容
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>导出的内容</title>
  <style>
    /* 内联关键全局样式（根据实际需求调整） */
    body { margin: 0; font-family: Arial, sans-serif; }
    ${getDocumentStyles()}  // 提取页面中的相关 CSS
  </style>
</head>
<body>
  ${clonedElement.outerHTML}
</body>
</html>
  `;
  // 生成并下载 HTML 文件
  const blob = new Blob([htmlContent], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${getDocumentName()}.html`;
  link.click();

  URL.revokeObjectURL(url);
}

// 提取页面中所有 CSS 规则
function getDocumentStyles() {
  return Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join("\n");
      } catch (e) {
        return ""; // 忽略跨域样式表
      }
    })
    .join("\n");
}

function getDocumentName() {
  return document.title.replace(" ", "");
}

// 内联元素样式（处理行内样式和计算样式）
function inlineStyles(element) {
  // 内联元素自身样式
  const computedStyle = window.getComputedStyle(element);
  element.style.cssText = computedStyle.cssText;

  // 递归处理子元素
  Array.from(element.children).forEach((child) => inlineStyles(child));
}

// 监听DOM变化，处理动态加载的元素
const observer = new MutationObserver(function (mutations) {
  chrome.storage.sync.get(
    ["hideRadio", "hideCheckbox", "hideResults", "hideInputs"],
    function (result) {
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
    }
  );
});

// 配置观察器
observer.observe(document.body, {
  childList: true,
  subtree: true,
});
