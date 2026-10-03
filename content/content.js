/**
 * HDCursor - Content Script & Global Shield Injector
 * Phantom Cursor & Navigation Controller
 */

(function () {
  'use strict';

  // Prevent multiple injections per execution realm
  if (typeof globalThis !== 'undefined' && globalThis.__HDCURSOR_INJECTED__) return;
  if (typeof globalThis !== 'undefined') globalThis.__HDCURSOR_INJECTED__ = true;

  const extApi = typeof browser !== 'undefined' ? browser : (typeof chrome !== 'undefined' ? chrome : null);

  // Safe reference resolution across isolated world environments
  const defaults = (typeof HDCursorDefaults !== 'undefined' ? HDCursorDefaults : null) ||
    (typeof globalThis !== 'undefined' ? globalThis.HDCursorDefaults : null) ||
    (typeof window !== 'undefined' ? window.HDCursorDefaults : null);

  const storage = (typeof HDCursorStorage !== 'undefined' ? HDCursorStorage : null) ||
    (typeof globalThis !== 'undefined' ? globalThis.HDCursorStorage : null) ||
    (typeof window !== 'undefined' ? window.HDCursorStorage : null);

  // Built-in resilient fallbacks in case helper scripts load in a restricted context
  const FALLBACK_MODIFIERS_ORDER = ['Ctrl', 'Alt', 'Shift', 'Meta'];

  const FALLBACK_MOUSE_BUTTON_MAP = {
    0: { code: 'MouseLeft', label: 'Left Click' },
    1: { code: 'MouseMiddle', label: 'Middle Click' },
    2: { code: 'MouseRight', label: 'Right Click' },
    3: { code: 'Mouse4', label: 'Mouse 4' },
    4: { code: 'Mouse5', label: 'Mouse 5' }
  };

  const mouseButtonMap = (defaults && defaults.MOUSE_BUTTON_MAP) || FALLBACK_MOUSE_BUTTON_MAP;

  function normalizeModifiers(modifiers) {
    if (defaults && typeof defaults.normalizeModifiers === 'function') {
      return defaults.normalizeModifiers(modifiers);
    }
    if (!Array.isArray(modifiers)) return [];
    return FALLBACK_MODIFIERS_ORDER.filter(m => modifiers.includes(m));
  }

  function getBindingSignature(binding) {
    if (!binding) return '';
    if (defaults && typeof defaults.getBindingSignature === 'function') {
      return defaults.getBindingSignature(binding);
    }
    const mods = normalizeModifiers(binding.modifiers);
    const trigger = binding.triggerCode || '';
    return [...mods, trigger].join('+');
  }

  const DEFAULT_FALLBACK_SETTINGS = {
    isNeutralized: false,
    pointerLockEnabled: false,
    allowWheelScroll: true,
    bindings: {
      toggle_cursor: {
        modifiers: ['Shift'],
        triggerType: 'mouse',
        triggerCode: 'Mouse4',
        button: 3,
        key: null,
        displayName: 'Shift + Mouse 4'
      },
      prev_tab: {
        modifiers: [],
        triggerType: 'mouse',
        triggerCode: 'Mouse4',
        button: 3,
        key: null,
        displayName: 'Mouse 4'
      },
      next_tab: {
        modifiers: [],
        triggerType: 'mouse',
        triggerCode: 'Mouse5',
        button: 4,
        key: null,
        displayName: 'Mouse 5'
      }
    }
  };

  // Local state cache
  let currentSettings = defaults ? JSON.parse(JSON.stringify(defaults.DEFAULT_SETTINGS)) : JSON.parse(JSON.stringify(DEFAULT_FALLBACK_SETTINGS));

  // Track buttons whose default actions (e.g. Firefox Mouse 4/5 history navigation) are currently suppressed
  const suppressedButtons = new Set();

  // Action debouncing to prevent double execution if both pointerdown and mousedown/auxclick fire
  let lastActionTime = 0;
  let lastActionId = null;

  // Shield DOM Elements
  let shieldElement = null;
  let dynamicStyleElement = null;
  let isPointerLocked = false;

  console.log('%c[HDCursor]%c Content script v1.0.2 active on: ' + window.location.href, 'color: #99F4D1; font-weight: bold;', 'color: #CCFFFF;');
  console.log('[HDCursor] Initial bindings configuration:', currentSettings.bindings);

  /**
   * Inject or update global CSS rules to neutralize cursor
   */
  function applyGlobalCursorCSS(active) {
    if (active) {
      if (!dynamicStyleElement) {
        dynamicStyleElement = document.createElement('style');
        dynamicStyleElement.id = 'hdcursor-injected-style';
        dynamicStyleElement.textContent = `
          * {
            cursor: none !important;
          }
        `;
      }
      if (!dynamicStyleElement.parentNode && document.documentElement) {
        document.documentElement.appendChild(dynamicStyleElement);
      }
      if (document.documentElement) {
        document.documentElement.setAttribute('data-hdcursor-neutralized', 'true');
      }
    } else {
      if (dynamicStyleElement && dynamicStyleElement.parentNode) {
        dynamicStyleElement.parentNode.removeChild(dynamicStyleElement);
      }
      if (document.documentElement) {
        document.documentElement.removeAttribute('data-hdcursor-neutralized');
      }
    }
  }

  /**
   * Locate the appropriate element to scroll under the mouse position
   */
  function findScrollTarget(glassEl, clientX, clientY, deltaX, deltaY) {
    if (typeof document.elementsFromPoint === 'function') {
      const elements = document.elementsFromPoint(clientX, clientY);
      for (const el of elements) {
        if (!el || el === shieldElement || el.tagName === 'HDCURSOR-SHIELD' || el.id === 'hdcursor-shield-container') continue;
        if (el === document.documentElement || el === document.body) continue;

        try {
          const cs = window.getComputedStyle(el);
          const canY = (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
          const canX = (cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth;
          if ((canY && deltaY !== 0) || (canX && deltaX !== 0)) {
            return el;
          }
        } catch (_) {}
      }
    }

    return document.scrollingElement || document.documentElement || document.body || window;
  }

  /**
   * Create or retrieve the Shadow DOM shield overlay
   */
  function getOrCreateShield() {
    if (shieldElement) return shieldElement;

    shieldElement = document.createElement('hdcursor-shield');
    shieldElement.setAttribute('id', 'hdcursor-shield-container');
    shieldElement.setAttribute('aria-hidden', 'true');
    shieldElement.setAttribute('tabindex', '-1');

    const shadow = shieldElement.attachShadow({ mode: 'open' });
    const shadowStyle = document.createElement('style');
    shadowStyle.textContent = `
      :host {
        display: block !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 2147483647 !important;
        pointer-events: all !important;
        cursor: none !important;
        background: transparent !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        touch-action: none !important;
        outline: none !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
      }
      #glass {
        width: 100%;
        height: 100%;
        cursor: none !important;
        pointer-events: all !important;
        background: transparent !important;
      }
    `;

    const glass = document.createElement('div');
    glass.id = 'glass';
    glass.setAttribute('aria-hidden', 'true');

    // Handle mouse wheel scrolling smoothly on all web pages
    glass.addEventListener('wheel', (e) => {
      if (currentSettings.allowWheelScroll) {
        const lineMultiplier = 28;
        let deltaY = e.deltaY;
        let deltaX = e.deltaX;

        if (e.deltaMode === 1) { // DOM_DELTA_LINE
          deltaY *= lineMultiplier;
          deltaX *= lineMultiplier;
        } else if (e.deltaMode === 2) { // DOM_DELTA_PAGE
          deltaY *= window.innerHeight;
          deltaX *= window.innerWidth;
        }

        const scrollTarget = findScrollTarget(glass, e.clientX, e.clientY, deltaX, deltaY);
        if (scrollTarget && typeof scrollTarget.scrollBy === 'function') {
          scrollTarget.scrollBy({
            top: deltaY,
            left: deltaX,
            behavior: 'instant'
          });
        } else {
          window.scrollBy({
            top: deltaY,
            left: deltaX,
            behavior: 'instant'
          });
        }
      }

      e.preventDefault();
      e.stopPropagation();
    }, { capture: true, passive: false });

    // Also attach direct mouse interaction handlers inside the Shadow DOM
    const glassOpts = { capture: true, passive: false };
    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'auxclick', 'click', 'contextmenu'].forEach(evtType => {
      glass.addEventListener(evtType, handleMouseEvent, glassOpts);
    });

    shadow.appendChild(shadowStyle);
    shadow.appendChild(glass);

    return shieldElement;
  }

  /**
   * Mount or unmount the shield overlay on the document
   */
  function syncShieldDOM(active) {
    const shield = getOrCreateShield();

    if (active) {
      shield.removeAttribute('hidden');
      if (!shield.parentNode && document.documentElement) {
        document.documentElement.appendChild(shield);
      }
    } else {
      shield.setAttribute('hidden', '');
      if (shield.parentNode) {
        shield.parentNode.removeChild(shield);
      }
    }
  }

  /**
   * Synchronize all shield layers and hardware pointer lock
   */
  function updateShieldState(isNeutralized, triggerPointerLock = false) {
    applyGlobalCursorCSS(isNeutralized);
    syncShieldDOM(isNeutralized);

    if (isNeutralized) {
      if (currentSettings.pointerLockEnabled && triggerPointerLock) {
        requestHardwarePointerLock();
      }
    } else {
      if (isPointerLocked || document.pointerLockElement) {
        exitHardwarePointerLock();
      }
    }
  }

  /**
   * Request hardware pointer lock via standard Pointer Lock API
   */
  function requestHardwarePointerLock() {
    try {
      if (document.documentElement && document.documentElement.requestPointerLock) {
        const promise = document.documentElement.requestPointerLock();
        if (promise && promise.catch) {
          promise.catch(err => {
            console.debug('[HDCursor] Pointer lock request rejected:', err);
          });
        }
      }
    } catch (err) {
      console.debug('[HDCursor] Pointer lock invocation error:', err);
    }
  }

  /**
   * Exit hardware pointer lock
   */
  function exitHardwarePointerLock() {
    try {
      if (document.exitPointerLock && document.pointerLockElement) {
        document.exitPointerLock();
      }
    } catch (err) {
      console.debug('[HDCursor] Pointer lock exit error:', err);
    }
  }

  // Pointer lock change listeners
  document.addEventListener('pointerlockchange', () => {
    isPointerLocked = !!document.pointerLockElement;
  });

  document.addEventListener('pointerlockerror', () => {
    isPointerLocked = false;
  });

  // Re-attach elements if host page DOM tree is mutated
  const observer = new MutationObserver(() => {
    if (currentSettings.isNeutralized) {
      if (dynamicStyleElement && !dynamicStyleElement.parentNode && document.documentElement) {
        document.documentElement.appendChild(dynamicStyleElement);
      }
      if (shieldElement && !shieldElement.parentNode && document.documentElement) {
        document.documentElement.appendChild(shieldElement);
      }
      if (document.documentElement && !document.documentElement.hasAttribute('data-hdcursor-neutralized')) {
        document.documentElement.setAttribute('data-hdcursor-neutralized', 'true');
      }
    }
  });

  if (document.documentElement) {
    observer.observe(document.documentElement, { childList: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.documentElement) {
        observer.observe(document.documentElement, { childList: true });
      }
    });
  }

  // =========================================================================
  // ACTION DISPATCHER & EVENT INTERCEPTION
  // =========================================================================

  /**
   * Extract active modifier list from any standard InputEvent/MouseEvent/KeyboardEvent
   */
  function getActiveModifiers(e) {
    const mods = [];
    if (e.ctrlKey) mods.push('Ctrl');
    if (e.altKey) mods.push('Alt');
    if (e.shiftKey) mods.push('Shift');
    if (e.metaKey) mods.push('Meta');
    return mods;
  }

  /**
   * Find matching action ID for given modifier combo and trigger code
   */
  function findMatchingAction(mods, triggerCode) {
    if (!currentSettings.bindings || !triggerCode) return null;

    const eventSig = getBindingSignature({ modifiers: mods, triggerCode });

    for (const [actionId, binding] of Object.entries(currentSettings.bindings)) {
      if (!binding || !binding.triggerCode) continue;
      const bindingSig = getBindingSignature(binding);
      if (eventSig === bindingSig) {
        return actionId;
      }
    }

    return null;
  }

  /**
   * Debounced action dispatcher
   */
  function dispatchMatchedAction(actionId, eventSource) {
    const now = Date.now();
    if (lastActionId === actionId && (now - lastActionTime) < 250) {
      console.log('[HDCursor] Debouncing duplicate dispatch for action:', actionId, 'from', eventSource);
      return;
    }

    lastActionTime = now;
    lastActionId = actionId;

    console.log(`%c[HDCursor EXECUTE]%c Action: "${actionId}" triggered by [${eventSource}]`,
      'color: #0E0E10; background: #99F4D1; font-weight: bold; padding: 2px 8px; border-radius: 4px;', 'color: #99F4D1; font-weight: bold;');

    executeAction(actionId);
  }

  /**
   * Execute dispatched action
   */
  function executeAction(actionId) {
    switch (actionId) {
      case 'toggle_cursor': {
        const nextState = !currentSettings.isNeutralized;
        currentSettings.isNeutralized = nextState;

        console.log('[HDCursor] Toggling local cursor shield to:', nextState ? 'ACTIVE' : 'INACTIVE');
        updateShieldState(nextState, true);

        if (extApi && extApi.runtime) {
          extApi.runtime.sendMessage({
            type: 'SET_NEUTRALIZED',
            state: nextState
          }).then(res => {
            console.log('[HDCursor] Background response for SET_NEUTRALIZED:', res);
          }).catch(err => {
            console.error('[HDCursor] Broadcast toggle error:', err);
          });
        }
        break;
      }

      case 'prev_tab': {
        console.log('[HDCursor] Sending NAVIGATE_TAB (prev) to background...');
        if (extApi && extApi.runtime) {
          extApi.runtime.sendMessage({
            type: 'NAVIGATE_TAB',
            direction: 'prev'
          }).then(res => {
            console.log('[HDCursor] Background response for NAVIGATE_TAB (prev):', res);
          }).catch(err => {
            console.error('[HDCursor] Tab prev message error:', err);
          });
        }
        break;
      }

      case 'next_tab': {
        console.log('[HDCursor] Sending NAVIGATE_TAB (next) to background...');
        if (extApi && extApi.runtime) {
          extApi.runtime.sendMessage({
            type: 'NAVIGATE_TAB',
            direction: 'next'
          }).then(res => {
            console.log('[HDCursor] Background response for NAVIGATE_TAB (next):', res);
          }).catch(err => {
            console.error('[HDCursor] Tab next message error:', err);
          });
        }
        break;
      }

      default:
        console.warn('[HDCursor] Unhandled action ID:', actionId);
    }
  }

  /**
   * Unified mouse event handler capturing pointerdown, mousedown, mouseup, auxclick, etc.
   */
  function handleMouseEvent(e) {
    const buttonMap = mouseButtonMap[e.button];
    const mods = getActiveModifiers(e);

    // Debug logging for mouse buttons (especially Mouse 3, 4, 5, or with modifiers)
    if (e.button === 3 || e.button === 4 || e.button === 1 || e.shiftKey || e.ctrlKey || e.altKey) {
      console.log(`%c[HDCursor MOUSE]%c ${e.type} | button: ${e.button} (${buttonMap ? buttonMap.code : 'unknown'}) | buttons: ${e.buttons} | mods: [${mods.join(', ')}]`,
        'color: #99F4D1; font-weight: bold;', 'color: #F4F4F5;');
    }

    if (!buttonMap) return;

    const triggerCode = buttonMap.code;
    const matchedAction = findMatchingAction(mods, triggerCode);

    if (matchedAction) {
      console.log(`%c[HDCursor MATCH]%c Button [${triggerCode}] matched action: "${matchedAction}" on event [${e.type}]`,
        'color: #0E0E10; background: #CCFFFF; font-weight: bold; padding: 2px 6px; border-radius: 4px;', 'color: #CCFFFF; font-weight: bold;');

      suppressedButtons.add(e.button);

      // Cleanly prevent browser default action (e.g. Mouse 4/5 history navigation)
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      // Trigger action on first available down/click event
      if (e.type === 'pointerdown' || e.type === 'mousedown' || e.type === 'auxclick') {
        dispatchMatchedAction(matchedAction, e.type);
      }
      return;
    }

    // If this button was registered as part of an active shortcut, suppress subsequent release events
    if (suppressedButtons.has(e.button)) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      if (e.type === 'auxclick' || e.type === 'mouseup') {
        setTimeout(() => {
          suppressedButtons.delete(e.button);
        }, 80);
      }
      return;
    }

    // If cursor is neutralized, block any accidental mouse interaction on page content
    if (currentSettings.isNeutralized) {
      e.stopPropagation();
    }
  }

  /**
   * Capture keyboard interactions
   */
  function onKeyDown(e) {
    // Ignore isolated modifier presses
    if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) {
      return;
    }

    const mods = getActiveModifiers(e);
    const triggerCode = e.code;

    if (mods.length > 0 || triggerCode.startsWith('F') || triggerCode === 'Escape') {
      console.log(`%c[HDCursor KEY]%c code: ${triggerCode} | key: ${e.key} | mods: [${mods.join(', ')}]`,
        'color: #99F4D1; font-weight: bold;', 'color: #F4F4F5;');
    }

    const matchedAction = findMatchingAction(mods, triggerCode);

    if (matchedAction) {
      console.log(`%c[HDCursor MATCH]%c Key [${triggerCode}] matched action: "${matchedAction}"`,
        'color: #0E0E10; background: #CCFFFF; font-weight: bold; padding: 2px 6px; border-radius: 4px;', 'color: #CCFFFF; font-weight: bold;');

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      dispatchMatchedAction(matchedAction, 'keydown');
    }
  }

  // Register capture phase listeners on both window and document to guarantee preemption
  const captureOpts = { capture: true, passive: false };

  [window, document].forEach(target => {
    target.addEventListener('pointerdown', handleMouseEvent, captureOpts);
    target.addEventListener('mousedown', handleMouseEvent, captureOpts);
    target.addEventListener('pointerup', handleMouseEvent, captureOpts);
    target.addEventListener('mouseup', handleMouseEvent, captureOpts);
    target.addEventListener('auxclick', handleMouseEvent, captureOpts);
    target.addEventListener('click', handleMouseEvent, captureOpts);
    target.addEventListener('contextmenu', handleMouseEvent, captureOpts);
    target.addEventListener('keydown', onKeyDown, captureOpts);
  });

  // When neutralized, neutralize hover/move triggers from reaching web elements
  window.addEventListener('mousemove', (e) => {
    if (currentSettings.isNeutralized) {
      e.stopPropagation();
    }
  }, captureOpts);

  window.addEventListener('mouseover', (e) => {
    if (currentSettings.isNeutralized) {
      e.stopPropagation();
    }
  }, captureOpts);

  // =========================================================================
  // STATE SYNCHRONIZATION
  // =========================================================================

  /**
   * Update internal state and reflect in DOM
   */
  function applyState(isNeutralized, pointerLockEnabled) {
    currentSettings.isNeutralized = Boolean(isNeutralized);
    if (typeof pointerLockEnabled === 'boolean') {
      currentSettings.pointerLockEnabled = pointerLockEnabled;
    }
    updateShieldState(currentSettings.isNeutralized, false);
  }

  // Listen for runtime broadcasts from background script
  if (extApi && extApi.runtime && extApi.runtime.onMessage) {
    extApi.runtime.onMessage.addListener((message) => {
      if (!message) return;

      if (message.type === 'SYNC_STATE') {
        console.log('[HDCursor] Received SYNC_STATE broadcast:', message);
        applyState(message.isNeutralized, message.pointerLockEnabled);
      }
    });
  }

  // Handle storage changes safely
  function handleStorageChange(changes, areaName) {
    if (areaName !== 'local') return;

    if (changes.isNeutralized) {
      currentSettings.isNeutralized = changes.isNeutralized.newValue;
      updateShieldState(currentSettings.isNeutralized, false);
    }

    if (changes.pointerLockEnabled) {
      currentSettings.pointerLockEnabled = changes.pointerLockEnabled.newValue;
    }

    if (changes.allowWheelScroll) {
      currentSettings.allowWheelScroll = changes.allowWheelScroll.newValue;
    }

    if (changes.bindings) {
      console.log('[HDCursor] Storage updated bindings:', changes.bindings.newValue);
      currentSettings.bindings = changes.bindings.newValue;
    }
  }

  if (storage && typeof storage.addStorageListener === 'function') {
    storage.addStorageListener(handleStorageChange);
  } else if (extApi && extApi.storage && extApi.storage.onChanged) {
    extApi.storage.onChanged.addListener(handleStorageChange);
  }

  // Initial state retrieval
  async function loadInitialSettings() {
    try {
      if (storage && typeof storage.getSettings === 'function') {
        const settings = await storage.getSettings();
        currentSettings = settings;
      } else if (extApi && extApi.storage && extApi.storage.local) {
        const stored = await extApi.storage.local.get(null);
        if (stored && Object.keys(stored).length > 0) {
          currentSettings = { ...currentSettings, ...stored };
        }
      }
      console.log('[HDCursor] Final settings loaded in content script:', currentSettings);
      updateShieldState(currentSettings.isNeutralized, false);
    } catch (err) {
      console.debug('[HDCursor] Initial settings load error:', err);
    }
  }

  loadInitialSettings();

})();
