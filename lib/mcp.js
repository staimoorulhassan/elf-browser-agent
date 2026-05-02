// ELF - MCP (Model Context Protocol) Integration
// Connect to MCP servers for extended tool capabilities

// ============================================
// MCP Client
// ============================================

class MCPClient {
  constructor(config = {}) {
    this.servers = new Map();
    this.tools = new Map();
    this.resources = new Map();
    this.prompts = new Map();
    this.connected = false;
  }
  
  // Connect to an MCP server
  async connectServer(config) {
    const { name, transport, ...options } = config;
    
    let connection;
    
    switch (transport) {
      case 'stdio':
        connection = new StdioConnection(options);
        break;
      case 'sse':
        connection = new SSEConnection(options);
        break;
      case 'websocket':
        connection = new WebSocketConnection(options);
        break;
      default:
        throw new Error(`Unknown transport: ${transport}`);
    }
    
    await connection.connect();
    
    // Initialize MCP protocol
    const initResult = await connection.send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        clientInfo: {
          name: 'ELF',
          version: '1.0.0'
        }
      }
    });
    
    // Store server
    const server = {
      name,
      connection,
      capabilities: initResult.result?.capabilities || {},
      serverInfo: initResult.result?.serverInfo || {}
    };
    
    this.servers.set(name, server);
    
    // Discover tools
    if (server.capabilities.tools) {
      await this.discoverTools(name);
    }
    
    // Discover resources
    if (server.capabilities.resources) {
      await this.discoverResources(name);
    }
    
    // Discover prompts
    if (server.capabilities.prompts) {
      await this.discoverPrompts(name);
    }
    
    this.connected = true;
    return server;
  }
  
  // Disconnect from a server
  async disconnectServer(name) {
    const server = this.servers.get(name);
    if (server) {
      await server.connection.close();
      this.servers.delete(name);
      
      // Remove tools from this server
      for (const [toolName, tool] of this.tools) {
        if (tool.serverName === name) {
          this.tools.delete(toolName);
        }
      }
    }
  }
  
  // Discover tools from server
  async discoverTools(serverName) {
    const server = this.servers.get(serverName);
    if (!server) return;
    
    const result = await server.connection.send({
      jsonrpc: '2.0',
      id: generateRequestId(),
      method: 'tools/list',
      params: {}
    });
    
    const tools = result.result?.tools || [];
    
    tools.forEach(tool => {
      this.tools.set(tool.name, {
        ...tool,
        serverName,
        execute: (args) => this.callTool(tool.name, args)
      });
    });
    
    return tools;
  }
  
  // Discover resources from server
  async discoverResources(serverName) {
    const server = this.servers.get(serverName);
    if (!server) return;
    
    const result = await server.connection.send({
      jsonrpc: '2.0',
      id: generateRequestId(),
      method: 'resources/list',
      params: {}
    });
    
    const resources = result.result?.resources || [];
    
    resources.forEach(resource => {
      this.resources.set(resource.uri, {
        ...resource,
        serverName,
        read: () => this.readResource(resource.uri)
      });
    });
    
    return resources;
  }
  
  // Discover prompts from server
  async discoverPrompts(serverName) {
    const server = this.servers.get(serverName);
    if (!server) return;
    
    const result = await server.connection.send({
      jsonrpc: '2.0',
      id: generateRequestId(),
      method: 'prompts/list',
      params: {}
    });
    
    const prompts = result.result?.prompts || [];
    
    prompts.forEach(prompt => {
      this.prompts.set(prompt.name, {
        ...prompt,
        serverName,
        get: (args) => this.getPrompt(prompt.name, args)
      });
    });
    
    return prompts;
  }
  
  // Call a tool
  async callTool(toolName, args) {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }
    
    const server = this.servers.get(tool.serverName);
    if (!server) {
      throw new Error(`Server not found: ${tool.serverName}`);
    }
    
    const result = await server.connection.send({
      jsonrpc: '2.0',
      id: generateRequestId(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    });
    
    if (result.error) {
      throw new Error(result.error.message);
    }
    
    return result.result;
  }
  
  // Read a resource
  async readResource(uri) {
    const resource = this.resources.get(uri);
    if (!resource) {
      throw new Error(`Resource not found: ${uri}`);
    }
    
    const server = this.servers.get(resource.serverName);
    if (!server) {
      throw new Error(`Server not found: ${resource.serverName}`);
    }
    
    const result = await server.connection.send({
      jsonrpc: '2.0',
      id: generateRequestId(),
      method: 'resources/read',
      params: { uri }
    });
    
    return result.result;
  }
  
  // Get a prompt
  async getPrompt(promptName, args = {}) {
    const prompt = this.prompts.get(promptName);
    if (!prompt) {
      throw new Error(`Prompt not found: ${promptName}`);
    }
    
    const server = this.servers.get(prompt.serverName);
    if (!server) {
      throw new Error(`Server not found: ${prompt.serverName}`);
    }
    
    const result = await server.connection.send({
      jsonrpc: '2.0',
      id: generateRequestId(),
      method: 'prompts/get',
      params: {
        name: promptName,
        arguments: args
      }
    });
    
    return result.result;
  }
  
  // Get all tools as map
  getAllTools() {
    const tools = {};
    for (const [name, tool] of this.tools) {
      tools[name] = {
        description: tool.description,
        inputSchema: tool.inputSchema,
        execute: tool.execute
      };
    }
    return tools;
  }
  
  // List available tools
  listTools() {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema
    }));
  }
  
  // List available resources
  listResources() {
    return Array.from(this.resources.values()).map(r => ({
      uri: r.uri,
      name: r.name,
      mimeType: r.mimeType
    }));
  }
  
  // List available prompts
  listPrompts() {
    return Array.from(this.prompts.values()).map(p => ({
      name: p.name,
      description: p.description
    }));
  }
}

// ============================================
// Connection Implementations
// ============================================

// Stdio connection (for local processes)
class StdioConnection {
  constructor(config) {
    this.command = config.command;
    this.args = config.args || [];
    this.env = config.env || {};
    this.process = null;
    this.requestId = 0;
    this.pendingRequests = new Map();
  }
  
  async connect() {
    // In browser extension, this would typically not work
    // But for Node.js environments or service workers with process access
    return { result: { capabilities: {} } };
  }
  
  async send(message) {
    this.requestId++;
    message.id = this.requestId;
    
    // Implementation depends on environment
    return { result: {} };
  }
  
  async close() {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
}

// SSE connection (Server-Sent Events)
class SSEConnection {
  constructor(config) {
    this.url = config.url;
    this.headers = config.headers || {};
    this.eventSource = null;
    this.requestId = 0;
  }
  
  async connect() {
    // Open EventSource for receiving
    // Use fetch for sending
    return { result: { capabilities: {} } };
  }
  
  async send(message) {
    this.requestId++;
    message.id = this.requestId;
    
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers
      },
      body: JSON.stringify(message)
    });
    
    return response.json();
  }
  
  async close() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

// WebSocket connection
class WebSocketConnection {
  constructor(config) {
    this.url = config.url;
    this.ws = null;
    this.requestId = 0;
    this.pendingRequests = new Map();
  }
  
  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        resolve({ result: { capabilities: {} } });
      };
      
      this.ws.onmessage = (event) => {
        const response = JSON.parse(event.data);
        const pending = this.pendingRequests.get(response.id);
        if (pending) {
          pending.resolve(response);
          this.pendingRequests.delete(response.id);
        }
      };
      
      this.ws.onerror = (error) => {
        reject(error);
      };
    });
  }
  
  async send(message) {
    this.requestId++;
    message.id = this.requestId;
    
    return new Promise((resolve) => {
      this.pendingRequests.set(this.requestId, { resolve });
      this.ws.send(JSON.stringify(message));
    });
  }
  
  async close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// ============================================
// Built-in MCP Tools (for browser extension)
// ============================================

const BUILTIN_MCP_TOOLS = {
  // File operations
  read_file: {
    name: 'read_file',
    description: 'Read contents of a file from the workspace',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path' }
      },
      required: ['path']
    },
    execute: async (args) => {
      // Would use Chrome extension file API
      return { content: 'File content placeholder' };
    }
  },
  
  write_file: {
    name: 'write_file',
    description: 'Write content to a file in the workspace',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path' },
        content: { type: 'string', description: 'File content' }
      },
      required: ['path', 'content']
    },
    execute: async (args) => {
      return { success: true };
    }
  },
  
  // Web operations
  web_search: {
    name: 'web_search',
    description: 'Search the web for information',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        max_results: { type: 'number', description: 'Maximum results' }
      },
      required: ['query']
    },
    execute: async (args) => {
      // Would integrate with search API
      return { results: [] };
    }
  },
  
  web_fetch: {
    name: 'web_fetch',
    description: 'Fetch content from a URL',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to fetch' }
      },
      required: ['url']
    },
    execute: async (args) => {
      const response = await fetch(args.url);
      const content = await response.text();
      return { content };
    }
  },
  
  // Browser operations
  screenshot: {
    name: 'screenshot',
    description: 'Take a screenshot of the current page',
    inputSchema: {
      type: 'object',
      properties: {
        full_page: { type: 'boolean', description: 'Capture full page' }
      }
    },
    execute: async (args) => {
      // Would use Chrome tabs API
      return { image: 'base64...' };
    }
  },
  
  click: {
    name: 'click',
    description: 'Click at coordinates on the page',
    inputSchema: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'X coordinate' },
        y: { type: 'number', description: 'Y coordinate' }
      },
      required: ['x', 'y']
    },
    execute: async (args) => {
      return { success: true };
    }
  },
  
  type: {
    name: 'type',
    description: 'Type text into the page',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to type' },
        selector: { type: 'string', description: 'Optional selector' }
      },
      required: ['text']
    },
    execute: async (args) => {
      return { success: true };
    }
  },
  
  scroll: {
    name: 'scroll',
    description: 'Scroll the page',
    inputSchema: {
      type: 'object',
      properties: {
        direction: { type: 'string', enum: ['up', 'down', 'left', 'right'] },
        amount: { type: 'number', description: 'Scroll amount' }
      },
      required: ['direction']
    },
    execute: async (args) => {
      return { success: true };
    }
  },
  
  extract: {
    name: 'extract',
    description: 'Extract structured data from the page',
    inputSchema: {
      type: 'object',
      properties: {
        schema: { type: 'object', description: 'Zod-like schema' },
        selector: { type: 'string', description: 'Optional selector' }
      },
      required: ['schema']
    },
    execute: async (args) => {
      return { data: [] };
    }
  }
};

// ============================================
// Helper Functions
// ============================================

function generateRequestId() {
  return Date.now() + Math.random();
}

// ============================================
// Exports
// ============================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MCPClient,
    StdioConnection,
    SSEConnection,
    WebSocketConnection,
    BUILTIN_MCP_TOOLS
  };
}
