let indicatorElement = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'executeAction':
    case 'performAction':
      executeComputerAction(message.computerAction).then(sendResponse);
      return true;
    case 'getPageInfo':
      sendResponse(getPageInfo());
      return true;
    case 'showIndicator':
      showAgentIndicator();
      sendResponse?.({ success: true });
      break;
    case 'hideIndicator':
      hideAgentIndicator();
      sendResponse?.({ success: true });
      break;
  }
});

async function executeComputerAction(action) {
  const actionType = action.action;

  try {
    switch (actionType) {
      case 'screenshot':
        return { success: true, action: 'screenshot' };
      case 'left_click':
      case 'right_click':
      case 'middle_click':
      case 'double_click':
      case 'triple_click':
        return await performClick(action);
      case 'type':
        return await performType(action);
      case 'key':
      case 'keypress':
        return await performKeyPress(action);
      case 'scroll':
        return await performScroll(action);
      case 'left_click_drag':
      case 'drag':
        return await performDrag(action);
      case 'cursor_position':
        return await getCursorPosition();
      default:
        return { error: `Unknown action: ${actionType}`, success: false };
    }
  } catch (error) {
    return { error: error.message, success: false };
  }
}

const buttonMap = {
  left_click: 0,
  right_click: 2,
  middle_click: 1,
  double_click: 0,
  triple_click: 0,
};

const keyMap = {
  CTRL: 'Control',
  CONTROL: 'Control',
  CMD: 'Meta',
  META: 'Meta',
  ENTER: 'Enter',
  RETURN: 'Enter',
  TAB: 'Tab',
  ESCAPE: 'Escape',
  ESC: 'Escape',
  BACKSPACE: 'Backspace',
  DELETE: 'Delete',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  UP: 'ArrowUp',
  DOWN: 'ArrowDown',
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
  SPACE: ' ',
  SHIFT: 'Shift',
  ALT: 'Alt',
};

function normalizeKey(key) {
  if (!key) return '';
  const upper = String(key).toUpperCase();
  return keyMap[upper] || key;
}

function isEditableElement(el) {
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    el.isContentEditable ||
    el.getAttribute?.('role') === 'textbox'
  );
}

function findInteractiveAncestor(el) {
  if (!el) return null;
  return el.closest?.('button,a,input,textarea,select,[contenteditable="true"],[role="button"],[role="textbox"],[role="link"]') || el;
}

function findScrollableAncestor(el) {
  let current = el;
  while (current && current !== document.body && current !== document.documentElement) {
    const style = getComputedStyle(current);
    const overflowY = style.overflowY;
    const overflowX = style.overflowX;
    const scrollableY = /(auto|scroll|overlay)/.test(overflowY) && current.scrollHeight > current.clientHeight;
    const scrollableX = /(auto|scroll|overlay)/.test(overflowX) && current.scrollWidth > current.clientWidth;
    if (scrollableY || scrollableX) return current;
    current = current.parentElement;
  }
  return document.scrollingElement || document.documentElement;
}

function getTargetAtPoint(x, y) {
  const raw = document.elementFromPoint(x, y);
  return findInteractiveAncestor(raw);
}

function getActiveEditableTarget() {
  const active = document.activeElement;
  if (isEditableElement(active)) return active;
  return null;
}

function setNativeValue(element, value) {
  const tag = element.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea') {
    const prototype = tag === 'input' ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    descriptor?.set?.call(element, value);
  } else if (element.isContentEditable) {
    element.textContent = value;
  }
}

function dispatchInputEvents(element) {
  element.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText' }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function pressKeyOnTarget(target, key, options = {}) {
  const eventInit = {
    key,
    bubbles: true,
    cancelable: true,
    code: options.code || key,
    ctrlKey: !!options.ctrlKey,
    altKey: !!options.altKey,
    shiftKey: !!options.shiftKey,
    metaKey: !!options.metaKey,
  };
  target.dispatchEvent(new KeyboardEvent('keydown', eventInit));
  target.dispatchEvent(new KeyboardEvent('keyup', eventInit));
}

async function performClick(action) {
  const coordinates = action.coordinate || action.coordinates;
  const button = buttonMap[action.action] ?? 0;

  if (!coordinates || coordinates.length < 2) {
    return { error: 'Missing coordinates for click', success: false };
  }

  const [x, y] = coordinates;
  const element = getTargetAtPoint(x, y);
  if (!element) {
    return { error: 'No clickable element found at coordinates', success: false };
  }

  const clientX = Math.max(0, Math.floor(x));
  const clientY = Math.max(0, Math.floor(y));

  const pointerDown = new PointerEvent('pointerdown', {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true,
    button,
  });

  const mouseDown = new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
    button,
  });

  const pointerUp = new PointerEvent('pointerup', {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true,
    button,
  });

  const mouseUp = new MouseEvent('mouseup', {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
    button,
  });

  const click = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
    button,
  });

  element.dispatchEvent(pointerDown);
  element.dispatchEvent(mouseDown);
  await sleep(40);
  element.dispatchEvent(pointerUp);
  element.dispatchEvent(mouseUp);
  await sleep(40);

  if (action.action === 'double_click') {
    element.dispatchEvent(click);
    await sleep(30);
    element.dispatchEvent(new MouseEvent('dblclick', {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      button,
    }));
  } else {
    element.dispatchEvent(click);
  }

  if (typeof element.focus === 'function') {
    element.focus({ preventScroll: true });
  }

  if (typeof element.click === 'function' && /^(button|a|input|summary)$/i.test(element.tagName || '')) {
    element.click();
  }

  return { success: true, action: action.action, coordinates: [x, y] };
}

async function performType(action) {
  const text = action.text ?? '';
  if (!text) {
    return { error: 'Missing text for type action', success: false };
  }

  let target = getActiveEditableTarget();
  if (!target && action.coordinate && action.coordinate.length >= 2) {
    target = getTargetAtPoint(action.coordinate[0], action.coordinate[1]);
  }

  if (!target) {
    return { error: 'No text field is focused', success: false };
  }

  if (typeof target.focus === 'function') {
    target.focus({ preventScroll: true });
  }

  const tag = target.tagName?.toLowerCase();
  const isInputLike = tag === 'input' || tag === 'textarea';

  for (const char of String(text)) {
    if (char === '\n') {
      pressKeyOnTarget(target, 'Enter');
      continue;
    }

    if (isInputLike) {
      const value = target.value ?? '';
      const start = typeof target.selectionStart === 'number' ? target.selectionStart : value.length;
      const end = typeof target.selectionEnd === 'number' ? target.selectionEnd : value.length;
      const nextValue = value.slice(0, start) + char + value.slice(end);
      setNativeValue(target, nextValue);

      const pos = start + 1;
      if (typeof target.setSelectionRange === 'function') {
        target.setSelectionRange(pos, pos);
      }
      dispatchInputEvents(target);
    } else if (target.isContentEditable) {
      document.execCommand('insertText', false, char);
      target.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: char }));
    } else {
      document.execCommand('insertText', false, char);
    }

    await sleep(15 + Math.random() * 25);
  }

  target.dispatchEvent(new Event('change', { bubbles: true }));
  return { success: true, action: 'type', textLength: text.length };
}

async function performKeyPress(action) {
  const key = normalizeKey(action.text || action.key);
  if (!key) {
    return { error: 'Missing key name', success: false };
  }

  const target = document.activeElement || document.body;
  if (typeof target.focus === 'function') {
    target.focus({ preventScroll: true });
  }

  pressKeyOnTarget(target, key);

  if (key === 'Enter') {
    const form = target?.form || target?.closest?.('form') || document.activeElement?.form || document.activeElement?.closest?.('form');
    if (form) {
      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit();
      } else {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    } else {
      const submitButton = document.querySelector('button[type="submit"], input[type="submit"]');
      submitButton?.click();
    }
  }

  return { success: true, action: 'key', key };
}

async function performScroll(action) {
  const direction = String(action.scroll_direction || action.direction || 'down').toLowerCase();
  const amount = Number(action.scroll_amount || action.amount || 1);
  const multiplier = 100;
  let deltaX = 0;
  let deltaY = 0;

  switch (direction) {
    case 'up':
      deltaY = -amount * multiplier;
      break;
    case 'down':
      deltaY = amount * multiplier;
      break;
    case 'left':
      deltaX = -amount * multiplier;
      break;
    case 'right':
      deltaX = amount * multiplier;
      break;
  }

  const point = action.coordinate || action.coordinates;
  const target = point && point.length >= 2 ? findScrollableAncestor(getTargetAtPoint(point[0], point[1])) : findScrollableAncestor(document.activeElement);

  const wheelEvent = new WheelEvent('wheel', {
    deltaX,
    deltaY,
    bubbles: true,
    cancelable: true,
  });

  target.dispatchEvent(wheelEvent);

  if (target === document.scrollingElement || target === document.documentElement || target === document.body) {
    window.scrollBy({ left: deltaX, top: deltaY, behavior: 'instant' });
  } else {
    target.scrollBy({ left: deltaX, top: deltaY, behavior: 'instant' });
  }

  return { success: true, action: 'scroll', direction, amount };
}

async function performDrag(action) {
  const endCoordinates = action.coordinate || action.coordinates;
  if (!endCoordinates || endCoordinates.length < 2) {
    return { error: 'Missing end coordinates for drag', success: false };
  }

  const [endX, endY] = endCoordinates;
  const startX = action.startX ?? Math.round(window.innerWidth / 2);
  const startY = action.startY ?? Math.round(window.innerHeight / 2);
  const startEl = getTargetAtPoint(startX, startY) || document.body;
  const endEl = getTargetAtPoint(endX, endY) || document.body;
  const dataTransfer = new DataTransfer();

  const dispatch = (target, event) => target.dispatchEvent(event);

  dispatch(startEl, new PointerEvent('pointerdown', {
    bubbles: true,
    cancelable: true,
    clientX: startX,
    clientY: startY,
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true,
  }));
  dispatch(startEl, new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    clientX: startX,
    clientY: startY,
  }));
  dispatch(startEl, new DragEvent('dragstart', {
    bubbles: true,
    cancelable: true,
    clientX: startX,
    clientY: startY,
    dataTransfer,
  }));

  await sleep(80);

  dispatch(endEl, new PointerEvent('pointermove', {
    bubbles: true,
    cancelable: true,
    clientX: endX,
    clientY: endY,
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true,
  }));
  dispatch(endEl, new MouseEvent('mousemove', {
    bubbles: true,
    cancelable: true,
    clientX: endX,
    clientY: endY,
  }));
  dispatch(endEl, new DragEvent('dragover', {
    bubbles: true,
    cancelable: true,
    clientX: endX,
    clientY: endY,
    dataTransfer,
  }));
  dispatch(endEl, new DragEvent('drop', {
    bubbles: true,
    cancelable: true,
    clientX: endX,
    clientY: endY,
    dataTransfer,
  }));
  dispatch(endEl, new PointerEvent('pointerup', {
    bubbles: true,
    cancelable: true,
    clientX: endX,
    clientY: endY,
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true,
  }));
  dispatch(endEl, new MouseEvent('mouseup', {
    bubbles: true,
    cancelable: true,
    clientX: endX,
    clientY: endY,
  }));
  dispatch(startEl, new DragEvent('dragend', {
    bubbles: true,
    cancelable: true,
    clientX: endX,
    clientY: endY,
    dataTransfer,
  }));

  return { success: true, action: 'drag', from: [startX, startY], to: [endX, endY] };
}

async function getCursorPosition() {
  return {
    success: true,
    position: [Math.round(window.innerWidth / 2), Math.round(window.innerHeight / 2)],
  };
}

function getPageInfo() {
  return {
    url: window.location.href,
    title: document.title,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    activeElement: document.activeElement?.tagName?.toLowerCase() || null,
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
  if (!indicatorElement) return;
  indicatorElement.remove();
  indicatorElement = null;
}
