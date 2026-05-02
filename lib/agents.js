// ELF - Agent Classes
// ToolLoopAgent, Network, Supervisor patterns

// ============================================
// Stop Conditions
// ============================================

const StopConditions = {
  stepCountIs: (count) => ({ 
    type: 'stepCount', 
    check: (state) => state.iterations >= count,
    value: count 
  }),
  
  hasToolCall: (toolName) => ({ 
    type: 'toolCall', 
    check: (state) => state.lastToolCall === toolName,
    value: toolName 
  }),
  
  isLoopFinished: () => ({ 
    type: 'loopFinished', 
    check: (state) => state.modelStopped,
    value: true 
  }),
  
  tokenBudget: (budget) => ({ 
    type: 'tokenBudget', 
    check: (state) => state.tokens >= budget,
    value: budget 
  }),
  
  custom: (fn) => ({ 
    type: 'custom', 
    check: fn,
    value: fn 
  }),
  
  // Combine multiple conditions (OR logic)
  any: (...conditions) => ({
    type: 'any',
    check: (state) => conditions.some(c => c.check(state)),
    conditions
  }),
  
  // All conditions must be met (AND logic)
  all: (...conditions) => ({
    type: 'all',
    check: (state) => conditions.every(c => c.check(state)),
    conditions
  })
};

// ============================================
// ToolLoopAgent (Vercel AI SDK Style)
// ============================================

class ToolLoopAgent {
  constructor(config) {
    this.id = config.id || `agent-${Date.now()}`;
    this.name = config.name || 'Agent';
    this.model = config.model;
    this.instructions = config.instructions || '';
    this.tools = config.tools || {};
    this.toolChoice = config.toolChoice || 'auto'; // auto, required, none, or specific tool
    this.stopWhen = config.stopWhen || [StopConditions.stepCountIs(20)];
    this.maxOutputTokens = config.maxOutputTokens || 4096;
    this.temperature = config.temperature || 0.7;
    this.outputType = config.outputType || null; // Zod schema
    this.activeTools = config.activeTools || null; // Subset of tools
    this.approvals = config.approvals || {};
    
    // Callbacks
    this.onStepFinish = config.onStepFinish || null;
    this.onFinish = config.onFinish || null;
    this.onToolCall = config.onToolCall || null;
    this.onApproval = config.onApproval || null;
    
    // State
    this.state = {
      iterations: 0,
      tokens: 0,
      messages: [],
      lastToolCall: null,
      modelStopped: false,
      completed: false,
      result: null
    };
  }
  
  // Check if any stop condition is met
  shouldStop() {
    return this.stopWhen.some(condition => condition.check(this.state));
  }
  
  // Get active tools for this step
  getActiveTools() {
    if (this.activeTools === null) {
      return Object.keys(this.tools);
    }
    return this.activeTools;
  }
  
  // Execute a tool
  async executeTool(toolName, args) {
    const tool = this.tools[toolName];
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }
    
    // Validate input if schema provided
    if (tool.inputSchema) {
      const validated = tool.inputSchema.safeParse(args);
      if (!validated.success) {
        throw new Error(`Invalid tool input: ${validated.error.message}`);
      }
      args = validated.data;
    }
    
    // Check if approval needed
    if (this.approvals[toolName] || tool.requiresApproval) {
      const approved = await this.requestApproval(toolName, args);
      if (!approved) {
        return { error: 'Approval denied', approved: false };
      }
    }
    
    // Execute tool
    if (this.onToolCall) {
      this.onToolCall(toolName, args);
    }
    
    const result = await tool.execute(args);
    
    this.state.lastToolCall = toolName;
    return result;
  }
  
  // Request approval for sensitive actions
  async requestApproval(toolName, args) {
    if (this.onApproval) {
      return this.onApproval(toolName, args);
    }
    // Default: auto-approve
    return true;
  }
  
  // Run the agent loop
  async run(prompt) {
    this.state.messages.push({ role: 'user', content: prompt });
    
    while (!this.shouldStop() && !this.state.completed) {
      // Prepare call
      const stepConfig = await this.prepareStep();
      
      // Call model (implemented by subclass or provider handler)
      const response = await this.callModel(stepConfig);
      
      // Track tokens
      if (response.usage) {
        this.state.tokens += response.usage.input + response.usage.output;
      }
      
      // Process response
      this.state.iterations++;
      
      if (response.toolCalls && response.toolCalls.length > 0) {
        // Execute tools
        for (const call of response.toolCalls) {
          const result = await this.executeTool(call.name, call.args);
          this.state.messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(result)
          });
        }
      } else {
        // Model finished without tool call
        this.state.modelStopped = true;
        this.state.result = response.content;
        this.state.completed = true;
      }
      
      // Callback
      if (this.onStepFinish) {
        this.onStepFinish(this.state);
      }
    }
    
    // Final callback
    if (this.onFinish) {
      this.onFinish(this.state);
    }
    
    // Validate output if schema provided
    let output = this.state.result;
    if (this.outputType && output) {
      const validated = this.outputType.safeParse(JSON.parse(output));
      if (validated.success) {
        output = validated.data;
      }
    }
    
    return {
      output,
      iterations: this.state.iterations,
      tokens: this.state.tokens,
      completed: this.state.completed
    };
  }
  
  // Prepare step configuration
  async prepareStep() {
    return {
      model: this.model,
      messages: this.state.messages,
      tools: this.getActiveTools().map(name => this.tools[name]),
      toolChoice: this.toolChoice,
      maxTokens: this.maxOutputTokens,
      temperature: this.temperature
    };
  }
  
  // Call model (to be implemented by provider handler)
  async callModel(config) {
    throw new Error('callModel must be implemented by subclass');
  }
}

// ============================================
// AgentNetwork (Inngest AgentKit Style)
// ============================================

class AgentNetwork {
  constructor(config) {
    this.id = config.id || `network-${Date.now()}`;
    this.agents = config.agents || []; // List of ToolLoopAgent instances
    this.router = config.router || this.defaultRouter;
    this.maxIterations = config.maxIterations || 50;
    this.parallel = config.parallel || false;
    
    // Shared state
    this.state = {
      history: [], // Conversation history
      data: {},    // Typed state (key-value)
      agentCalls: 0,
      currentAgent: null,
      lastResult: null,
      completed: false
    };
    
    // Callbacks
    this.onAgentStart = config.onAgentStart || null;
    this.onAgentFinish = config.onAgentFinish || null;
    this.onStateChange = config.onStateChange || null;
  }
  
  // Default router: run agents in sequence
  async defaultRouter(network) {
    const remaining = network.state.remainingAgents || [...network.agents];
    if (remaining.length === 0) {
      return undefined; // Stop
    }
    return remaining.shift();
  }
  
  // Run the network
  async run(prompt) {
    this.state.history.push({ role: 'user', content: prompt });
    this.state.remainingAgents = [...this.agents];
    
    while (this.state.agentCalls < this.maxIterations && !this.state.completed) {
      // Get next agent from router
      const agent = await this.router(this);
      
      if (!agent) {
        this.state.completed = true;
        break;
      }
      
      // Run agent
      this.state.currentAgent = agent;
      if (this.onAgentStart) {
        this.onAgentStart(agent, this.state);
      }
      
      const result = await agent.run(this.getPromptForAgent(agent));
      
      // Update state
      this.state.agentCalls++;
      this.state.lastResult = result;
      this.state.history.push({
        role: 'agent',
        agentId: agent.id,
        result: result.output
      });
      
      if (this.onAgentFinish) {
        this.onAgentFinish(agent, result, this.state);
      }
      if (this.onStateChange) {
        this.onStateChange(this.state);
      }
    }
    
    return {
      history: this.state.history,
      data: this.state.data,
      completed: this.state.completed,
      agentCalls: this.state.agentCalls
    };
  }
  
  // Get prompt for agent (can include context from shared state)
  getPromptForAgent(agent) {
    const lastMessage = this.state.history[this.state.history.length - 1];
    if (lastMessage.role === 'user') {
      return lastMessage.content;
    }
    return `Continue based on previous results: ${JSON.stringify(this.state.lastResult)}`;
  }
  
  // Update shared data
  setData(key, value) {
    this.state.data[key] = value;
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
  
  // Get shared data
  getData(key) {
    return this.state.data[key];
  }
}

// ============================================
// SupervisorAgent (Mastra Style)
// ============================================

class SupervisorAgent extends ToolLoopAgent {
  constructor(config) {
    super(config);
    this.workers = config.workers || {}; // Map of worker agents
    this.delegateTool = this.createDelegateTool();
    this.tools.delegate = this.delegateTool;
  }
  
  // Create tool for delegating to workers
  createDelegateTool() {
    return {
      name: 'delegate',
      description: 'Delegate a task to a specialized worker agent',
      inputSchema: {
        type: 'object',
        properties: {
          worker: { 
            type: 'string', 
            description: 'Name of the worker agent' 
          },
          task: { 
            type: 'string', 
            description: 'Task description for the worker' 
          }
        },
        required: ['worker', 'task']
      },
      execute: async (args) => {
        const worker = this.workers[args.worker];
        if (!worker) {
          return { error: `Worker not found: ${args.worker}` };
        }
        
        // Run worker agent
        const result = await worker.run(args.task);
        return { workerResult: result };
      }
    };
  }
  
  // Add a worker
  addWorker(name, agent) {
    this.workers[name] = agent;
  }
  
  // Remove a worker
  removeWorker(name) {
    delete this.workers[name];
  }
}

// ============================================
// ParallelAgentNetwork (Deep Research Style)
// ============================================

class ParallelAgentNetwork {
  constructor(config) {
    this.id = config.id || `parallel-${Date.now()}`;
    this.orchestrator = config.orchestrator; // Lead agent
    this.researchers = config.researchers || []; // Sub-agents
    this.aggregator = config.aggregator; // Result aggregation function
    this.maxConcurrent = config.maxConcurrent || 5;
  }
  
  // Run parallel research
  async run(prompt) {
    // Step 1: Orchestrator generates tasks
    const tasks = await this.orchestrator.run(prompt);
    
    // Step 2: Run researchers in parallel (batched)
    const results = [];
    for (let i = 0; i < tasks.subtasks.length; i += this.maxConcurrent) {
      const batch = tasks.subtasks.slice(i, i + this.maxConcurrent);
      const batchResults = await Promise.all(
        batch.map(task => this.runResearcher(task))
      );
      results.push(...batchResults);
    }
    
    // Step 3: Aggregate results
    const aggregated = await this.aggregator(results);
    
    return {
      tasks: tasks.subtasks,
      results,
      aggregated
    };
  }
  
  // Run a single researcher
  async runResearcher(task) {
    // Each researcher gets its own browser session
    const researcher = this.researchers.find(r => 
      r.capabilities.includes(task.type)
    ) || this.researchers[0];
    
    return researcher.run(task.prompt);
  }
}

// ============================================
// Exports
// ============================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    StopConditions,
    ToolLoopAgent,
    AgentNetwork,
    SupervisorAgent,
    ParallelAgentNetwork
  };
}
