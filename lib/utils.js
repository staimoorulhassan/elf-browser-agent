// ELF - Utility Functions
// Helper functions and common utilities

// ============================================
// DOM Utilities
// ============================================

// Wait for element to appear
function waitForElement(selector, options = {}) {
  const {
    timeout = 10000,
    interval = 100,
    visible = true
  } = options;
  
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      const element = document.querySelector(selector);
      
      if (element) {
        if (visible) {
          const rect = element.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            resolve(element);
            return;
          }
        } else {
          resolve(element);
          return;
        }
      }
      
      if (Date.now() - startTime >= timeout) {
        reject(new Error(`Element not found: ${selector}`));
        return;
      }
      
      setTimeout(check, interval);
    };
    
    check();
  });
}

// Wait for DOM to settle
function waitForDomSettle(options = {}) {
  const {
    timeout = 5000,
    idleTime = 300,
    checkInterval = 50
  } = options;
  
  return new Promise((resolve) => {
    let lastChange = Date.now();
    let lastNodeCount = document.getElementsByTagName('*').length;
    
    const check = () => {
      const currentCount = document.getElementsByTagName('*').length;
      
      if (currentCount !== lastNodeCount) {
        lastChange = Date.now();
        lastNodeCount = currentCount;
      }
      
      if (Date.now() - lastChange >= idleTime) {
        resolve();
        return;
      }
      
      if (Date.now() - lastChange >= timeout) {
        resolve();
        return;
      }
      
      setTimeout(check, checkInterval);
    };
    
    check();
  });
}

// Check if element is visible
function isElementVisible(element) {
  if (!element) return false;
  
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  
  const style = window.getComputedStyle(element);
  if (style.display === 'none') return false;
  if (style.visibility === 'hidden') return false;
  if (parseFloat(style.opacity) === 0) return false;
  
  // Check if in viewport
  return (
    rect.top < window.innerHeight &&
    rect.bottom > 0 &&
    rect.left < window.innerWidth &&
    rect.right > 0
  );
}

// Get element at coordinates
function getElementAtCoordinates(x, y) {
  return document.elementFromPoint(x, y);
}

// Get element info
function getElementInfo(element) {
  if (!element) return null;
  
  const rect = element.getBoundingClientRect();
  
  return {
    tag: element.tagName.toLowerCase(),
    id: element.id || null,
    classes: Array.from(element.classList),
    text: element.textContent?.trim().slice(0, 200),
    value: element.value,
    href: element.href,
    src: element.src,
    type: element.type,
    placeholder: element.placeholder,
    disabled: element.disabled,
    visible: isElementVisible(element),
    rect: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
      bottom: rect.bottom,
      right: rect.right
    },
    center: {
      x: Math.round(rect.left + rect.width / 2),
      y: Math.round(rect.top + rect.height / 2)
    },
    selector: generateSelector(element)
  };
}

// Generate unique selector
function generateSelector(element) {
  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }
  
  // Try data attributes
  const dataAttrs = ['data-testid', 'data-cy', 'data-id', 'data-test'];
  for (const attr of dataAttrs) {
    const value = element.getAttribute(attr);
    if (value) {
      return `[${attr}="${CSS.escape(value)}"]`;
    }
  }
  
  // Try aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) {
    return `[aria-label="${CSS.escape(ariaLabel)}"]`;
  }
  
  // Try name
  const name = element.getAttribute('name');
  if (name) {
    return `[name="${CSS.escape(name)}"]`;
  }
  
  // Fall back to path
  const path = [];
  let current = element;
  
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
    try {
      if (document.querySelectorAll(testSelector).length === 1) {
        return testSelector;
      }
    } catch (e) {}
  }
  
  return path.join(' > ');
}

// ============================================
// Action Utilities
// ============================================

// Human-like typing
async function humanType(element, text, options = {}) {
  const {
    minDelay = 30,
    maxDelay = 100,
    mistakes = 0.02,  // 2% chance of mistake
    mistakeDelay = 200
  } = options;
  
  element.focus();
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    // Occasionally make a mistake
    if (Math.random() < mistakes && i < text.length - 1) {
      const wrongChar = String.fromCharCode(char.charCodeAt(0) + (Math.random() > 0.5 ? 1 : -1));
      await typeChar(wrongChar);
      await sleep(mistakeDelay);
      await typeChar('\b');  // Backspace
      await sleep(mistakeDelay / 2);
    }
    
    await typeChar(char);
    await sleep(randomBetween(minDelay, maxDelay));
  }
  
  async function typeChar(char) {
    const inputEvent = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: char === '\b' ? 'deleteContentBackward' : 'insertText',
      data: char === '\b' ? null : char
    });
    
    element.dispatchEvent(inputEvent);
    
    if (char !== '\b') {
      element.value += char;
    } else {
      element.value = element.value.slice(0, -1);
    }
  }
}

// Human-like click
async function humanClick(element, options = {}) {
  const {
    moveDuration = 200,
    hoverBefore = 100,
    clickOffset = { x: 0, y: 0 }
  } = options;
  
  const rect = element.getBoundingClientRect();
  const targetX = rect.left + rect.width / 2 + clickOffset.x;
  const targetY = rect.top + rect.height / 2 + clickOffset.y;
  
  // Simulate mouse movement
  const moveEvent = new MouseEvent('mousemove', {
    bubbles: true,
    cancelable: true,
    clientX: targetX,
    clientY: targetY
  });
  document.dispatchEvent(moveEvent);
  
  await sleep(moveDuration);
  
  // Hover
  const overEvent = new MouseEvent('mouseover', {
    bubbles: true,
    cancelable: true,
    clientX: targetX,
    clientY: targetY
  });
  element.dispatchEvent(overEvent);
  
  await sleep(hoverBefore);
  
  // Click
  const clickEvent = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    clientX: targetX,
    clientY: targetY
  });
  element.dispatchEvent(clickEvent);
  
  // Also trigger pointer event for good measure
  const pointerEvent = new PointerEvent('pointerdown', {
    bubbles: true,
    cancelable: true,
    clientX: targetX,
    clientY: targetY,
    isPrimary: true
  });
  element.dispatchEvent(pointerEvent);
}

// ============================================
// Coordinate Utilities
// ============================================

// Normalize coordinates to viewport
function normalizeCoordinates(x, y, viewport) {
  return {
    x: Math.max(0, Math.min(x, viewport.width)),
    y: Math.max(0, Math.min(y, viewport.height))
  };
}

// Convert percentage to pixels
function percentToPixels(percentX, percentY, viewport) {
  return {
    x: Math.round(viewport.width * percentX / 100),
    y: Math.round(viewport.height * percentY / 100)
  };
}

// Convert pixels to percentage
function pixelsToPercent(pixelX, pixelY, viewport) {
  return {
    x: Math.round(pixelX / viewport.width * 100),
    y: Math.round(pixelY / viewport.height * 100)
  };
}

// ============================================
// Key Utilities
// ============================================

const KEY_MAP = {
  'CTRL': 'Control',
  'CONTROL': 'Control',
  'CMD': 'Meta',
  'META': 'Meta',
  'COMMAND': 'Meta',
  'ENTER': 'Enter',
  'RETURN': 'Enter',
  'TAB': 'Tab',
  'ESCAPE': 'Escape',
  'ESC': 'Escape',
  'BACKSPACE': 'Backspace',
  'DELETE': 'Delete',
  'DEL': 'Delete',
  'ARROWUP': 'ArrowUp',
  'UP': 'ArrowUp',
  'ARROWDOWN': 'ArrowDown',
  'DOWN': 'ArrowDown',
  'ARROWLEFT': 'ArrowLeft',
  'LEFT': 'ArrowLeft',
  'ARROWRIGHT': 'ArrowRight',
  'RIGHT': 'ArrowRight',
  'HOME': 'Home',
  'END': 'End',
  'PAGEUP': 'PageUp',
  'PAGEDOWN': 'PageDown',
  'SPACE': ' ',
  ' ': ' '
};

function normalizeKey(key) {
  const upper = key.toUpperCase();
  return KEY_MAP[upper] || key;
}

function isModifierKey(key) {
  const normalized = normalizeKey(key);
  return ['Control', 'Alt', 'Shift', 'Meta'].includes(normalized);
}

function parseKeyCombo(combo) {
  const parts = combo.split('+').map(k => k.trim());
  const modifiers = [];
  let key = '';
  
  parts.forEach(part => {
    const normalized = normalizeKey(part);
    if (isModifierKey(normalized)) {
      modifiers.push(normalized);
    } else {
      key = normalized;
    }
  });
  
  return { modifiers, key };
}

// ============================================
// Timing Utilities
// ============================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function debounce(fn, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

function throttle(fn, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ============================================
// String Utilities
// ============================================

function truncate(str, length = 100) {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function stripHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || '';
}

// ============================================
// Formatting Utilities
// ============================================

function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function formatTime(date = new Date()) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// ============================================
// Validation Utilities
// ============================================

function isValidUrl(str) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

function isValidEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

function isValidSelector(str) {
  try {
    document.querySelector(str);
    return true;
  } catch {
    return false;
  }
}

// ============================================
// Storage Utilities
// ============================================

async function getStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(keys, resolve);
  });
}

async function setStorage(items) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(items, resolve);
  });
}

async function removeStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.sync.remove(keys, resolve);
  });
}

// ============================================
// Export
// ============================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // DOM
    waitForElement,
    waitForDomSettle,
    isElementVisible,
    getElementAtCoordinates,
    getElementInfo,
    generateSelector,
    
    // Actions
    humanType,
    humanClick,
    
    // Coordinates
    normalizeCoordinates,
    percentToPixels,
    pixelsToPercent,
    
    // Keys
    KEY_MAP,
    normalizeKey,
    isModifierKey,
    parseKeyCombo,
    
    // Timing
    sleep,
    randomBetween,
    debounce,
    throttle,
    
    // String
    truncate,
    escapeHtml,
    stripHtml,
    
    // Formatting
    formatNumber,
    formatBytes,
    formatDuration,
    formatTime,
    
    // Validation
    isValidUrl,
    isValidEmail,
    isValidSelector,
    
    // Storage
    getStorage,
    setStorage,
    removeStorage
  };
}
