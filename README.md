# ELF - Browser Automation Agent

**E**lectronic **L**ogic **F**ramework - A Chrome extension that brings AI-powered browser automation with support for **20+ AI providers** and features inspired by the best agent frameworks.

## Features

### Core Automation (Playwright/Puppeteer Style)
| Feature | Description |
|---------|-------------|
| **Session Management** | Save, resume, and manage browser sessions |
| **CDP Integration** | Direct Chrome DevTools Protocol connection |
| **Cloud Browser** | Connect to remote/browserbase sessions |
| **Action Recording** | Record and replay action sequences |
| **Mobile Viewports** | Emulate mobile devices and touch interactions |

### AI Computer Use (Claude/OpenAI/Gemini Style)
| Feature | Description |
|---------|-------------|
| **Pixel-Coordinate Actions** | Native computer use with Claude |
| **Vision-Based Control** | Screenshot understanding + action execution |
| **Multi-Model Support** | 20+ providers with unified interface |
| **Autonomous Loops** | Self-driving task completion |

### Stagehand-Style Primitives
| Primitive | Description |
|-----------|-------------|
| **act()** | Natural language actions ("click the login button") |
| **extract()** | Structured data extraction with Zod schemas |
| **observe()** | Discover available actions on page |
| **agent()** | Autonomous multi-step workflows |
| **Self-Healing** | Auto-recover when page changes |
| **Action Caching** | Replay actions without LLM calls |
| **Action Preview** | Preview before execution |

### AgentKit-Style Networks
| Feature | Description |
|---------|-------------|
| **Multi-Agent Networks** | Multiple specialized agents working together |
| **Shared State** | Persist data across agent steps |
| **Router Orchestration** | Code-based or LLM-based routing |
| **Parallel Execution** | Run multiple agents simultaneously |
| **Agent Handoffs** | Transfer control between agents |

### Vercel AI SDK Style
| Feature | Description |
|---------|-------------|
| **Typed Tools** | Zod-validated tool inputs/outputs |
| **Structured Output** | Schema-enforced responses |
| **Stop Conditions** | stepCountIs, hasToolCall, custom conditions |
| **Tool Choice Policy** | auto, required, none, or specific tool |
| **Lifecycle Hooks** | onStepFinish, onFinish callbacks |
| **Call Options** | Dynamic runtime configuration |

### Mastra-Style Features
| Feature | Description |
|---------|-------------|
| **Model Router** | 600+ models via simple strings |
| **Supervisor Agents** | Delegate to specialized sub-agents |
| **Memory/Context** | Persist conversation across sessions |
| **Human-in-the-Loop** | Approval flows and guardrails |
| **Observability** | Tracing, logs, cost tracking |
| **Studio Playground** | Visual debugging interface |

### OpenAI Agents SDK Style
| Feature | Description |
|---------|-------------|
| **Hosted Tools** | Web search, code interpreter built-in |
| **MCP Integration** | Model Context Protocol servers |
| **Output Types** | Zod schemas for final answers |
| **Handoffs** | Agent-to-agent delegation |

### Claude Agent SDK Style
| Feature | Description |
|---------|-------------|
| **First-Party Loop** | Built-in agent execution loop |
| **Built-in Tools** | Read, Edit, Bash, Glob, Grep, WebSearch |
| **Permission Modes** | Control agent capabilities |
| **Context Management** | Automatic context compaction |

### Deep Research Style
| Feature | Description |
|---------|-------------|
| **Lead Orchestrator** | Main agent dispatches sub-agents |
| **Parallel Researchers** | Multiple concurrent browsing sessions |
| **Result Aggregation** | Combine findings from sub-agents |

---

## Supported AI Providers

### Native Computer Use (Pixel-Coordinate Actions)
| Provider | Models | Notes |
|----------|--------|-------|
| **Anthropic** | Claude Sonnet 4, Claude 3.5 Sonnet/Haiku, Claude Opus 4 | Best support - native computer use API |

### OpenAI Compatible (Function Calling)
| Provider | Models | Notes |
|----------|--------|-------|
| **OpenAI** | GPT-4o, GPT-4 Turbo, o1, o3 | Requires vision model |
| **DeepSeek** | DeepSeek Chat, DeepSeek Reasoner | Chinese provider |
| **Together AI** | Llama 3.2 Vision, Qwen2-VL | Multiple open models |
| **Groq** | Llama 3.2 Vision, LLaVA | Ultra-fast inference |
| **Cerebras** | Llama 3.1 | Fast inference |
| **OpenRouter** | 200+ models | Unified API |
| **Custom** | Any OpenAI-compatible | Full endpoint config |

### Google
| Provider | Models | Notes |
|----------|--------|-------|
| **Google AI** | Gemini 2.0 Flash, Gemini 1.5 Pro/Flash | Native multimodal |

### Amazon
| Provider | Models | Notes |
|----------|--------|-------|
| **AWS Bedrock** | Claude 3.x, Llama 3.2 Vision | Requires AWS credentials |

### Chinese Providers
| Provider | Models | Notes |
|----------|--------|-------|
| **Qwen (Alibaba)** | Qwen-VL-Max, Qwen-VL-Plus | Vision models recommended |
| **Kimi (Moonshot)** | Kimi Vision 8K/32K/128K | Long context vision |
| **Zhipu AI** | GLM-4V Flash/Plus | Flash is free tier |
| **Baidu** | ERNIE 4.0, ERNIE Speed | Requires API + Secret key |

### Other
| Provider | Models | Notes |
|----------|--------|-------|
| **Mistral AI** | Pixtral 12B/Large | Vision models |
| **xAI** | Grok Beta, Grok Vision | Elon Musk's AI |
| **Custom Endpoint** | Any | Full custom configuration |

---

## Installation

### 1. Load Extension
1. Chrome → `chrome://extensions/`
2. Enable **Developer mode**
3. **Load unpacked** → select extension folder

### 2. Configure Provider
1. Click ELF icon
2. Select your AI provider
3. Enter API credentials
4. Choose model
5. Save configuration

---

## Usage

### Basic Task Execution
```
Task: "Go to Amazon and search for wireless headphones under $50"
```

### Natural Language Actions (Stagehand Style)
```javascript
// In the task input:
"act: click the login button"
"act: fill the search box with 'AI news'"
"act: scroll down 2 pages"
```

### Structured Extraction (Zod Schema)
```javascript
// Define extraction schema in task:
"""
extract: {
  products: [{
    name: string,
    price: number,
    rating: number,
    reviews: number
  }]
}
"""
```

### Multi-Agent Network
```javascript
// Configure in Settings > Agents:
{
  "network": {
    "agents": ["navigator", "extractor", "summarizer"],
    "router": "auto",  // or "code", "llm"
    "maxIterations": 50,
    "parallel": true
  }
}
```

### Stop Conditions
```javascript
// In task or settings:
{
  "stopWhen": [
    "stepCountIs(20)",
    "hasToolCall('task_complete')",
    "tokenBudget(10000)"
  ]
}
```

### Human-in-the-Loop
```javascript
// Enable approvals in settings:
{
  "approvals": {
    "navigation": true,     // Ask before URL changes
    "forms": true,          // Ask before form submissions
    "downloads": true,      // Ask before downloads
    "sensitiveData": true   // Ask before accessing passwords/cards
  }
}
```

---

## Configuration Reference

### Action Types
| Action | Parameters | Example |
|--------|------------|---------|
| `click` | `coordinate: [x, y]` | Click at pixel position |
| `type` | `text: string, humanLike: boolean` | Type text |
| `key` | `key: string` | Press Enter, Tab, Escape |
| `scroll` | `direction, amount` | Scroll up/down/left/right |
| `drag` | `from: [x,y], to: [x,y]` | Drag element |
| `screenshot` | - | Capture viewport |
| `wait` | `duration: ms` | Wait for specified time |
| `hover` | `coordinate: [x, y]` | Hover at position |
| `select` | `coordinate, option` | Select dropdown option |

### Extraction Schema (Zod)
```typescript
// Supported types:
z.string()
z.number()
z.boolean()
z.array(z.string())
z.object({ name: z.string(), price: z.number() })
z.enum(["option1", "option2"])
```

### Agent Configuration
```javascript
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "maxIterations": 50,
  "viewport": { "width": 1280, "height": 768 },
  "stopConditions": ["stepCountIs(50)"],
  "toolChoice": "auto",
  "temperature": 0.7,
  "approvals": {},
  "memory": { "enabled": true, "maxTokens": 100000 },
  "selfHealing": true,
  "actionCache": true
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           ELF Extension                              │
├─────────────────┬───────────────────┬───────────────────────────────┤
│   Popup (UI)    │  Background (API) │     Content Script (DOM)      │
├─────────────────┼───────────────────┼───────────────────────────────┤
│ • Provider cfg  │ • 20+ API handlers │ • Action execution            │
│ • Task input    │ • Agent loop       │ • Self-healing selectors      │
│ • Live logs     │ • Multi-agent      │ • Action caching              │
│ • Extraction    │ • Stop conditions  │ • DOM snapshots               │
│ • Approvals     │ • State management │ • Screenshot capture          │
│ • Memory view   │ • MCP integration  │ • Element discovery           │
└─────────────────┴───────────────────┴───────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  Anthropic    │   │  OpenAI-compat  │   │  Google/Other   │
│  Computer Use │   │  Function Call  │   │  Multimodal     │
└───────────────┘   └─────────────────┘   └─────────────────┘
```

---

## File Structure

```
browser-agent-extension/
├── manifest.json        # Extension config (Manifest V3)
├── background.js        # Service worker - Multi-provider API, agents, MCP
├── content.js           # DOM interaction - Actions, extraction, caching
├── popup.html           # UI structure
├── popup.js             # UI logic - Dynamic forms, extraction schemas
├── styles.css           # UI styling
├── lib/                 # Core libraries
│   ├── agents.js        # Agent classes (ToolLoop, Network, Supervisor)
│   ├── extraction.js    # Zod schemas and extraction logic
│   ├── mcp.js           # MCP client integration
│   ├── memory.js        # Context and memory management
│   └── utils.js         # Helpers and utilities
├── icons/               # Extension icons
└── README.md            # This file
```

---

## API Keys by Provider

| Provider | Get API Key From |
|----------|------------------|
| Anthropic | https://console.anthropic.com |
| OpenAI | https://platform.openai.com/api-keys |
| DeepSeek | https://platform.deepseek.com |
| Together AI | https://api.together.xyz |
| Groq | https://console.groq.com |
| Cerebras | https://cloud.cerebras.ai |
| Google AI | https://aistudio.google.com/apikey |
| AWS Bedrock | AWS Console → IAM → Access Keys |
| Qwen | https://dashscope.console.aliyun.com |
| Kimi | https://platform.moonshot.cn |
| Zhipu | https://open.bigmodel.cn |
| Baidu | https://console.bce.baidu.com/qianfan |
| Mistral | https://console.mistral.ai |
| xAI | https://console.x.ai |

---

## Model Recommendations

| Use Case | Recommended Model | Why |
|----------|-------------------|-----|
| General browsing | Claude Sonnet 4 | Native computer use, best accuracy |
| Fast tasks | Groq + Llama 3.2 Vision | Ultra-fast inference |
| Budget option | Zhipu GLM-4V Flash | Free tier available |
| Long context | Kimi Vision 128K | 128K context window |
| Open models | Together AI + Qwen2-VL | Open source, multiple options |
| Enterprise | AWS Bedrock + Claude | AWS integration, compliance |
| Research | OpenAI o3 | Deep reasoning |

---

## Troubleshooting

### "API Key Invalid"
- Verify key is correct
- Check if key has required permissions
- Ensure no extra spaces

### Actions not working
1. Refresh the page
2. Check browser console for errors
3. Some sites block synthetic events
4. Enable self-healing in settings

### Self-healing not recovering
- Enable action caching
- Increase DOM settle timeout
- Check if page uses Shadow DOM

### Token limit exceeded
- Enable context compaction
- Reduce max iterations
- Use a model with larger context

---

## Security Notes

- **API keys** stored in Chrome's sync storage (encrypted)
- **Screenshots** sent to your chosen AI provider only
- **No telemetry** - runs entirely locally
- **Credentials** never leave your browser except for API calls

---

## Credits

Inspired by:
- [Steel Claude Computer Use](https://github.com/steel-dev/steel-cookbook)
- [Stagehand](https://stagehand.dev/)
- [Inngest AgentKit](https://agentkit.inngest.com/)
- [Vercel AI SDK v6](https://ai-sdk.dev/)
- [Mastra](https://mastra.ai/)
- [OpenAI Agents SDK](https://github.com/openai/openai-agents-js)
- [Claude Agent SDK](https://docs.anthropic.com/claude-agent-sdk)

---

## License

MIT License
