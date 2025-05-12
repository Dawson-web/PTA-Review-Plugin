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
    case "right":
      toggleRightVisibility(message.hide);
      break;
    case "importAnswers":
      importAnswers();
      break;
    case "exportJson":
      exportJson();
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

const Type = {
  TRUE_OR_FALSE: 1,
  MULTIPLE_CHOICE: 2,
  MULTIPLE_CHOICE_MORE_THAN_ONE_ANSWER: 3,
  FILL_IN_THE_BLANK: 4,
};

function exportJson() {
  const problemSetId = window.location.pathname.split("/")[2];
  const targetUserId = JSON.parse(localStorage.getItem("user-cache")).userId;

  fetch(`https://pintia.cn/api/problem-sets/${problemSetId}/exams`, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("获取题目统计信息出错");
      }
      // 不要在这里调用response.json()并打印
      return response.json();
    })
    .then((data) => {
      // 在这里打印解析后的数据
      localStorage.setItem("examId", data.exam.id);
      localStorage.setItem("problemSetId", data.problemSet.id);
      localStorage.setItem("targetUserId", targetUserId);
      localStorage.setItem("name", data.problemSet.name);
      getProblemSummaries();
    })
    .catch((error) => {
      console.error("获取数据出错:", error);
      alert("获取数据失败：" + error.message);
    });
}

const getProblemSummaries = () => {
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
      // 所有数据获取并处理完毕后，生成并下载JSON
      const jsonString = JSON.stringify(result, null, 2);
      console.log("最终生成的 JSON:", jsonString);

      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${result.name}.json`;
      link.click();

      // 清理
      URL.revokeObjectURL(url);
      // 可以考虑清除localStorage中的临时项目
      // localStorage.removeItem("examId");
      // localStorage.removeItem("problemSetId");
      // localStorage.removeItem("targetUserId");
      // localStorage.removeItem("name");
    })
    .catch((error) => {
      console.error("处理题目数据时出错:", error);
      alert("导出 JSON 失败：" + error.message);
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
        }

        // 移除旧的 Map 转 Array 的逻辑
        // if (
        //   Object.keys(res)
        //     .filter((k) => k !== "name")
        //     .every((k) => res[k].problems instanceof Map)
        // ) {
        //   Object.keys(res).forEach((key) => {
        //     if (key !== "name" && res[key].problems instanceof Map) {
        //       res[key].problems = Array.from(res[key].problems.values());
        //     }
        //   });
        // }

        resolve(); // 成功获取并处理完答案
      })
      .catch((error) => {
        console.error(`获取 ${type} 类型答案时出错:`, error);
        // 即使出错，也 resolve，避免阻塞 Promise.all
        // 或者可以根据需要 reject
        resolve();
      });
  });
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
