// ELF - Browser Automation Agent - Background Service Worker
// Handles AI API communication for multiple providers

let agentState = {
  isRunning: false,
  currentTask: '',
  messages: [],
  iterations: 0,
  actions: 0,
  tokens: 0,
  maxIterations: 50,
  viewport: { width: 1280, height: 768 }
};

// Configuration loaded from storage
let config = {
  provider: 'anthropic',
  apiKey: '',
  baseUrl: '',
  model: 'claude-sonnet-4-20250514',
  accessKeyId: '',
  secretAccessKey: '',
  region: 'us-east-1',
  secretKey: '',
  headers: {}
};

// System prompt for browsing (works across providers)
const BROWSER_SYSTEM_PROMPT = `You are a browser automation agent. You can see the screen via screenshots and interact with web pages.

Current date: ${new Date().toISOString().split('T')[0]}

Your capabilities:
- View the page through screenshots
- Click at specific coordinates
- Type text into fields
- Press keys (Enter, Tab, Escape, etc.)
- Scroll up/down/left/right
- Drag elements

Coordinate system:
- Origin (0, 0) is top-left corner
- X increases to the right
- Y increases downward
- Viewport size: ${agentState.viewport.width}x${agentState.viewport.height}

Guidelines:
1. ALWAYS take a screenshot first to understand the current state
2. After interacting with forms, take a screenshot to see results
3. Be precise with coordinates - click on the exact element you want
4. Use keyboard shortcuts when appropriate (Tab to navigate, Enter to submit)
5. If you see a black screen or blank page, wait and retry
6. When the task is complete, say "TASK_COMPLETE" in your response

Available actions:
- screenshot: Take a screenshot of the current viewport
- click: Click at coordinates [x, y] 
- type: Type text character by character
- key: Press a key (Enter, Tab, Escape, Backspace, ArrowUp, ArrowDown, etc.)
- scroll: Scroll in a direction (up/down/left/right) by an amount
- drag: Drag from one position to another

Respond with the action you want to take. Always analyze the screenshot before acting.`;

// ============================================
// Message Handler
// ============================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true;
});

async function handleMessage(message, sender, sendResponse) {
  switch (message.action) {
    case 'startAgent':
      startAgentLoop(message.task);
      sendResponse({ success: true });
      break;

    case 'stopAgent':
      stopAgentLoop();
      sendResponse({ success: true });
      break;

    case 'updateConfig':
      config = { ...config, ...message.config };
      sendResponse({ success: true });
      break;

    case 'getPageInfo':
      sendResponse({ url: sender.tab?.url, title: sender.tab?.title });
      break;

    case 'captureTab':
      sendResponse({ error: 'captureTab is no longer used' });
      break;
  }
}

// ============================================
// Agent Loop
// ============================================

async function startAgentLoop(task) {
  const stored = await chrome.storage.sync.get([
    'provider', 'apiKey', 'baseUrl', 'model', 'maxIterations',
    'accessKeyId', 'secretAccessKey', 'region', 'secretKey', 'headers'
  ]);
  config = { ...config, ...stored };

  agentState = {
    isRunning: true,
    currentTask: task,
    messages: [],
    iterations: 0,
    actions: 0,
    tokens: 0,
    maxIterations: config.maxIterations || 50,
    viewport: { width: 1280, height: 768 }
  };

  broadcastUpdate({ status: 'running', log: `Starting task: ${task}` });

  const tab = await getActiveTab();
  if (!tab) {
    broadcastUpdate({ error: 'No active browser tab found', status: 'idle' });
    stopAgentLoop();
    return;
  }

  chrome.tabs.sendMessage(tab.id, { action: 'showIndicator' });
  await requestAndProcessScreenshot();
}

async function requestAndProcessScreenshot() {
  if (!agentState.isRunning) return;

  try {
    const screenshotBase64 = await captureCurrentTabScreenshot();
    await continueAgentLoop(screenshotBase64);
  } catch (error) {
    broadcastUpdate({ error: `Screenshot error: ${error.message}`, status: 'error' });
    stopAgentLoop();
  }
}

async function continueAgentLoop(screenshotBase64) {
  if (!agentState.isRunning) return;

  agentState.iterations++;
  broadcastUpdate({ iterations: agentState.iterations });

  if (agentState.iterations > agentState.maxIterations) {
    broadcastUpdate({ error: 'Maximum iterations reached', status: 'idle' });
    stopAgentLoop();
    return;
  }

  try {
    const handler = getProviderHandler(config.provider);
    const response = await handler.call(screenshotBase64);

    if (response.usage) {
      agentState.tokens += (response.usage.input_tokens || 0) + (response.usage.output_tokens || 0);
      broadcastUpdate({ tokens: agentState.tokens });
    }

    if (response.isComplete) {
      broadcastUpdate({
        complete: true,
        log: 'Task completed successfully!',
        status: 'idle'
      });
      stopAgentLoop();
      return;
    }

    if (response.actions && response.actions.length > 0) {
      for (const action of response.actions) {
        broadcastUpdate({ log: `Action: ${action.action || action.type}` });
        await executeComputerAction(action);
        agentState.actions++;
        broadcastUpdate({ actions: agentState.actions });
        await sleep(200);
      }
    }

    if (agentState.isRunning) {
      await sleep(300);
      await requestAndProcessScreenshot();
    }
  } catch (error) {
    broadcastUpdate({ error: `API Error: ${error.message}`, status: 'error' });
    stopAgentLoop();
  }
}

function stopAgentLoop() {
  agentState.isRunning = false;

  getActiveTab().then(tab => {
    if (tab) {
      chrome.tabs.sendMessage(tab.id, { action: 'hideIndicator' });
    }
  });

  broadcastUpdate({ status: 'idle' });
}
// ============================================
// Provider Handlers
// ============================================

function getProviderHandler(provider) {
  const handlers = {
    'anthropic': anthropicHandler,
    'openai': openAIHandler,
    'openai-compatible': openAIHandler,
    'deepseek': openAIHandler,
    'together': openAIHandler,
    'groq': openAIHandler,
    'cerebras': openAIHandler,
    'google': googleHandler,
    'bedrock': bedrockHandler,
    'qwen': openAIHandler,
    'kimi': openAIHandler,
    'zhipu': zhipuHandler,
    'baidu': baiduHandler,
    'mistral': openAIHandler,
    'xai': openAIHandler,
    'custom': openAIHandler
  };

  return handlers[provider] || openAIHandler;
}

// Anthropic Handler (Native Computer Use)
const anthropicHandler = {
  async call(screenshotBase64) {
    const url = 'https://api.anthropic.com/v1/messages';
    
    const messages = [
      ...agentState.messages,
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: screenshotBase64
            }
          },
          {
            type: 'text',
            text: agentState.iterations === 1 
              ? `${BROWSER_SYSTEM_PROMPT}\n\nTask: ${agentState.currentTask}`
              : 'Continue with the next action.'
          }
        ]
      }
    ];

    const body = {
      model: config.model || 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: BROWSER_SYSTEM_PROMPT,
      messages: messages,
      tools: [{
        type: 'computer_20250124',
        name: 'computer',
        display_width_px: agentState.viewport.width,
        display_height_px: agentState.viewport.height,
        display_number: 1
      }],
      betas: ['computer-use-2025-01-24']
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-01-01',
        'anthropic-beta': 'computer-use-2025-01-24'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Anthropic API error');
    }

    const data = await response.json();

    // Store assistant message
    agentState.messages.push({
      role: 'assistant',
      content: data.content
    });

    // Parse response
    const actions = [];
    let isComplete = false;

    for (const block of data.content) {
      if (block.type === 'tool_use' && block.name === 'computer') {
        actions.push(block.input);
      } else if (block.type === 'text') {
        if (block.text.includes('TASK_COMPLETE')) {
          isComplete = true;
        }
      }
    }

    // Add tool result to messages
    if (actions.length > 0) {
      agentState.messages.push({
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: data.content.find(b => b.type === 'tool_use')?.id,
          content: 'Action executed. Continue.'
        }]
      });
    }

    return { actions, isComplete, usage: data.usage };
  }
};

// OpenAI-Compatible Handler (Function Calling)
const openAIHandler = {
  async call(screenshotBase64) {
    const baseUrl = config.baseUrl || getDefaultBaseUrl(config.provider);
    const url = `${baseUrl}/chat/completions`;

    const messages = [
      {
        role: 'system',
        content: BROWSER_SYSTEM_PROMPT
      },
      ...agentState.messages,
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${screenshotBase64}`,
              detail: 'high'
            }
          },
          {
            type: 'text',
            text: agentState.iterations === 1 
              ? `Task: ${agentState.currentTask}`
              : 'Continue with the next action to complete the task.'
          }
        ]
      }
    ];

    const tools = [
      {
        type: 'function',
        function: {
          name: 'computer_action',
          description: 'Execute an action on the browser screen',
          parameters: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['screenshot', 'click', 'type', 'key', 'scroll', 'drag'],
                description: 'The action to perform'
              },
              coordinate: {
                type: 'array',
                items: { type: 'number' },
                description: 'X, Y coordinates for click/drag actions'
              },
              text: {
                type: 'string',
                description: 'Text to type or key to press'
              },
              scroll_direction: {
                type: 'string',
                enum: ['up', 'down', 'left', 'right'],
                description: 'Direction to scroll'
              },
              scroll_amount: {
                type: 'number',
                description: 'Amount to scroll (default: 1)'
              }
            },
            required: ['action']
          }
        }
      }
    ];

    const body = {
      model: config.model,
      messages: messages,
      tools: tools,
      tool_choice: 'auto',
      max_tokens: 4096
    };

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    };

    // Add custom headers if provided
    if (config.headers) {
      try {
        const customHeaders = typeof config.headers === 'string' 
          ? JSON.parse(config.headers) 
          : config.headers;
        Object.assign(headers, customHeaders);
      } catch (e) {}
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API error');
    }

    const data = await response.json();
    const message = data.choices[0].message;

    // Store message
    agentState.messages.push(message);

    // Parse actions
    const actions = [];
    let isComplete = false;

    if (message.tool_calls) {
      for (const call of message.tool_calls) {
        if (call.function.name === 'computer_action') {
          const args = JSON.parse(call.function.arguments);
          actions.push(args);
          
          // Add tool result
          agentState.messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: 'Action executed successfully.'
          });
        }
      }
    }

    if (message.content && message.content.includes('TASK_COMPLETE')) {
      isComplete = true;
    }

    return { 
      actions, 
      isComplete, 
      usage: {
        input_tokens: data.usage?.prompt_tokens,
        output_tokens: data.usage?.completion_tokens
      }
    };
  }
};

// Google Gemini Handler
const googleHandler = {
  async call(screenshotBase64) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;

    const contents = [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: screenshotBase64
            }
          },
          {
            text: agentState.iterations === 1 
              ? `${BROWSER_SYSTEM_PROMPT}\n\nTask: ${agentState.currentTask}`
              : 'Continue with the next action. Respond with a JSON action.'
          }
        ]
      }
    ];

    // Add history
    if (agentState.messages.length > 0) {
      // Convert message history to Gemini format
      for (const msg of agentState.messages) {
        if (msg.role === 'assistant' || msg.role === 'model') {
          contents.push({
            role: 'model',
            parts: [{ text: msg.content || JSON.stringify(msg.tool_calls) }]
          });
        }
      }
    }

    const body = {
      contents: contents,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            action: { type: 'string' },
            coordinate: { type: 'array', items: { type: 'number' } },
            text: { type: 'string' },
            scroll_direction: { type: 'string' },
            scroll_amount: { type: 'number' },
            is_complete: { type: 'boolean' }
          }
        }
      },
      systemInstruction: {
        parts: [{ text: BROWSER_SYSTEM_PROMPT }]
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Google AI error');
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    let action;
    try {
      action = JSON.parse(text);
    } catch (e) {
      action = { action: 'screenshot' };
    }

    agentState.messages.push({
      role: 'model',
      content: text
    });

    return {
      actions: action.action ? [action] : [],
      isComplete: action.is_complete || false,
      usage: {
        input_tokens: data.usageMetadata?.promptTokenCount,
        output_tokens: data.usageMetadata?.candidatesTokenCount
      }
    };
  }
};

// AWS Bedrock Handler
const bedrockHandler = {
  async call(screenshotBase64) {
    const region = config.region || 'us-east-1';
    const modelId = config.model || 'anthropic.claude-3-sonnet-20240229-v1:0';
    const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${modelId}/invoke`;

    // Bedrock uses Anthropic format for Claude models
    const isAnthropic = modelId.includes('anthropic');
    
    let body, headers;
    
    if (isAnthropic) {
      body = JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 4096,
        system: BROWSER_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: screenshotBase64
                }
              },
              {
                type: 'text',
                text: agentState.iterations === 1 
                  ? `Task: ${agentState.currentTask}`
                  : 'Continue.'
              }
            ]
          }
        ]
      });

      headers = {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': 'bedrock-2023-05-31'
      };
    } else {
      // For non-Anthropic models, use converse API format
      body = JSON.stringify({
        messages: [
          {
            role: 'user',
            content: [
              {
                image: {
                  format: 'png',
                  source: { bytes: screenshotBase64 }
                }
              },
              {
                text: agentState.iterations === 1 
                  ? `${BROWSER_SYSTEM_PROMPT}\n\nTask: ${agentState.currentTask}`
                  : 'Continue.'
              }
            ]
          }
        ]
      });

      headers = {
        'Content-Type': 'application/json'
      };
    }

    // Note: In production, you'd use AWS Signature v4 signing
    // This is a simplified version that requires an API key from Bedrock
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Bedrock error');
    }

    const data = await response.json();
    
    // Parse based on model type
    const actions = [];
    let isComplete = false;

    if (data.content) {
      for (const block of data.content) {
        if (block.type === 'text') {
          if (block.text.includes('TASK_COMPLETE')) {
            isComplete = true;
          }
          // Try to parse as JSON action
          try {
            const parsed = JSON.parse(block.text);
            if (parsed.action) actions.push(parsed);
          } catch (e) {}
        }
      }
    }

    return { actions, isComplete, usage: data.usage };
  }
};

// Zhipu AI Handler
const zhipuHandler = {
  async call(screenshotBase64) {
    const url = `${config.baseUrl || 'https://open.bigmodel.cn/api/paas/v4'}/chat/completions`;

    const messages = [
      {
        role: 'system',
        content: BROWSER_SYSTEM_PROMPT
      },
      ...agentState.messages,
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${screenshotBase64}` }
          },
          {
            type: 'text',
            text: agentState.iterations === 1 
              ? `Task: ${agentState.currentTask}`
              : 'Continue.'
          }
        ]
      }
    ];

    const body = {
      model: config.model || 'glm-4v-flash',
      messages: messages,
      max_tokens: 4096
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Zhipu API error');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Try to parse as JSON action
    let actions = [];
    let isComplete = false;

    try {
      const parsed = JSON.parse(content);
      if (parsed.action) actions.push(parsed);
      if (parsed.is_complete) isComplete = true;
    } catch (e) {
      // If not JSON, check for completion
      if (content.includes('TASK_COMPLETE')) {
        isComplete = true;
      }
    }

    agentState.messages.push({
      role: 'assistant',
      content: content
    });

    return { 
      actions, 
      isComplete,
      usage: {
        input_tokens: data.usage?.prompt_tokens,
        output_tokens: data.usage?.completion_tokens
      }
    };
  }
};

// Baidu ERNIE Handler
const baiduHandler = {
  accessToken: null,
  tokenExpiry: null,

  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry > Date.now()) {
      return this.accessToken;
    }

    const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${config.apiKey}&client_secret=${config.secretKey}`;
    
    const response = await fetch(url, { method: 'POST' });
    const data = await response.json();
    
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000; // 5 min buffer
    
    return this.accessToken;
  },

  async call(screenshotBase64) {
    const accessToken = await this.getAccessToken();
    const url = `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${config.model || 'ernie-4.0-8k'}?access_token=${accessToken}`;

    const messages = [
      ...agentState.messages,
      {
        role: 'user',
        content: [
          {
            type: 'image',
            image: screenshotBase64
          },
          {
            type: 'text',
            text: agentState.iterations === 1 
              ? `${BROWSER_SYSTEM_PROMPT}\n\nTask: ${agentState.currentTask}`
              : 'Continue.'
          }
        ]
      }
    ];

    const body = {
      messages: messages,
      max_output_tokens: 4096
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_msg || 'Baidu API error');
    }

    const data = await response.json();
    const content = data.result || '';
    
    let actions = [];
    let isComplete = false;

    try {
      const parsed = JSON.parse(content);
      if (parsed.action) actions.push(parsed);
    } catch (e) {
      if (content.includes('TASK_COMPLETE')) {
        isComplete = true;
      }
    }

    agentState.messages.push({ role: 'assistant', content });

    return { 
      actions, 
      isComplete,
      usage: {
        input_tokens: data.usage?.prompt_tokens,
        output_tokens: data.usage?.completion_tokens
      }
    };
  }
};

// ============================================
// Helper Functions
// ============================================

function getDefaultBaseUrl(provider) {
  const urls = {
    'openai': 'https://api.openai.com/v1',
    'deepseek': 'https://api.deepseek.com/v1',
    'together': 'https://api.together.xyz/v1',
    'groq': 'https://api.groq.com/openai/v1',
    'cerebras': 'https://api.cerebras.ai/v1',
    'qwen': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    'kimi': 'https://api.moonshot.cn/v1',
    'mistral': 'https://api.mistral.ai/v1',
    'xai': 'https://api.x.ai/v1',
    'custom': ''
  };
  return urls[provider] || '';
}

async function captureCurrentTabScreenshot() {
  const tab = await getActiveTab();
  if (!tab) {
    throw new Error('No active tab');
  }

  const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
    format: 'png',
    quality: 90
  });

  if (!screenshot) {
    throw new Error('Failed to capture screenshot');
  }

  return screenshot.split(',')[1] || '';
}



chrome.runtime.onInstalled.addListener(async () => {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (error) {
    console.warn('Side panel behavior unavailable:', error);
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  try {
    if (tab?.id) {
      await chrome.sidePanel.open({ tabId: tab.id });
    }
  } catch (error) {
    console.warn('Failed to open side panel:', error);
  }
});

async function executeComputerAction(action) {
  const tab = await getActiveTab();
  if (!tab) return { error: 'No active tab' };

  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id, {
      action: 'executeAction',
      computerAction: action
    }, (response) => {
      resolve(response || { result: 'Action executed' });
    });
  });
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function broadcastUpdate(data) {
  chrome.runtime.sendMessage({ action: 'agentUpdate', data }).catch(() => {
    // Popup might be closed, ignore
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Initialize config on startup
chrome.storage.sync.get([
  'provider', 'apiKey', 'baseUrl', 'model', 'maxIterations'
]).then(stored => {
  config = { ...config, ...stored };
});
