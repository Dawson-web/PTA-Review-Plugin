const Type = {
  TRUE_OR_FALSE: 1,
  MULTIPLE_CHOICE: 2,
  MULTIPLE_CHOICE_MORE_THAN_ONE_ANSWER: 3,
  FILL_IN_THE_BLANK: 4,
};
// 在页面加载完成后执行
window.addEventListener("load", function () {
  // 检查是否需要应用已保存的设置
  chrome.storage.sync.get(
    [
      "hideRadio",
      "hideCheckbox",
      "hideResults",
      "hideInputs",
      "trainingMode",
      "filterError",
    ],
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
      if (result.trainingMode) {
        toggleTrainingMode(true);
      }
      if (result.filterError) {
        toggleRightVisibility(true);
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
    case "trainingMode":
      console.log("trainingMode2 message");
      toggleTrainingMode(message.hide);
      break;
    case "exportAnswers":
      exportAnswers();
      break;
    case "filterError":
      toggleRightVisibility(message.hide);
      break;
    case "importAnswers":
      importAnswers();
      break;
    case "exportJson":
      exportJson(2);
      break;
    case "editAnswers":
      createAnswerEditModal();
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

// 函数：处理答案提交的逻辑
function handleSubmitAnswers(res) {
  const problemSetId = window.location.pathname.split("/")[2];
  const type = window.location.pathname.split("/").pop();
  const answers = JSON.parse(localStorage.getItem(problemSetId));
  const errorAnswers = [];
  switch (type) {
    case "1": {
      let index = 1;
      const trueOrFalse = answers.TRUE_OR_FALSE.problems;
      for (const [id, value] of res) {
        // console.log(trueOrFalse[id], id, value);
        console.log(trueOrFalse[id], value);
        if (!trueOrFalse[id].answers.startsWith(value)) {
          errorAnswers.push({
            id: `R${type}-${index}`,
            content: trueOrFalse[id].content,
            answer: trueOrFalse[id].answers,
            errorAnswer: value,
          });
        }
        index++;
      }
      break;
    }
    case "2": {
      const multipleChoice = answers.MULTIPLE_CHOICE.problems;
      let index = 1;
      for (const [id, value] of res) {
        console.log(multipleChoice[id], value);

        if (multipleChoice[id].answers !== value) {
          errorAnswers.push({
            id: `R${type}-${index}`,
            content: multipleChoice[id].content,
            answer: multipleChoice[id].answers,
            errorAnswer: value,
          });
        }
        index++;
      }
      break;
    }
    case "3": {
      const multipleChoiceMoreThanOneAnswer =
        answers.MULTIPLE_CHOICE_MORE_THAN_ONE_ANSWER.problems;
      let index = 1;
      const res_ = new Map();
      for (const [id, value] of res) {
        if (!value) continue;
        const baseId = id.split(".")[0];
        if (res_.has(baseId)) {
          res_.set(
            baseId,
            (res_.get(baseId) + value).split("").sort().join("")
          );
        } else {
          res_.set(baseId, value);
        }
      }
      for (const [id, value] of res_) {
        const correctAnswer = multipleChoiceMoreThanOneAnswer[id].answers
          .slice()
          .sort()
          .join("");
        if (correctAnswer !== value) {
          errorAnswers.push({
            id: `R${type}-${index}`,
            content: multipleChoiceMoreThanOneAnswer[id].content,
            answer: multipleChoiceMoreThanOneAnswer[id].answers,
            errorAnswer: value.split(""),
          });
        }
        index++;
      }
      break;
    }
  }

  // 根据 errorAnswers 显示结果
  if (errorAnswers.length > 0) {
    let htmlContent = "<h5>错题详情:</h5>";
    htmlContent += `<table style="width:100%; border-collapse: collapse; margin-top: 10px;">
      <thead>
        <tr style="background-color: #f2f2f2; text-align: left;">
          <th style="padding: 8px; border: 1px solid #ddd;">题号</th>
          <th style="padding: 8px; border: 1px solid #ddd;">题目内容</th>
          <th style="padding: 8px; border: 1px solid #ddd;">正确答案</th>
          <th style="padding: 8px; border: 1px solid #ddd;">你的答案</th>
        </tr>
      </thead>
      <tbody>`;

    errorAnswers.forEach((err) => {
      htmlContent += `<tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 8px; border: 1px solid #ddd;">${err.id}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${err.content.replace(
          /<[^>]+>/g,
          ""
        )}</td>
        <td style="padding: 8px; border: 1px solid #ddd; color: #22c55e;">${
          Array.isArray(err.answer) ? err.answer.join(", ") : err.answer
        }</td>
        <td style="padding: 8px; border: 1px solid #ddd; color: #ef4444;">${
          Array.isArray(err.errorAnswer)
            ? err.errorAnswer.join(", ")
            : err.errorAnswer
        }</td>
      </tr>`;
    });

    htmlContent += `</tbody></table>`;
    showModal(htmlContent);
  } else {
    showModal("<h5>恭喜你，全部答对！</h5>");
  }
}

// 函数：创建并添加"汇总答案到控制台"按钮
function addSubmitAnswersButton() {
  // 检查按钮是否已存在，防止重复添加
  if (document.getElementById("customSubmitAnswersButton")) {
    return;
  }

  const submitButton = document.createElement("button");
  submitButton.id = "customSubmitAnswersButton";
  submitButton.textContent = "提交答案";
  // 按钮样式
  submitButton.style.position = "fixed";
  submitButton.style.top = "10px";
  submitButton.style.width = "240px";
  submitButton.style.left = "50%";
  submitButton.style.transform = "translateX(-50%)";
  submitButton.style.padding = "10px 15px";
  submitButton.style.backgroundColor = "#4f46e5"; // blue
  submitButton.style.color = "white";
  submitButton.style.border = "none";
  submitButton.style.borderRadius = "20px";
  submitButton.style.cursor = "pointer";
  submitButton.style.zIndex = "10000"; // 确保按钮在顶层显示
  submitButton.style.fontSize = "16px";

  submitButton.addEventListener("click", () => {
    const currentAnswers = new Map();
    const allPageInputs = document.querySelectorAll("input[name]");
    const currentPageType = window.location.pathname.split("/").pop();

    allPageInputs.forEach((input) => {
      const name = input.getAttribute("name");

      if (input.type === "radio") {
        if (input.checked) {
          currentAnswers.set(name, selectOption(input));
        }
      } else if (input.type === "checkbox") {
        if (input.checked) {
          currentAnswers.set(name, selectOption(input));
        } else {
          // For type "3" (MCMOTA), handleSubmitAnswers expects null for unchecked options.
          if (currentPageType === "3") {
            currentAnswers.set(name, null);
          }
        }
      } else {
        // Fill-in-the-blank, etc.
        currentAnswers.set(name, input.value);
      }
    });
    handleSubmitAnswers(currentAnswers);
  });

  document.body.appendChild(submitButton);
}

function selectOption(input) {
  // Case 1: 判断题 (例如: <input ...>F)
  // "T" 或 "F" 是 input 元素的下一个兄弟文本节点
  if (input.nextSibling && input.nextSibling.nodeType === Node.TEXT_NODE) {
    const textContent = input.nextSibling.textContent.trim();
    if (textContent === "T" || textContent === "F") {
      return textContent; // 返回 "T" 或 "F"
    }
  }

  // Case 2 & 3: 单选题或多选题 (例如: <input ...><div...><span>C.</span>...</div>)
  // 选项标识在 input 元素的下一个兄弟元素的第一个 span 标签内
  const nextElement = input.nextElementSibling;
  if (nextElement) {
    const span = nextElement.querySelector("span"); // 查找 div 内的第一个 span
    if (span) {
      const spanText = span.textContent.trim();
      // 期望格式为 "A.", "B.", "C.", "D." 等

      if (spanText.length > 0 && spanText.endsWith(".")) {
        return spanText.charAt(0); // 返回 "A", "B", "C", 或 "D"
      }
    }
  }

  // console.warn(`selectOption: 未能为输入框 (name: ${input.name}, id: ${input.id}) 确定特定标签。将返回其value。`);
  // 如果以上规则都不匹配（例如，填空题或其他未知结构），则返回输入框的原始 value
  return input.value;
}

// --- 模态框相关函数 ---
let modalElement = null; // 用于存储模态框元素
let modalBackdrop = null; // 用于存储模态框背景遮罩元素

function createModal() {
  if (document.getElementById("ptaReviewModal")) {
    modalElement = document.getElementById("ptaReviewModal");
    modalBackdrop = document.getElementById("ptaReviewModalBackdrop");
    return; // 如果模态框已存在，则不重复创建
  }

  // 创建背景遮罩
  modalBackdrop = document.createElement("div");
  modalBackdrop.id = "ptaReviewModalBackdrop";
  modalBackdrop.style.display = "none"; // 默认隐藏
  modalBackdrop.style.position = "fixed";
  modalBackdrop.style.zIndex = "10000"; // 比按钮高，但低于模态框
  modalBackdrop.style.left = "0";
  modalBackdrop.style.top = "0";
  modalBackdrop.style.width = "100%";
  modalBackdrop.style.height = "100%";
  modalBackdrop.style.backgroundColor = "rgba(0, 0, 0, 0.5)"; // 半透明黑色
  // 点击背景可以关闭模态框
  modalBackdrop.onclick = closeModal;

  document.body.appendChild(modalBackdrop);

  modalElement = document.createElement("div");
  modalElement.id = "ptaReviewModal";
  modalElement.style.display = "none"; // 默认隐藏
  modalElement.style.position = "fixed";
  modalElement.style.zIndex = "10001"; // 比提交按钮高一级
  modalElement.style.left = "50%";
  modalElement.style.top = "50%";
  modalElement.style.transform = "translate(-50%, -50%)";
  modalElement.style.width = "80%";
  modalElement.style.maxWidth = "600px";
  modalElement.style.maxHeight = "80vh";
  modalElement.style.overflowY = "auto";
  modalElement.style.backgroundColor = "white";
  modalElement.style.padding = "20px";
  modalElement.style.border = "1px solid #ccc";
  modalElement.style.borderRadius = "8px";
  modalElement.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.3)";

  const closeButton = document.createElement("button");
  closeButton.textContent = "×";
  closeButton.style.position = "absolute";
  closeButton.style.top = "10px";
  closeButton.style.right = "15px";
  closeButton.style.fontSize = "20px";
  closeButton.style.border = "none";
  closeButton.style.background = "none";
  closeButton.style.cursor = "pointer";
  closeButton.onclick = closeModal;

  const modalContent = document.createElement("div");
  modalContent.id = "ptaReviewModalContent";

  modalElement.appendChild(closeButton);
  modalElement.appendChild(modalContent);
  document.body.appendChild(modalElement);
}

function showModal(htmlContent) {
  if (!modalElement) {
    createModal();
  }
  const modalContentElement = document.getElementById("ptaReviewModalContent");
  if (modalContentElement) {
    modalContentElement.innerHTML = htmlContent;
  }
  if (modalBackdrop) {
    modalBackdrop.style.display = "block";
  }
  if (modalElement) {
    modalElement.style.display = "block";
  }
}

function closeModal() {
  if (modalElement) {
    modalElement.style.display = "none";
  }
  if (modalBackdrop) {
    modalBackdrop.style.display = "none";
  }
}
// --- 结束模态框相关函数 ---

function toggleTrainingMode(hide) {
  if (!hide) {
    return window.location.reload();
  }
  toggleResultsVisibility(true);

  const problemSetId = window.location.pathname.split("/")[2];

  if (
    !localStorage.getItem(problemSetId) &&
    window.location.href.startsWith(
      `https://pintia.cn/problem-sets/${problemSetId}`
    ) &&
    problemSetId.length == "1917150301420007424".length &&
    problemSetId
  ) {
    // 延迟请求，并检查localStorage中是否已有数据
    setTimeout(() => {
      // 再次检查是否已经有数据，避免在setTimeout期间其他地方已经获取了数据
      if (!localStorage.getItem(problemSetId)) {
        console.log("导出题集JSON", window.location.href);
        exportJson().catch((err) => {
          // 处理被锁定的情况，不需要做任何事
          if (err !== "已有请求在进行中") {
            console.error("导出题集失败:", err);
          }
        });
      }
    }, 2000);
  }

  const allInputs = document.querySelectorAll("input"); // 更名以反映其选择所有input

  allInputs.forEach(function (input) {
    if (input.disabled) {
      input.checked = false; // 显式取消选中状态
    }
    input.removeAttribute("disabled");
    input.removeAttribute("aria-label");
    input.style.cursor = "default";
    input.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    input.parentElement.style.cursor = "default";
  });
  if (allInputs.length > 0) {
    addSubmitAnswersButton();
  }
}

async function reRenderPage() {
  try {
    // 等待exportJson完成并获取jsonString
    const json = await exportJson().catch((err) => {
      // 如果是因为锁定导致的拒绝，则不视为错误
      if (err === "已有请求在进行中") {
        console.log("已有导出任务正在进行，不再重复导出");
        return null;
      }
      throw err; // 其他错误则继续抛出
    });

    if (json) {
      console.log("重新做题时的JSON:", json);
    }
  } catch (error) {
    console.error("渲染失败:", error);
  }
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

function simulateFullInteraction(targetRadioInput, value) {
  // 先点击元素
  targetRadioInput.click();

  // 修改值
  targetRadioInput.value = value;

  // 触发额外的事件
  // 1. 触发 input 事件
  const inputEvent = new Event("input", { bubbles: true });
  targetRadioInput.dispatchEvent(inputEvent);

  // 2. 触发 change 事件
  const changeEvent = new Event("change", { bubbles: true });
  targetRadioInput.dispatchEvent(changeEvent);
}

// 导入答题答案
function importAnswers() {
  // 获取目标元素
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".html";
  input.onchange = function (event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function (event) {
      const htmlContent = event.target.result;
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, "text/html");
      const element = doc.querySelector(
        'div[class*="flex"][class*="flex-col"][class*="h-[var(--height-exclude-header)]"][class*="overflow-auto"]'
      );
      const targetElement = document.querySelector(
        'div[class*="flex"][class*="flex-col"][class*="h-[var(--height-exclude-header)]"][class*="overflow-auto"]'
      );

      const Inputs = element.querySelectorAll("input");
      const targetInputs = targetElement.querySelectorAll("input");
      for (let i = 0; i < Inputs.length; i++) {
        if (Inputs[i].id === targetInputs[i].id) {
          if (
            Inputs[i].checked !== targetInputs[i].checked &&
            Inputs[i].type === "radio"
          ) {
            targetInputs[i].click();
          } else if (
            Inputs[i].checked !== targetInputs[i].checked &&
            Inputs[i].type === "checkbox"
          ) {
            targetInputs[i].click();
          } else if (Inputs[i].value !== targetInputs[i].value) {
            simulateFullInteraction(targetInputs[i], Inputs[i].value);
          }
        }
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// 控制正确答案的可见性
function toggleRightVisibility(hide) {
  const parentElements = document.querySelectorAll(
    'div[class*="pc-x"][class*="pt-2"][class*="pl-4"][class*="scroll-mt-[calc(var(--height-header)+4rem+0.5rem)]"]'
  );
  // 定义要查找的字符串
  const targetString = '<span style="color: rgb(255, 59, 48);">答案正确</span>';

  // 存储结果的数组
  const matchingElements = [];

  // 遍历每个父元素
  parentElements.forEach((element) => {
    // 检查是否有包含目标字符串的input子元素
    const input = element.querySelectorAll(
      'div[class*="flex"][class*="items-start"][class*="space-x-4"]'
    )[0];
    if (input.innerHTML && input.innerHTML.includes(targetString)) {
      matchingElements.push(element);
    }
  });
  matchingElements.forEach(function (input) {
    input.style.display = hide ? "none" : "block";
  });
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

// 添加锁定变量，防止重复请求
let isExportingJson = false;

function exportJson(type = 1) {
  // 如果已经在导出中，则直接返回
  if (isExportingJson) {
    console.log("已有请求在进行中，跳过重复请求");
    return Promise.reject("已有请求在进行中");
  }

  isExportingJson = true;
  const problemSetId = window.location.pathname.split("/")[2];
  const targetUserId = JSON.parse(localStorage.getItem("user-cache")).userId;

  return fetch(`https://pintia.cn/api/problem-sets/${problemSetId}/exams`, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("获取题目统计信息出错");
      }
      return response.json();
    })
    .then((data) => {
      localStorage.setItem("examId", data.exam.id);
      localStorage.setItem("problemSetId", data.problemSet.id);
      localStorage.setItem("targetUserId", targetUserId);
      localStorage.setItem("name", data.problemSet.name);
      return new Promise((resolve) => {
        setTimeout(() => {
          getProblemSummaries(type).then(resolve);
        }, 1000);
      });
    })
    .catch((error) => {
      console.error("获取数据出错:", error);
    })
    .finally(() => {
      // 无论成功失败，最后都解除锁定
      isExportingJson = false;
    });
}

const getProblemSummaries = (type) => {
  return new Promise((resolve, reject) => {
    const result = {
      name: localStorage.getItem("name"),
    };
    const problemSetId = localStorage.getItem("problemSetId");

    fetch(
      `https://pintia.cn/api/problem-sets/${problemSetId}/problem-summaries`,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(`获取题目摘要失败: ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        const types = Object.keys(data.summaries);
        types.forEach((key) => {
          result[key] = {
            type: key,
            problems: {}, // 初始化为空对象
          };
        });

        // 创建一个Promise数组来获取每种类型的数据
        const promises = types.map((type) => getProblemData(type, result));

        // 等待所有Promise完成
        return Promise.all(promises);
      })
      .then(() => {
        localStorage.setItem(problemSetId, JSON.stringify(result));
        localStorage.removeItem("examId");
        localStorage.removeItem("problemSetId");
        localStorage.removeItem("targetUserId");
        localStorage.removeItem("name");
        resolve(result); // 成功时解决promise
      })
      .then(() => {
        if (type === 1) {
          localStorage.setItem(problemSetId, JSON.stringify(result));
        }
        if (type === 2) {
          const blob = new Blob([JSON.stringify(result)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${problemSetId}.json`;
          a.click();
        }
      })
      .catch((error) => {
        console.error("处理题目数据时出错:", error);
        reject(error); // 出错时拒绝promise
      });
  });
};

// 处理每种题型的数据
function getProblemData(type, res) {
  return new Promise((resolve, reject) => {
    const problemSetId = localStorage.getItem("problemSetId");
    const examId = localStorage.getItem("examId");
    const targetUserId = localStorage.getItem("targetUserId");

    // 只处理类型 1, 2, 3
    if (Type[type] && Type[type] <= 3) {
      fetch(
        `https://pintia.cn/api/problem-sets/${problemSetId}/exam-problems?exam_id=${examId}&problem_type=${type}&target_user_id=${targetUserId}`,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error(
              `获取 ${type} 类型题目失败: ${response.statusText}`
            );
          }
          return response.json();
        })
        .then((data) => {
          res[type].problems = {}; // 初始化为对象
          data.problemSetProblems.forEach((problem) => {
            let options = null;
            if (Type[type] === 1) {
              options = ["TRUE", "FALSE"];
            } else if (Type[type] === 2) {
              options =
                problem.problemConfig.multipleChoiceProblemConfig.choices;
            } else if (Type[type] === 3) {
              options =
                problem.problemConfig
                  .multipleChoiceMoreThanOneAnswerProblemConfig.choices;
            }
            // 使用 problem.id 作为键
            res[type].problems[problem.id] = {
              id: problem.id,
              content: problem.content,
              description: problem.description,
              options: options,
              answers: [], // 初始化答案数组
            };
          });
          // 获取答案并返回 Promise
          return getProblemAnswers(type, res);
        })
        .then(resolve) // 当 getProblemAnswers 完成时，解决此 Promise
        .catch(reject); // 捕获此链中的任何错误
    } else {
      // 对于其他类型，直接解决 Promise
      console.log(`跳过类型 ${type} 的题目获取`);
      resolve();
    }
  });
}

// 获取题目答案
function getProblemAnswers(type, res) {
  return new Promise((resolve, reject) => {
    const problemSetId = localStorage.getItem("problemSetId");
    const examId = localStorage.getItem("examId");
    const targetUserId = localStorage.getItem("targetUserId");

    // 确保 res[type].problems 确实是一个对象
    if (
      !res[type] ||
      typeof res[type].problems !== "object" ||
      res[type].problems === null
    ) {
      console.warn(`类型 ${type} 的 problems 结构不正确，跳过获取答案。`);
      return resolve(); // 或者 reject，取决于你希望如何处理这种情况
    }

    fetch(
      `https://pintia.cn/api/exams/${examId}/problem-sets/${problemSetId}/last-submissions?problem_type=${type}&target_user_id=${targetUserId}`,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    )
      .then((response) => {
        if (!response.ok) {
          // 即使获取答案失败，也可能需要 resolve，以免阻塞 Promise.all
          console.warn(`获取 ${type} 类型答案失败: ${response.statusText}`);
          return null; // 返回 null 或空对象，表示没有获取到答案
        }
        return response.json();
      })
      .then((data) => {
        if (data && data.submission && data.submission.submissionDetails) {
          data.submission.submissionDetails.forEach((submission) => {
            const problemId = submission.problemSetProblemId;
            let answers = [];
            if (Type[type] === 1) {
              console.log(submission.trueOrFalseSubmissionDetail);
              answers = submission.trueOrFalseSubmissionDetail?.answer || [];
            } else if (Type[type] === 2) {
              answers = submission.multipleChoiceSubmissionDetail?.answer || [];
            } else if (Type[type] === 3) {
              answers =
                submission.multipleChoiceMoreThanOneAnswerSubmissionDetail
                  ?.answers || [];
            }

            // 检查 res[type].problems 中是否存在对应的 problemId
            if (res[type].problems[problemId]) {
              res[type].problems[problemId].answers = answers;
            } else {
              console.warn(
                `在 res 中未找到题目 ID: ${problemId} (类型: ${type})，无法添加答案。`
              );
            }
          });
          resolve(); // 成功获取并处理完答案
        } else return getStandardAnswers(type, res);
      })
      .then(resolve)
      .catch((error) => {
        console.error(`获取 ${type} 类型答案时出错:`, error);
        // 即使出错，也 resolve，避免阻塞 Promise.all
        // 或者可以根据需要 reject
        resolve();
      });
  });
}

const getStandardAnswers = (type, res) => {
  return new Promise((resolve, reject) => {
    const problemSetId = localStorage.getItem("problemSetId");
    const targetUserId = localStorage.getItem("targetUserId");
    fetch(
      `https://pintia.cn/api/problem-sets/${problemSetId}/standard-answers?problem_type=${type}&target_user_id=${targetUserId}`,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(`获取标准答案失败: ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        const keys = Object.keys(data.submissionDetailByProblemSetProblemId);
        keys.forEach((problemId) => {
          const submission =
            data.submissionDetailByProblemSetProblemId[problemId];
          let answers = [];
          if (Type[type] === 1) {
            answers = submission.trueOrFalseSubmissionDetail?.answer || [];
          } else if (Type[type] === 2) {
            answers = submission.multipleChoiceSubmissionDetail?.answer || [];
          } else if (Type[type] === 3) {
            answers =
              submission.multipleChoiceMoreThanOneAnswerSubmissionDetail
                ?.answers || [];
          }

          // // 检查 res[type].problems 中是否存在对应的 problemId
          if (res[type].problems[problemId]) {
            res[type].problems[problemId].answers = answers;
          } else {
            console.warn(
              `在 res 中未找到题目 ID: ${problemId} (类型: ${type})，无法添加答案。`
            );
          }
        });
        resolve();
      })
      .catch((error) => {
        console.error(`获取标准答案时出错:`, error);
        resolve();
      });
  });
};

// 监听DOM变化，处理动态加载的元素
const observer = new MutationObserver(function (mutations) {
  chrome.storage.sync.get(
    ["hideRadio", "hideCheckbox", "hideResults", "hideInputs", "trainingMode"],
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
      if (result.trainingMode) {
        toggleTrainingMode(true);
      }
    }
  );
});

function createAnswerEditModal() {
  const problemSetId = window.location.pathname.split("/")[2];
  const answers = JSON.parse(localStorage.getItem(problemSetId));

  if (!answers) {
    showModal("<h5>未找到答案数据</h5>");
    return;
  }

  const modalContent = `
      <div class="answer-edit-container" style="
          display: flex;
          height: 80vh;
          width: 100%;
          gap: 20px;
      ">
          <!-- 左侧题目列表 -->
          <div class="question-list-container" style="
              flex: 1;
              overflow-y: auto;
              padding: 10px;
              border-right: 1px solid #eee;
          ">
              <h4 style="margin-bottom: 16px;">题目列表</h4>
              ${generateQuestionListHtml(answers)}
          </div>

          <!-- 右侧答案修正区 -->
          <div class="answer-edit-area" style="
              flex: 1;
              overflow-y: auto;
              padding: 10px;
          ">
              <div id="answer-edit-content">
                  <h4>请选择左侧题目进行修改</h4>
              </div>
          </div>
      </div>
  `;

  showModal(modalContent);
  addQuestionListEventListeners();
}

function generateQuestionListHtml(answers) {
  let html = "";
  const typeNames = {
    TRUE_OR_FALSE: "判断题",
    MULTIPLE_CHOICE: "单选题",
    MULTIPLE_CHOICE_MORE_THAN_ONE_ANSWER: "多选题",
  };

  Object.entries(answers).forEach(([type, data]) => {
    if (
      type !== "name" &&
      data.problems &&
      Object.keys(data.problems).length > 0
    ) {
      html += `
              <div class="question-type-section">
                  <h5 style="margin: 10px 0;">${typeNames[type] || type}</h5>
                  <div class="questions">
          `;

      Object.entries(data.problems).forEach(([problemId, problem], index) => {
        const content =
          problem.content.replace(/<[^>]+>/g, "").substring(0, 50) + "...";
        html += `
                  <div class="question-item" 
                       data-type="${type}" 
                       data-problem-id="${problemId}"
                       style="
                          padding: 8px;
                          margin: 4px 0;
                          cursor: pointer;
                          border: 1px solid #eee;
                          border-radius: 4px;
                          transition: background-color 0.2s;
                       ">
                      第${index + 1}题: ${content}
                  </div>
              `;
      });

      html += `
                  </div>
              </div>
          `;
    }
  });

  return html;
}

function addQuestionListEventListeners() {
  document.querySelectorAll(".question-item").forEach((item) => {
    item.addEventListener("click", function () {
      const type = this.dataset.type;
      const problemId = this.dataset.problemId;
      showAnswerEditForm(type, problemId);

      // 移除其他项目的选中状态
      document
        .querySelectorAll(".question-item")
        .forEach((q) => (q.style.backgroundColor = ""));
      // 设置当前项目的选中状态
      this.style.backgroundColor = "#f0f0f0";
    });

    // 添加悬停效果
    item.addEventListener("mouseover", function () {
      if (this.style.backgroundColor !== "rgb(240, 240, 240)") {
        this.style.backgroundColor = "#f8f8f8";
      }
    });

    item.addEventListener("mouseout", function () {
      if (this.style.backgroundColor !== "rgb(240, 240, 240)") {
        this.style.backgroundColor = "";
      }
    });
  });
}

function showAnswerEditForm(type, problemId) {
  const problemSetId = window.location.pathname.split("/")[2];
  const answers = JSON.parse(localStorage.getItem(problemSetId));
  const problem = answers[type].problems[problemId];

  const editContent = document.getElementById("answer-edit-content");
  let formHtml = `
      <h4>题目内容</h4>
      <div style="margin: 10px 0; padding: 10px; background: #f8f8f8; border-radius: 4px;">
          ${problem.content}
      </div>
      <h4>修改答案</h4>
      <form id="answer-edit-form" style="margin: 10px 0;">
          ${generateAnswerOptionsHtml(type, problem)}
          <button type="button" 
                  id="save-answer-btn"
                  style="
                      margin-top: 20px;
                      padding: 8px 16px;
                      background: #4f46e5;
                      color: white;
                      border: none;
                      border-radius: 4px;
                      cursor: pointer;
                  ">
              保存修改
          </button>
      </form>
  `;

  editContent.innerHTML = formHtml;

  // 添加保存按钮的事件监听器
  document.getElementById("save-answer-btn").addEventListener("click", () => {
    saveEditedAnswer(type, problemId);
    window.location.reload();
  });
}

function generateAnswerOptionsHtml(type, problem) {
  let html = "";
  const currentAnswer = Array.isArray(problem.answers)
    ? problem.answers
    : [problem.answers];

  switch (type) {
    case "TRUE_OR_FALSE":
      html = `
              <div style="display: flex; gap: 20px;">
                  <label style="display: flex; align-items: center; gap: 8px;">
                      <input type="radio" name="answer" value="T" ${
                        currentAnswer[0].startsWith("T") ? "checked" : ""
                      }>
                      <span>正确</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 8px;">
                      <input type="radio" name="answer" value="F" ${
                        currentAnswer[0].startsWith("F") ? "checked" : ""
                      }>
                      <span>错误</span>
                  </label>
              </div>
          `;
      break;

    case "MULTIPLE_CHOICE":
      html = problem.options
        .map(
          (option, index) => `
              <div style="margin: 8px 0;">
                  <label style="display: flex; align-items: center; gap: 8px;">
                      <input type="radio" 
                             name="answer" 
                             value="${String.fromCharCode(65 + index)}"
                             ${
                               currentAnswer.includes(
                                 String.fromCharCode(65 + index)
                               )
                                 ? "checked"
                                 : ""
                             }>
                      <span>${option}</span>
                  </label>
              </div>
          `
        )
        .join("");
      break;

    case "MULTIPLE_CHOICE_MORE_THAN_ONE_ANSWER":
      html = problem.options
        .map(
          (option, index) => `
              <div style="margin: 8px 0;">
                  <label style="display: flex; align-items: center; gap: 8px;">
                      <input type="checkbox" 
                             name="answer" 
                             value="${String.fromCharCode(65 + index)}"
                             ${
                               currentAnswer.includes(
                                 String.fromCharCode(65 + index)
                               )
                                 ? "checked"
                                 : ""
                             }>
                      <span>${option}</span>
                  </label>
              </div>
          `
        )
        .join("");
      break;
  }

  return html;
}

function saveEditedAnswer(type, problemId) {
  const problemSetId = window.location.pathname.split("/")[2];
  const answers = JSON.parse(localStorage.getItem(problemSetId));

  let newAnswer;
  if (type === "MULTIPLE_CHOICE_MORE_THAN_ONE_ANSWER") {
    newAnswer = Array.from(
      document.querySelectorAll('input[name="answer"]:checked')
    )
      .map((input) => input.value)
      .sort();
  } else {
    newAnswer = document.querySelector('input[name="answer"]:checked')?.value;
  }

  if (!newAnswer || (Array.isArray(newAnswer) && newAnswer.length === 0)) {
    showToast("请选择答案");
    return;
  }

  answers[type].problems[problemId].answers = newAnswer;
  localStorage.setItem(problemSetId, JSON.stringify(answers));
  showToast("答案已保存");
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      z-index: 10002;
  `;

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1000);
}

// 配置观察器
observer.observe(document.body, {
  childList: true,
  subtree: true,
});
