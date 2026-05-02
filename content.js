// Browser Web Agent - Content Script
// Executes actions on the page and captures screenshots

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'executeAction':
      executeComputerAction(message.computerAction).then(sendResponse);
      return true;

    case 'performAction':
      executeComputerAction(message.computerAction).then(sendResponse);
      return true;

    case 'getPageInfo':
      sendResponse(getPageInfo());
      return true;
  }
});

// Execute computer action
async function executeComputerAction(action) {
  const actionType = action.action;
  let result = { success: true, action: actionType };

  try {
    switch (actionType) {
      case 'screenshot':
        result = { success: true, action: 'screenshot' };
        break;

      case 'left_click':
      case 'right_click':
      case 'middle_click':
      case 'double_click':
      case 'triple_click':
        result = await performClick(action);
        break;

      case 'type':
        result = await performType(action);
        break;

      case 'key':
      case 'keypress':
        result = await performKeyPress(action);
        break;

      case 'scroll':
        result = await performScroll(action);
        break;

      case 'left_click_drag':
        result = await performDrag(action);
        break;

      case 'cursor_position':
        result = await getCursorPosition();
        break;

      default:
        result = { error: `Unknown action: ${actionType}` };
    }
  } catch (error) {
    result = { error: error.message, success: false };
  }

  return result;
}

// Map button names
const buttonMap = {
  'left_click': 0,
  'right_click': 2,
  'middle_click': 1,
  'double_click': 0,
  'triple_click': 0
};

// Perform click action
async function performClick(action) {
  const coordinates = action.coordinate || action.coordinates;
  const button = buttonMap[action.action] || 0;
  
  if (!coordinates || coordinates.length < 2) {
    return { error: 'Missing coordinates for click' };
  }

  const [x, y] = coordinates;
  const element = document.elementFromPoint(x, y);
  
  if (element) {
    const clientX = x;
    const clientY = y;

    const mouseDownEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      button: button
    });

    const mouseUpEvent = new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      button: button
    });

    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      button: button
    });

    element.dispatchEvent(mouseDownEvent);
    await sleep(50);
    element.dispatchEvent(mouseUpEvent);
    await sleep(50);
    
    if (action.action === 'double_click') {
      element.dispatchEvent(clickEvent);
      await sleep(50);
      element.dispatchEvent(new MouseEvent('dblclick', {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
        button: button
      }));
    } else {
      element.dispatchEvent(clickEvent);
    }

    if (element.focus && typeof element.focus === 'function') {
      element.focus();
    }
  }

  return { success: true, action: action.action, coordinates: [x, y] };
}

// Perform type action
async function performType(action) {
  const text = action.text;
  
  if (!text) {
    return { error: 'Missing text for type action' };
  }

  for (const char of text) {
    const keydownEvent = new KeyboardEvent('keydown', {
      key: char,
      bubbles: true,
      cancelable: true
    });

    const keypressEvent = new KeyboardEvent('keypress', {
      key: char,
      bubbles: true,
      cancelable: true
    });

    const inputEvent = new InputEvent('input', {
      data: char,
      bubbles: true,
      cancelable: true
    });

    document.activeElement?.dispatchEvent(keydownEvent);
    document.activeElement?.dispatchEvent(keypressEvent);
    
    if (document.activeElement && 'value' in document.activeElement) {
      document.activeElement.value += char;
      document.activeElement.dispatchEvent(inputEvent);
    } else {
      document.execCommand('insertText', false, char);
    }

    await sleep(20 + Math.random() * 30);
  }

  return { success: true, action: 'type', textLength: text.length };
}

const keyMap = {
  'CTRL': 'Control',
  'CONTROL': 'Control',
  'CMD': 'Meta',
  'META': 'Meta',
  'ENTER': 'Enter',
  'RETURN': 'Enter',
  'TAB': 'Tab',
  'ESCAPE': 'Escape',
  'ESC': 'Escape',
  'BACKSPACE': 'Backspace',
  'DELETE': 'Delete',
  'ARROW_UP': 'ArrowUp',
  'ARROW_DOWN': 'ArrowDown',
  'ARROW_LEFT': 'ArrowLeft',
  'ARROW_RIGHT': 'ArrowRight',
  'UP': 'ArrowUp',
  'DOWN': 'ArrowDown',
  'LEFT': 'ArrowLeft',
  'RIGHT': 'ArrowRight',
  'SPACE': ' ',
  'SHIFT': 'Shift',
  'ALT': 'Alt'
};

async function performKeyPress(action) {
  let key = action.text || action.key;
  key = keyMap[key.toUpperCase()] || key;

  const keyboardEventInit = {
    key,
    bubbles: true,
    cancelable: true
  };

  const keydownEvent = new KeyboardEvent('keydown', keyboardEventInit);
  const keyupEvent = new KeyboardEvent('keyup', keyboardEventInit);

  document.activeElement?.dispatchEvent(keydownEvent);
  await sleep(50);
  document.activeElement?.dispatchEvent(keyupEvent);

  if (key === 'Enter') {
    document.activeElement?.dispatchEvent(new Event('submit', { bubbles: true }));
  }

  return { success: true, action: 'key', key };
}

async function performScroll(action) {
  const direction = (action.scroll_direction || action.direction || 'down').toLowerCase();
  const amount = action.scroll_amount || action.amount || 1;
  const deltaMultiplier = 100;
  let deltaX = 0;
  let deltaY = 0;

  switch (direction) {
    case 'up': deltaY = -amount * deltaMultiplier; break;
    case 'down': deltaY = amount * deltaMultiplier; break;
    case 'left': deltaX = -amount * deltaMultiplier; break;
    case 'right': deltaX = amount * deltaMultiplier; break;
  }

  const wheelEvent = new WheelEvent('wheel', {
    deltaX,
    deltaY,
    bubbles: true,
    cancelable: true
  });

  document.dispatchEvent(wheelEvent);
  window.scrollBy(deltaX, deltaY);

  return { success: true, action: 'scroll', direction, amount };
}

async function performDrag(action) {
  const endCoordinates = action.coordinate || action.coordinates;
  if (!endCoordinates || endCoordinates.length < 2) {
    return { error: 'Missing end coordinates for drag' };
  }

  const [endX, endY] = endCoordinates;
  const startX = action.startX || window.innerWidth / 2;
  const startY = action.startY || window.innerHeight / 2;
  const startElement = document.elementFromPoint(startX, startY);
  const endElement = document.elementFromPoint(endX, endY);

  if (startElement) {
    const mouseDown = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: startX,
      clientY: startY
    });

    const mouseMove = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: endX,
      clientY: endY
    });

    const mouseUp = new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true,
      clientX: endX,
      clientY: endY
    });

    startElement.dispatchEvent(mouseDown);
    await sleep(100);
    document.dispatchEvent(mouseMove);
    await sleep(100);
    endElement?.dispatchEvent(mouseUp);
  }

  return { success: true, action: 'drag', from: [startX, startY], to: [endX, endY] };
}

async function getCursorPosition() {
  return {
    success: true,
    position: [window.innerWidth / 2, window.innerHeight / 2]
  };
}

function getPageInfo() {
  return {
    url: window.location.href,
    title: document.title,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    }
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let indicatorElement = null;

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'showIndicator') {
    showAgentIndicator();
  } else if (message.action === 'hideIndicator') {
    hideAgentIndicator();
  }
});

function showAgentIndicator() {
  if (indicatorElement) return;
  
  indicatorElement = document.createElement('div');
  indicatorElement.innerHTML = `
    <div style="
      position: fixed;
      top: 10px;
      right: 10px;
      background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      font-weight: 600;
      z-index: 2147483647;
      box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
      display: flex;
      align-items: center;
      gap: 8px;
    ">
      <span style="animation: pulse 1.5s infinite;">●</span>
      <span>ELF Active</span>
    </div>
    <style>
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    </style>
  `;
  document.body.appendChild(indicatorElement);
}

function hideAgentIndicator() {
  if (indicatorElement) {
    indicatorElement.remove();
    indicatorElement = null;
  }
}
