// ELF - Memory Module
// Context management, conversation history, and memory persistence

// ============================================
// Memory Types
// ============================================

const MemoryType = {
  CONVERSATION: 'conversation',  // Chat history
  WORKING: 'working',           // Temporary working memory
  SEMANTIC: 'semantic',         // Long-term semantic memory
  EPISODIC: 'episodic',         // Event-based memory
  PROCEDURAL: 'procedural'      // Skill/action memory
};

// ============================================
// Memory Manager
// ============================================

class MemoryManager {
  constructor(config = {}) {
    this.maxTokens = config.maxTokens || 100000;
    this.maxMessages = config.maxMessages || 100;
    this.compactionThreshold = config.compactionThreshold || 0.8;
    this.storage = config.storage || new InMemoryStorage();
    
    this.memories = {
      conversation: [],
      working: {},
      semantic: [],
      episodic: [],
      procedural: []
    };
    
    this.tokenCount = 0;
    this.onCompaction = config.onCompaction || null;
  }
  
  // Add a message to conversation memory
  addMessage(role, content, metadata = {}) {
    const message = {
      id: generateId(),
      role,
      content,
      timestamp: Date.now(),
      tokens: estimateTokens(content),
      metadata
    };
    
    this.memories.conversation.push(message);
    this.tokenCount += message.tokens;
    
    // Check if compaction needed
    if (this.tokenCount > this.maxTokens * this.compactionThreshold) {
      this.compact();
    }
    
    // Persist
    this.save();
    
    return message;
  }
  
  // Get conversation history
  getHistory(limit = null) {
    let history = this.memories.conversation;
    
    if (limit) {
      history = history.slice(-limit);
    }
    
    return history;
  }
  
  // Get messages formatted for API
  getMessagesForAPI(limit = null) {
    return this.getHistory(limit).map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }
  
  // Set working memory value
  setWorking(key, value, ttl = null) {
    this.memories.working[key] = {
      value,
      setAt: Date.now(),
      ttl,
      expiresAt: ttl ? Date.now() + ttl : null
    };
    
    this.save();
    return value;
  }
  
  // Get working memory value
  getWorking(key) {
    const entry = this.memories.working[key];
    
    if (!entry) return null;
    
    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      delete this.memories.working[key];
      this.save();
      return null;
    }
    
    return entry.value;
  }
  
  // Clear working memory
  clearWorking() {
    this.memories.working = {};
    this.save();
  }
  
  // Add semantic memory (long-term knowledge)
  addSemantic(content, metadata = {}) {
    const memory = {
      id: generateId(),
      content,
      embedding: null, // Could store embedding for retrieval
      timestamp: Date.now(),
      metadata
    };
    
    this.memories.semantic.push(memory);
    this.save();
    
    return memory;
  }
  
  // Search semantic memory
  searchSemantic(query, limit = 10) {
    // Simple keyword matching for now
    // Could use embeddings for better retrieval
    const queryLower = query.toLowerCase();
    
    return this.memories.semantic
      .filter(m => m.content.toLowerCase().includes(queryLower))
      .slice(0, limit);
  }
  
  // Add episodic memory (events)
  addEpisodic(event, metadata = {}) {
    const memory = {
      id: generateId(),
      event,
      timestamp: Date.now(),
      metadata
    };
    
    this.memories.episodic.push(memory);
    this.save();
    
    return memory;
  }
  
  // Get recent episodes
  getRecentEpisodes(count = 10) {
    return this.memories.episodic.slice(-count);
  }
  
  // Add procedural memory (skills/actions)
  addProcedural(skill, actions, metadata = {}) {
    const memory = {
      id: generateId(),
      skill,
      actions,
      successCount: 0,
      failCount: 0,
      timestamp: Date.now(),
      metadata
    };
    
    this.memories.procedural.push(memory);
    this.save();
    
    return memory;
  }
  
  // Find similar procedure
  findProcedure(skill) {
    return this.memories.procedural.find(p => 
      p.skill.toLowerCase() === skill.toLowerCase()
    );
  }
  
  // Update procedure success/fail count
  updateProcedureStats(procedureId, success) {
    const proc = this.memories.procedural.find(p => p.id === procedureId);
    if (proc) {
      if (success) {
        proc.successCount++;
      } else {
        proc.failCount++;
      }
      this.save();
    }
  }
  
  // Compact memory when approaching token limit
  compact() {
    const targetTokens = this.maxTokens * 0.5;
    
    // Strategy 1: Summarize old messages
    if (this.memories.conversation.length > 10) {
      const oldMessages = this.memories.conversation.slice(0, -10);
      const summary = this.summarizeMessages(oldMessages);
      
      // Replace old messages with summary
      this.memories.conversation = [
        {
          id: generateId(),
          role: 'system',
          content: `Summary of earlier conversation: ${summary}`,
          timestamp: Date.now(),
          tokens: estimateTokens(summary),
          isSummary: true
        },
        ...this.memories.conversation.slice(-10)
      ];
      
      this.recalculateTokenCount();
    }
    
    // Strategy 2: Remove expired working memory
    const now = Date.now();
    for (const [key, entry] of Object.entries(this.memories.working)) {
      if (entry.expiresAt && now > entry.expiresAt) {
        delete this.memories.working[key];
      }
    }
    
    // Callback
    if (this.onCompaction) {
      this.onCompaction(this.tokenCount, targetTokens);
    }
    
    this.save();
  }
  
  // Summarize messages (simplified - would use LLM in production)
  summarizeMessages(messages) {
    const topics = new Set();
    
    messages.forEach(msg => {
      // Extract key terms (simplified)
      const words = msg.content.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 5 && !isStopWord(word)) {
          topics.add(word);
        }
      });
    });
    
    return `Topics discussed: ${Array.from(topics).slice(0, 10).join(', ')}`;
  }
  
  // Recalculate token count
  recalculateTokenCount() {
    this.tokenCount = this.memories.conversation.reduce(
      (sum, msg) => sum + msg.tokens, 
      0
    );
  }
  
  // Save to storage
  async save() {
    await this.storage.set('elf_memory', this.memories);
    await this.storage.set('elf_token_count', this.tokenCount);
  }
  
  // Load from storage
  async load() {
    const memories = await this.storage.get('elf_memory');
    const tokenCount = await this.storage.get('elf_token_count');
    
    if (memories) {
      this.memories = memories;
    }
    if (tokenCount) {
      this.tokenCount = tokenCount;
    }
  }
  
  // Clear all memory
  clear() {
    this.memories = {
      conversation: [],
      working: {},
      semantic: [],
      episodic: [],
      procedural: []
    };
    this.tokenCount = 0;
    this.save();
  }
  
  // Export memory
  export() {
    return JSON.stringify(this.memories, null, 2);
  }
  
  // Import memory
  import(data) {
    try {
      this.memories = JSON.parse(data);
      this.recalculateTokenCount();
      this.save();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// ============================================
// Storage Implementations
// ============================================

// In-memory storage (default)
class InMemoryStorage {
  constructor() {
    this.data = new Map();
  }
  
  async get(key) {
    return this.data.get(key);
  }
  
  async set(key, value) {
    this.data.set(key, value);
  }
  
  async delete(key) {
    this.data.delete(key);
  }
  
  async clear() {
    this.data.clear();
  }
}

// Chrome storage (for extension)
class ChromeStorage {
  constructor(area = 'local') {
    this.area = area;
  }
  
  async get(key) {
    return new Promise((resolve) => {
      chrome.storage[this.area].get([key], (result) => {
        resolve(result[key]);
      });
    });
  }
  
  async set(key, value) {
    return new Promise((resolve) => {
      chrome.storage[this.area].set({ [key]: value }, resolve);
    });
  }
  
  async delete(key) {
    return new Promise((resolve) => {
      chrome.storage[this.area].remove([key], resolve);
    });
  }
  
  async clear() {
    return new Promise((resolve) => {
      chrome.storage[this.area].clear(resolve);
    });
  }
}

// ============================================
// Context Manager
// ============================================

class ContextManager {
  constructor(config = {}) {
    this.maxTokens = config.maxTokens || 128000;
    this.modelContextWindow = config.modelContextWindow || 200000;
    this.reserveForOutput = config.reserveForOutput || 4096;
    
    this.context = {
      system: '',
      documents: [],
      tools: [],
      history: []
    };
  }
  
  // Set system prompt
  setSystemPrompt(prompt) {
    this.context.system = prompt;
  }
  
  // Add document to context
  addDocument(content, metadata = {}) {
    const doc = {
      id: generateId(),
      content,
      tokens: estimateTokens(content),
      metadata
    };
    
    this.context.documents.push(doc);
    return doc;
  }
  
  // Remove document
  removeDocument(docId) {
    this.context.documents = this.context.documents.filter(d => d.id !== docId);
  }
  
  // Add tool definition
  addTool(toolDef) {
    this.context.tools.push(toolDef);
  }
  
  // Set history
  setHistory(history) {
    this.context.history = history;
  }
  
  // Calculate total tokens
  getTotalTokens() {
    let total = 0;
    
    total += estimateTokens(this.context.system);
    
    this.context.documents.forEach(doc => {
      total += doc.tokens;
    });
    
    // Tools take space too (approximate)
    total += this.context.tools.length * 100;
    
    this.context.history.forEach(msg => {
      total += estimateTokens(msg.content);
    });
    
    return total;
  }
  
  // Check if context fits
  canFit(additionalTokens = 0) {
    const current = this.getTotalTokens();
    const available = this.modelContextWindow - this.reserveForOutput;
    
    return current + additionalTokens <= available;
  }
  
  // Get context for API
  getForAPI() {
    return {
      system: this.context.system,
      messages: this.context.history,
      tools: this.context.tools.length > 0 ? this.context.tools : undefined
    };
  }
  
  // Compact context if needed
  compact() {
    // Remove old documents first
    while (!this.canFit() && this.context.documents.length > 0) {
      this.context.documents.shift();
    }
    
    // Then trim history
    while (!this.canFit() && this.context.history.length > 2) {
      this.context.history.shift();
      this.context.history.shift();
    }
  }
}

// ============================================
// Helper Functions
// ============================================

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function estimateTokens(text) {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

function isStopWord(word) {
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'that', 'this', 'these', 'those', 'it', 'its'];
  return stopWords.includes(word);
}

// ============================================
// Exports
// ============================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MemoryType,
    MemoryManager,
    InMemoryStorage,
    ChromeStorage,
    ContextManager,
    estimateTokens,
    generateId
  };
}
