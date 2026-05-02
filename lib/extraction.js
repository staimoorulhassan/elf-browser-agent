// ELF - Extraction Module
// Zod-style schema validation and structured data extraction

// ============================================
// Schema Types (Zod-like, lightweight implementation)
// ============================================

class ZodType {
  constructor() {
    this._optional = false;
    this._nullable = false;
    this._description = '';
    this._default = undefined;
  }
  
  optional() {
    this._optional = true;
    return this;
  }
  
  nullable() {
    this._nullable = true;
    return this;
  }
  
  describe(description) {
    this._description = description;
    return this;
  }
  
  default(value) {
    this._default = value;
    this._optional = true;
    return this;
  }
  
  safeParse(data) {
    try {
      const result = this.parse(data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  parse(data) {
    throw new Error('parse() must be implemented by subclass');
  }
  
  toJSON() {
    return { type: this.constructor.name };
  }
}

// String type
class ZodString extends ZodType {
  constructor() {
    super();
    this._min = null;
    this._max = null;
    this._email = false;
    this._url = false;
    this._regex = null;
    this._enum = null;
  }
  
  min(length, message) {
    this._min = length;
    this._minMessage = message;
    return this;
  }
  
  max(length, message) {
    this._max = length;
    this._maxMessage = message;
    return this;
  }
  
  email(message) {
    this._email = true;
    this._emailMessage = message;
    return this;
  }
  
  url(message) {
    this._url = true;
    this._urlMessage = message;
    return this;
  }
  
  regex(pattern, message) {
    this._regex = pattern;
    this._regexMessage = message;
    return this;
  }
  
  enum(values) {
    this._enum = values;
    return this;
  }
  
  parse(data) {
    if (data === undefined || data === null) {
      if (this._optional) return this._default;
      if (this._nullable) return null;
      throw new Error('Required');
    }
    
    if (typeof data !== 'string') {
      throw new Error('Expected string');
    }
    
    if (this._min !== null && data.length < this._min) {
      throw new Error(this._minMessage || `Minimum ${this._min} characters`);
    }
    
    if (this._max !== null && data.length > this._max) {
      throw new Error(this._maxMessage || `Maximum ${this._max} characters`);
    }
    
    if (this._email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data)) {
      throw new Error(this._emailMessage || 'Invalid email');
    }
    
    if (this._url && !/^https?:\/\/.+/.test(data)) {
      throw new Error(this._urlMessage || 'Invalid URL');
    }
    
    if (this._regex && !this._regex.test(data)) {
      throw new Error(this._regexMessage || 'Invalid format');
    }
    
    if (this._enum && !this._enum.includes(data)) {
      throw new Error(`Must be one of: ${this._enum.join(', ')}`);
    }
    
    return data;
  }
  
  toJSON() {
    return {
      type: 'string',
      minLength: this._min,
      maxLength: this._max,
      enum: this._enum,
      description: this._description
    };
  }
}

// Number type
class ZodNumber extends ZodType {
  constructor() {
    super();
    this._min = null;
    this._max = null;
    this._int = false;
    this._positive = false;
  }
  
  min(value, message) {
    this._min = value;
    this._minMessage = message;
    return this;
  }
  
  max(value, message) {
    this._max = value;
    this._maxMessage = message;
    return this;
  }
  
  int(message) {
    this._int = true;
    this._intMessage = message;
    return this;
  }
  
  positive(message) {
    this._positive = true;
    this._positiveMessage = message;
    return this;
  }
  
  parse(data) {
    if (data === undefined || data === null) {
      if (this._optional) return this._default;
      if (this._nullable) return null;
      throw new Error('Required');
    }
    
    const num = Number(data);
    if (isNaN(num)) {
      throw new Error('Expected number');
    }
    
    if (this._int && !Number.isInteger(num)) {
      throw new Error(this._intMessage || 'Expected integer');
    }
    
    if (this._min !== null && num < this._min) {
      throw new Error(this._minMessage || `Minimum: ${this._min}`);
    }
    
    if (this._max !== null && num > this._max) {
      throw new Error(this._maxMessage || `Maximum: ${this._max}`);
    }
    
    if (this._positive && num <= 0) {
      throw new Error(this._positiveMessage || 'Must be positive');
    }
    
    return num;
  }
  
  toJSON() {
    return {
      type: 'number',
      minimum: this._min,
      maximum: this._max,
      description: this._description
    };
  }
}

// Boolean type
class ZodBoolean extends ZodType {
  parse(data) {
    if (data === undefined || data === null) {
      if (this._optional) return this._default;
      if (this._nullable) return null;
      throw new Error('Required');
    }
    
    if (typeof data === 'boolean') return data;
    if (data === 'true' || data === '1' || data === 1) return true;
    if (data === 'false' || data === '0' || data === 0) return false;
    
    throw new Error('Expected boolean');
  }
  
  toJSON() {
    return { type: 'boolean', description: this._description };
  }
}

// Array type
class ZodArray extends ZodType {
  constructor(elementType) {
    super();
    this._element = elementType;
    this._min = null;
    this._max = null;
  }
  
  min(length, message) {
    this._min = length;
    this._minMessage = message;
    return this;
  }
  
  max(length, message) {
    this._max = length;
    this._maxMessage = message;
    return this;
  }
  
  parse(data) {
    if (data === undefined || data === null) {
      if (this._optional) return this._default || [];
      if (this._nullable) return null;
      throw new Error('Required');
    }
    
    if (!Array.isArray(data)) {
      throw new Error('Expected array');
    }
    
    if (this._min !== null && data.length < this._min) {
      throw new Error(this._minMessage || `Minimum ${this._min} items`);
    }
    
    if (this._max !== null && data.length > this._max) {
      throw new Error(this._maxMessage || `Maximum ${this._max} items`);
    }
    
    return data.map((item, index) => {
      try {
        return this._element.parse(item);
      } catch (error) {
        throw new Error(`[${index}]: ${error.message}`);
      }
    });
  }
  
  toJSON() {
    return {
      type: 'array',
      items: this._element.toJSON(),
      minItems: this._min,
      maxItems: this._max,
      description: this._description
    };
  }
}

// Object type
class ZodObject extends ZodType {
  constructor(shape) {
    super();
    this._shape = shape;
  }
  
  parse(data) {
    if (data === undefined || data === null) {
      if (this._optional) return this._default;
      if (this._nullable) return null;
      throw new Error('Required');
    }
    
    if (typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Expected object');
    }
    
    const result = {};
    for (const [key, schema] of Object.entries(this._shape)) {
      try {
        result[key] = schema.parse(data[key]);
      } catch (error) {
        throw new Error(`.${key}: ${error.message}`);
      }
    }
    return result;
  }
  
  toJSON() {
    const properties = {};
    const required = [];
    
    for (const [key, schema] of Object.entries(this._shape)) {
      properties[key] = schema.toJSON();
      if (!schema._optional && !schema._nullable) {
        required.push(key);
      }
    }
    
    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
      description: this._description
    };
  }
}

// Enum type
class ZodEnum extends ZodType {
  constructor(values) {
    super();
    this._values = values;
  }
  
  parse(data) {
    if (data === undefined || data === null) {
      if (this._optional) return this._default;
      if (this._nullable) return null;
      throw new Error('Required');
    }
    
    if (!this._values.includes(data)) {
      throw new Error(`Must be one of: ${this._values.join(', ')}`);
    }
    
    return data;
  }
  
  toJSON() {
    return {
      type: 'string',
      enum: this._values,
      description: this._description
    };
  }
}

// Union type
class ZodUnion extends ZodType {
  constructor(types) {
    super();
    this._types = types;
  }
  
  parse(data) {
    for (const type of this._types) {
      const result = type.safeParse(data);
      if (result.success) {
        return result.data;
      }
    }
    throw new Error('No matching type in union');
  }
  
  toJSON() {
    return {
      oneOf: this._types.map(t => t.toJSON()),
      description: this._description
    };
  }
}

// Lazy type (for recursive schemas)
class ZodLazy extends ZodType {
  constructor(getter) {
    super();
    this._getter = getter;
    this._cached = null;
  }
  
  parse(data) {
    if (!this._cached) {
      this._cached = this._getter();
    }
    return this._cached.parse(data);
  }
  
  toJSON() {
    if (!this._cached) {
      this._cached = this._getter();
    }
    return this._cached.toJSON();
  }
}

// ============================================
// Factory Functions (Zod-style API)
// ============================================

const z = {
  string: () => new ZodString(),
  number: () => new ZodNumber(),
  boolean: () => new ZodBoolean(),
  array: (element) => new ZodArray(element),
  object: (shape) => new ZodObject(shape),
  enum: (values) => new ZodEnum(values),
  union: (types) => new ZodUnion(types),
  lazy: (getter) => new ZodLazy(getter),
  
  // Convenience
  optional: (type) => type.optional(),
  nullable: (type) => type.nullable()
};

// ============================================
// Extraction Functions
// ============================================

// Extract structured data from page
async function extractFromPage(schema, options = {}) {
  const {
    selector = 'body',
    includeHidden = false,
    maxItems = 100
  } = options;
  
  // Build extraction prompt from schema
  const schemaJson = schema.toJSON();
  const prompt = buildExtractionPrompt(schemaJson);
  
  // Get page content
  const elements = document.querySelectorAll(selector);
  const data = [];
  
  for (const el of elements) {
    if (data.length >= maxItems) break;
    
    // Skip hidden elements unless included
    if (!includeHidden && isHidden(el)) continue;
    
    const item = extractElement(el, schemaJson);
    if (item) {
      const validated = schema.safeParse(item);
      if (validated.success) {
        data.push(validated.data);
      }
    }
  }
  
  return data;
}

// Build extraction prompt from JSON schema
function buildExtractionPrompt(schema) {
  if (schema.type === 'object') {
    const fields = Object.entries(schema.properties || {}).map(([key, prop]) => {
      const desc = prop.description || prop.type;
      return `${key}: ${desc}`;
    });
    return `Extract: { ${fields.join(', ')} }`;
  }
  
  if (schema.type === 'array') {
    return `Extract array of: ${JSON.stringify(schema.items)}`;
  }
  
  return `Extract ${schema.type}`;
}

// Extract data from a single element
function extractElement(element, schema) {
  const result = {};
  
  if (schema.type === 'object') {
    for (const [key, prop] of Object.entries(schema.properties || {})) {
      result[key] = extractValue(element, prop);
    }
  } else if (schema.type === 'string') {
    return element.textContent?.trim() || '';
  } else if (schema.type === 'number') {
    const text = element.textContent?.trim() || '';
    const num = parseFloat(text.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? null : num;
  }
  
  return result;
}

// Extract a single value based on type
function extractValue(element, propSchema) {
  const type = propSchema.type;
  
  // Check for data attributes
  const dataAttr = propSchema['data-attribute'];
  if (dataAttr) {
    const value = element.getAttribute(`data-${dataAttr}`);
    return coerceType(value, type);
  }
  
  // Check for specific selectors
  const selector = propSchema['selector'];
  if (selector) {
    const child = element.querySelector(selector);
    if (child) {
      return extractValue(child, { ...propSchema, selector: null });
    }
  }
  
  // Default: extract text content
  const text = element.textContent?.trim() || '';
  
  if (type === 'string') {
    return text;
  }
  
  if (type === 'number') {
    const num = parseFloat(text.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? null : num;
  }
  
  if (type === 'boolean') {
    return text.toLowerCase() === 'true' || text === '1';
  }
  
  if (type === 'array') {
    const children = element.querySelectorAll(propSchema.items?.selector || '*');
    return Array.from(children).map(child => 
      extractValue(child, propSchema.items || { type: 'string' })
    ).filter(v => v !== null);
  }
  
  return null;
}

// Coerce value to type
function coerceType(value, type) {
  if (value === null || value === undefined) return null;
  
  switch (type) {
    case 'string': return String(value);
    case 'number': {
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    }
    case 'boolean': return value === 'true' || value === '1';
    default: return value;
  }
}

// Check if element is hidden
function isHidden(element) {
  const style = window.getComputedStyle(element);
  return style.display === 'none' || 
         style.visibility === 'hidden' || 
         style.opacity === '0' ||
         element.hidden;
}

// ============================================
// Observe Functions (Stagehand Style)
// ============================================

// Discover actionable elements on page
function observeActionableElements(options = {}) {
  const {
    includeButtons = true,
    includeLinks = true,
    includeInputs = true,
    includeClickable = true,
    maxElements = 50
  } = options;
  
  const elements = [];
  const selectors = [];
  
  if (includeButtons) selectors.push('button', '[role="button"]', 'input[type="submit"]', 'input[type="button"]');
  if (includeLinks) selectors.push('a[href]');
  if (includeInputs) selectors.push('input:not([type="hidden"])', 'textarea', 'select');
  
  const query = selectors.join(', ');
  const found = document.querySelectorAll(query);
  
  found.forEach(el => {
    if (elements.length >= maxElements) return;
    if (isHidden(el)) return;
    
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    
    elements.push({
      type: getElementType(el),
      tag: el.tagName.toLowerCase(),
      text: el.textContent?.trim().slice(0, 100),
      selector: generateSelector(el),
      coordinate: [Math.round(rect.left + rect.width / 2), Math.round(rect.top + rect.height / 2)],
      attributes: getElementAttributes(el)
    });
  });
  
  // Find clickable elements via event listeners
  if (includeClickable) {
    document.querySelectorAll('*').forEach(el => {
      if (elements.length >= maxElements) return;
      if (isHidden(el)) return;
      if (['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return;
      
      if (hasClickListener(el)) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          elements.push({
            type: 'clickable',
            tag: el.tagName.toLowerCase(),
            text: el.textContent?.trim().slice(0, 100),
            selector: generateSelector(el),
            coordinate: [Math.round(rect.left + rect.width / 2), Math.round(rect.top + rect.height / 2)],
            cursor: window.getComputedStyle(el).cursor
          });
        }
      }
    });
  }
  
  return elements;
}

// Get element type
function getElementType(el) {
  const tag = el.tagName.toLowerCase();
  
  if (tag === 'button' || el.getAttribute('role') === 'button') return 'button';
  if (tag === 'a') return 'link';
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return 'input';
  
  return tag;
}

// Generate unique selector for element
function generateSelector(el) {
  // Try ID first
  if (el.id) return `#${CSS.escape(el.id)}`;
  
  // Try unique attributes
  const uniqueAttrs = ['data-testid', 'data-cy', 'data-id', 'aria-label', 'name'];
  for (const attr of uniqueAttrs) {
    const value = el.getAttribute(attr);
    if (value) {
      const selector = `[${attr}="${CSS.escape(value)}"]`;
      if (document.querySelectorAll(selector).length === 1) {
        return selector;
      }
    }
  }
  
  // Fall back to path
  const path = [];
  let current = el;
  
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    
    const siblings = Array.from(current.parentElement?.children || []);
    const index = siblings.indexOf(current);
    if (siblings.length > 1) {
      selector += `:nth-child(${index + 1})`;
    }
    
    path.unshift(selector);
    current = current.parentElement;
    
    // Check uniqueness
    const testSelector = path.join(' > ');
    if (document.querySelectorAll(testSelector).length === 1) {
      return testSelector;
    }
  }
  
  return path.join(' > ');
}

// Get relevant attributes
function getElementAttributes(el) {
  const attrs = {};
  const relevantAttrs = ['type', 'name', 'placeholder', 'value', 'href', 'disabled', 'aria-label'];
  
  relevantAttrs.forEach(attr => {
    const value = el.getAttribute(attr);
    if (value) attrs[attr] = value;
  });
  
  return attrs;
}

// Check if element has click listener
function hasClickListener(el) {
  // This is a best-effort check
  const style = window.getComputedStyle(el);
  if (style.cursor === 'pointer') return true;
  
  // Check for common interactive patterns
  if (el.hasAttribute('onclick')) return true;
  if (el.getAttribute('role')?.includes('button')) return true;
  
  return false;
}

// ============================================
// Exports
// ============================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    z,
    ZodType,
    ZodString,
    ZodNumber,
    ZodBoolean,
    ZodArray,
    ZodObject,
    ZodEnum,
    ZodUnion,
    ZodLazy,
    extractFromPage,
    observeActionableElements,
    buildExtractionPrompt,
    generateSelector
  };
}
