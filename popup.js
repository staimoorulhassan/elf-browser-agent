// ELF - Browser Automation Agent - Popup Script
// Handles UI interactions and communicates with background script

// Provider configurations - defines what fields each provider needs
const PROVIDER_CONFIGS = {
  pollinations: {
    name: 'Pollinations AI',
    fields: ['apiKey'],
    defaultModel: 'openai',
    models: [
      { value: 'openai', label: 'OpenAI GPT-4o (Recommended)' },
      { value: 'claude', label: 'Claude' },
      { value: 'llama', label: 'Llama 3.3 70B' },
      { value: 'qwen', label: 'Qwen' },
      { value: 'gemini', label: 'Gemini' },
      { value: 'mistral', label: 'Mistral' },
      { value: 'grok', label: 'Grok' }
    ],
    supportsComputerUse: false,
    requiresMultimodal: true,
    baseUrl: 'https://text.pollinations.ai'
  },
  anthropic: {
    name: 'Anthropic (Claude)',
    fields: ['apiKey'],
    defaultModel: 'claude-sonnet-4-20250514',
    models: [
      { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (Recommended)' },
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
      { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
      { value: 'claude-opus-4-20250514', label: 'Claude Opus 4' }
    ],
    supportsComputerUse: true
  },
  openai: {
    name: 'OpenAI (GPT-4o)',
    fields: ['apiKey'],
    defaultModel: 'gpt-4o',
    models: [
      { value: 'gpt-4o', label: 'GPT-4o (Recommended)' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'o1', label: 'o1' },
      { value: 'o1-mini', label: 'o1-mini' }
    ],
    supportsComputerUse: false,
    requiresMultimodal: true
  },
  'openai-compatible': {
    name: 'OpenAI Compatible (Custom)',
    fields: ['apiKey', 'baseUrl'],
    defaultModel: '',
    models: [],
    supportsComputerUse: false,
    requiresMultimodal: true
  },
  deepseek: {
    name: 'DeepSeek',
    fields: ['apiKey'],
    defaultModel: 'deepseek-chat',
    models: [
      { value: 'deepseek-chat', label: 'DeepSeek Chat' },
      { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner' }
    ],
    supportsComputerUse: false,
    requiresMultimodal: true,
    baseUrl: 'https://api.deepseek.com/v1'
  },
  together: {
    name: 'Together AI',
    fields: ['apiKey'],
    defaultModel: 'meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo',
    models: [
      { value: 'meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo', label: 'Llama 3.2 90B Vision' },
      { value: 'Qwen/Qwen2-VL-72B-Instruct', label: 'Qwen2-VL 72B' },
      { value: 'microsoft/Phi-3-vision-128k-instruct', label: 'Phi-3 Vision' }
    ],
    supportsComputerUse: false,
    requiresMultimodal: true,
    baseUrl: 'https://api.together.xyz/v1'
  },
  groq: {
    name: 'Groq',
    fields: ['apiKey'],
    defaultModel: 'llama-3.2-90b-vision-preview',
    models: [
      { value: 'llama-3.2-90b-vision-preview', label: 'Llama 3.2 90B Vision' },
      { value: 'llama-3.2-11b-vision-preview', label: 'Llama 3.2 11B Vision' },
      { value: 'llava-v1.5-7b-4096-preview', label: 'LLaVA 1.5 7B' }
    ],
    supportsComputerUse: false,
    requiresMultimodal: true,
    baseUrl: 'https://api.groq.com/openai/v1'
  },
  cerebras: {
    name: 'Cerebras',
    fields: ['apiKey'],
    defaultModel: 'llama3.1-70b',
    models: [
      { value: 'llama3.1-70b', label: 'Llama 3.1 70B' },
      { value: 'llama3.1-8b', label: 'Llama 3.1 8B' }
    ],
    supportsComputerUse: false,
    baseUrl: 'https://api.cerebras.ai/v1'
  },
  google: {
    name: 'Google AI (Gemini)',
    fields: ['apiKey'],
    defaultModel: 'gemini-2.0-flash-exp',
    models: [
      { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Recommended)' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
      { value: 'gemini-2.0-pro-exp', label: 'Gemini 2.0 Pro' }
    ],
    supportsComputerUse: false,
    requiresMultimodal: true
  },
  bedrock: {
    name: 'AWS Bedrock',
    fields: ['accessKeyId', 'secretAccessKey', 'region'],
    defaultModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
    models: [
      { value: 'anthropic.claude-3-sonnet-20240229-v1:0', label: 'Claude 3 Sonnet' },
      { value: 'anthropic.claude-3-haiku-20240307-v1:0', label: 'Claude 3 Haiku' },
      { value: 'anthropic.claude-3-5-sonnet-20241022-v2:0', label: 'Claude 3.5 Sonnet' },
      { value: 'meta.llama3-2-90b-vision-instruct-v1:0', label: 'Llama 3.2 90B Vision' }
    ],
    supportsComputerUse: false
  },
  qwen: {
    name: 'Qwen (Alibaba)',
    fields: ['apiKey'],
    defaultModel: 'qwen-vl-max',
    models: [
      { value: 'qwen-vl-max', label: 'Qwen-VL-Max (Recommended)' },
      { value: 'qwen-vl-plus', label: 'Qwen-VL-Plus' },
      { value: 'qwen-max', label: 'Qwen-Max' },
      { value: 'qwen-plus', label: 'Qwen-Plus' }
    ],
    supportsComputerUse: false,
    requiresMultimodal: true,
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  },
  kimi: {
    name: 'Kimi (Moonshot)',
    fields: ['apiKey'],
    defaultModel: 'moonshot-v1-8k-vision-preview',
    models: [
      { value: 'moonshot-v1-8k-vision-preview', label: 'Kimi Vision 8K' },
      { value: 'moonshot-v1-32k-vision-preview', label: 'Kimi Vision 32K' },
      { value: 'moonshot-v1-128k-vision-preview', label: 'Kimi Vision 128K' }
    ],
    supportsComputerUse: false,
    requiresMultimodal: true,
    baseUrl: 'https://api.moonshot.cn/v1'
  },
  zhipu: {
    name: 'Zhipu AI (GLM)',
    fields: ['apiKey'],
    defaultModel: 'glm-4v-flash',
    models: [
      { value: 'glm-4v-flash', label: 'GLM-4V Flash (Free)' },
      { value: 'glm-4v-plus', label: 'GLM-4V Plus' },
      { value: 'glm-4v', label: 'GLM-4V' },
      { value: 'glm-4-plus', label: 'GLM-4 Plus' }
    ],
    supportsComputerUse: false,
    requiresMultimodal: true,
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4'
  },
  baidu: {
    name: 'Baidu (ERNIE)',
    fields: ['apiKey', 'secretKey'],
    defaultModel: 'ernie-4.0-8k',
    models: [
      { value: 'ernie-4.0-8k', label: 'ERNIE 4.0' },
      { value: 'ernie-4.0-turbo-8k', label: 'ERNIE 4.0 Turbo' },
      { value: 'ernie-speed-8k', label: 'ERNIE Speed' }
    ],
    supportsComputerUse: false
  },
  mistral: {
    name: 'Mistral AI',
    fields: ['apiKey'],
    defaultModel: 'pixtral-12b-2409',
    models: [
      { value: 'pixtral-12b-2409', label: 'Pixtral 12B (Recommended)' },
      { value: 'pixtral-large-2411', label: 'Pixtral Large' },
      { value: 'mistral-large-latest', label: 'Mistral Large' }
    ],
    supportsComputerUse: false,
    requiresMultimodal: true,
    baseUrl: 'https://api.mistral.ai/v1'
  },
  xai: {
    name: 'xAI (Grok)',
    fields: ['apiKey'],
    defaultModel: 'grok-beta',
    models: [
      { value: 'grok-beta', label: 'Grok Beta' },
      { value: 'grok-vision-beta', label: 'Grok Vision Beta' }
    ],
    supportsComputerUse: false,
    requiresMultimodal: true,
    baseUrl: 'https://api.x.ai/v1'
  },
  custom: {
    name: 'Custom Endpoint',
    fields: ['baseUrl', 'apiKey', 'headers'],
    defaultModel: '',
    models: [],
    supportsComputerUse: false
  }
};

let currentConfig = {
  provider: 'anthropic',
  apiKey: '',
  baseUrl: '',
  model: '',
  maxIterations: 50
};

document.addEventListener('DOMContentLoaded', async () => {
  // Load saved configuration
  await loadConfig();
  
  // Setup event listeners
  setupEventListeners();
  
  // Initialize provider fields
  updateProviderFields();
  
  // Get current status
  updateStatus();
});

// Event Listeners
function setupEventListeners() {
  // Provider selection change
  document.getElementById('provider').addEventListener('change', (e) => {
    currentConfig.provider = e.target.value;
    updateProviderFields();
    updateCurrentProviderName();
  });

  // Save config button
  document.getElementById('saveConfig').addEventListener('click', saveConfig);
  
  // Start button
  document.getElementById('startBtn').addEventListener('click', startAgent);
  
  // Stop button
  document.getElementById('stopBtn').addEventListener('click', stopAgent);
  
  // Toggle provider config
  document.getElementById('providerToggle').addEventListener('click', () => {
    const config = document.getElementById('providerConfig');
    config.classList.toggle('collapsed');
  });
  
  // Toggle log
  document.getElementById('logToggle').addEventListener('click', () => {
    const container = document.getElementById('logContainer');
    const chevron = document.querySelector('#logToggle .chevron');
    container.classList.toggle('collapsed');
    chevron.classList.toggle('collapsed');
  });
  
  // Listen for updates from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'agentUpdate') {
      handleAgentUpdate(message.data);
    }
  });
}

// Update provider-specific fields
function updateProviderFields() {
  const provider = currentConfig.provider;
  const config = PROVIDER_CONFIGS[provider];
  const fieldsContainer = document.getElementById('providerFields');
  
  let html = '';
  
  config.fields.forEach(field => {
    html += getFieldHtml(field, provider);
  });
  
  fieldsContainer.innerHTML = html;
  
  // Update model dropdown or input
  const modelInput = document.getElementById('model');
  if (config.models.length > 0) {
    // Create a datalist for suggestions
    let datalistHtml = `<datalist id="modelList">`;
    config.models.forEach(m => {
      datalistHtml += `<option value="${m.value}">${m.label}</option>`;
    });
    datalistHtml += `</datalist>`;
    
    modelInput.setAttribute('list', 'modelList');
    modelInput.placeholder = config.defaultModel;
    
    // Add datalist after the input
    modelInput.insertAdjacentHTML('afterend', datalistHtml);
  } else {
    modelInput.removeAttribute('list');
    modelInput.placeholder = 'Enter model name';
  }
  
  // Set default model
  if (!currentConfig.model && config.defaultModel) {
    modelInput.value = config.defaultModel;
    currentConfig.model = config.defaultModel;
  }
  
  // Add info about computer use support
  if (!config.supportsComputerUse && config.requiresMultimodal) {
    fieldsContainer.innerHTML += `
      <div class="info-box">
        <span>ℹ️</span>
        <span>This provider uses multimodal tool calling instead of native computer use. 
        Requires a vision-capable model.</span>
      </div>
    `;
  } else if (config.supportsComputerUse) {
    fieldsContainer.innerHTML += `
      <div class="info-box success">
        <span>✓</span>
        <span>Native computer use support with pixel-coordinate actions.</span>
      </div>
    `;
  }
}

// Get HTML for a specific field
function getFieldHtml(field, provider) {
  const fields = {
    apiKey: `
      <div class="form-group">
        <label for="apiKey">API Key</label>
        <input type="password" id="apiKey" class="input" 
               placeholder="Enter your API key" 
               value="${currentConfig.apiKey || ''}">
      </div>
    `,
    baseUrl: `
      <div class="form-group">
        <label for="baseUrl">Base URL</label>
        <input type="url" id="baseUrl" class="input" 
               placeholder="https://api.example.com/v1" 
               value="${currentConfig.baseUrl || PROVIDER_CONFIGS[provider].baseUrl || ''}">
      </div>
    `,
    accessKeyId: `
      <div class="form-group">
        <label for="accessKeyId">Access Key ID</label>
        <input type="text" id="accessKeyId" class="input" 
               placeholder="AKIAIOSFODNN7EXAMPLE" 
               value="${currentConfig.accessKeyId || ''}">
      </div>
    `,
    secretAccessKey: `
      <div class="form-group">
        <label for="secretAccessKey">Secret Access Key</label>
        <input type="password" id="secretAccessKey" class="input" 
               placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" 
               value="${currentConfig.secretAccessKey || ''}">
      </div>
    `,
    region: `
      <div class="form-group">
        <label for="region">AWS Region</label>
        <select id="region" class="input">
          <option value="us-east-1" ${currentConfig.region === 'us-east-1' ? 'selected' : ''}>US East (N. Virginia)</option>
          <option value="us-west-2" ${currentConfig.region === 'us-west-2' ? 'selected' : ''}>US West (Oregon)</option>
          <option value="eu-west-1" ${currentConfig.region === 'eu-west-1' ? 'selected' : ''}>EU (Ireland)</option>
          <option value="ap-northeast-1" ${currentConfig.region === 'ap-northeast-1' ? 'selected' : ''}>Asia Pacific (Tokyo)</option>
          <option value="ap-southeast-1" ${currentConfig.region === 'ap-southeast-1' ? 'selected' : ''}>Asia Pacific (Singapore)</option>
        </select>
      </div>
    `,
    secretKey: `
      <div class="form-group">
        <label for="secretKey">Secret Key</label>
        <input type="password" id="secretKey" class="input" 
               placeholder="Baidu Secret Key" 
               value="${currentConfig.secretKey || ''}">
      </div>
    `,
    headers: `
      <div class="form-group">
        <label for="headers">Custom Headers (JSON)</label>
        <textarea id="headers" class="input textarea" rows="2" 
                  placeholder='{"X-Custom-Header": "value"}'>${currentConfig.headers || ''}</textarea>
      </div>
    `
  };
  
  return fields[field] || '';
}

// Update current provider name display
function updateCurrentProviderName() {
  const provider = currentConfig.provider;
  const name = PROVIDER_CONFIGS[provider]?.name || provider;
  document.getElementById('currentProvider').textContent = name;
}

// Load configuration from storage
async function loadConfig() {
  const result = await chrome.storage.sync.get([
    'provider', 'apiKey', 'baseUrl', 'model', 'maxIterations',
    'accessKeyId', 'secretAccessKey', 'region', 'secretKey', 'headers'
  ]);
  
  currentConfig = { ...currentConfig, ...result };
  
  // Update UI
  if (result.provider) {
    document.getElementById('provider').value = result.provider;
  }
  if (result.model) {
    document.getElementById('model').value = result.model;
  }
  if (result.maxIterations) {
    document.getElementById('maxIterations').value = result.maxIterations;
  }
  if (result.apiKey) {
    const apiKeyInput = document.getElementById('apiKey');
    if (apiKeyInput) apiKeyInput.value = result.apiKey;
  }
  if (result.baseUrl) {
    const baseUrlInput = document.getElementById('baseUrl');
    if (baseUrlInput) baseUrlInput.value = result.baseUrl;
  }
  
  updateCurrentProviderName();
}

// Save configuration to storage
async function saveConfig() {
  const provider = document.getElementById('provider').value;
  const config = PROVIDER_CONFIGS[provider];
  
  // Gather all field values
  const configToSave = {
    provider: provider,
    model: document.getElementById('model').value || config.defaultModel,
    maxIterations: parseInt(document.getElementById('maxIterations').value) || 50
  };
  
  // Add provider-specific fields
  config.fields.forEach(field => {
    const element = document.getElementById(field);
    if (element) {
      configToSave[field] = element.value;
    }
  });
  
  // Add base URL if provider has a default
  if (config.baseUrl && !configToSave.baseUrl) {
    configToSave.baseUrl = config.baseUrl;
  }
  
  await chrome.storage.sync.set(configToSave);
  currentConfig = configToSave;
  
  // Show save confirmation
  const btn = document.getElementById('saveConfig');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span>✓ Saved!</span>';
  btn.classList.add('success');
  
  setTimeout(() => {
    btn.innerHTML = originalText;
    btn.classList.remove('success');
  }, 2000);
  
  // Update background with new config
  chrome.runtime.sendMessage({ action: 'updateConfig', config: configToSave });
}

// Start the agent
async function startAgent() {
  const task = document.getElementById('taskInput').value.trim();
  if (!task) {
    alert('Please enter a task description');
    return;
  }
  
  // Check if API key is configured
  const provider = currentConfig.provider;
  const config = PROVIDER_CONFIGS[provider];
  
  let hasCredentials = false;
  if (config.fields.includes('apiKey') && currentConfig.apiKey) {
    hasCredentials = true;
  } else if (provider === 'bedrock' && currentConfig.accessKeyId && currentConfig.secretAccessKey) {
    hasCredentials = true;
  } else if (provider === 'baidu' && currentConfig.apiKey && currentConfig.secretKey) {
    hasCredentials = true;
  }
  
  if (!hasCredentials) {
    alert('Please configure your API credentials first');
    return;
  }
  
  // Disable start button, enable stop button
  document.getElementById('startBtn').disabled = true;
  document.getElementById('stopBtn').disabled = false;
  
  // Clear log
  document.getElementById('agentLog').innerHTML = '';
  
  // Send start message to background
  chrome.runtime.sendMessage({
    action: 'startAgent',
    task: task
  });
  
  updateStatus('running');
}

// Stop the agent
function stopAgent() {
  chrome.runtime.sendMessage({ action: 'stopAgent' });
  
  document.getElementById('startBtn').disabled = false;
  document.getElementById('stopBtn').disabled = true;
  
  updateStatus('idle');
}

// Update status display
function updateStatus(status = 'idle') {
  const badge = document.getElementById('statusBadge');
  const dot = badge.querySelector('.status-dot');
  const text = badge.querySelector('.status-text');
  
  badge.className = 'status-badge';
  
  if (status === 'running') {
    badge.classList.add('running');
    text.textContent = 'Running';
  } else if (status === 'error') {
    badge.classList.add('error');
    text.textContent = 'Error';
  } else {
    text.textContent = 'Idle';
  }
}

// Handle updates from background script
function handleAgentUpdate(data) {
  if (data.iterations !== undefined) {
    document.getElementById('iterationCount').textContent = data.iterations;
  }
  
  if (data.actions !== undefined) {
    document.getElementById('actionCount').textContent = data.actions;
  }
  
  if (data.tokens !== undefined) {
    document.getElementById('tokenCount').textContent = formatNumber(data.tokens);
  }
  
  if (data.log) {
    addLogEntry(data.log, data.type || 'info');
  }
  
  if (data.status) {
    updateStatus(data.status);
  }
  
  if (data.error) {
    addLogEntry(data.error, 'error');
    updateStatus('error');
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
  }
  
  if (data.complete) {
    addLogEntry('Task completed!', 'success');
    updateStatus('idle');
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
  }
}

// Add entry to the agent log
function addLogEntry(message, type = 'info') {
  const log = document.getElementById('agentLog');
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  
  const timestamp = new Date().toLocaleTimeString();
  entry.innerHTML = `
    <span class="log-time">${timestamp}</span>
    <span class="log-message">${escapeHtml(message)}</span>
  `;
  
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}
