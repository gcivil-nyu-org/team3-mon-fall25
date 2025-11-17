import { vi } from "vitest";
import "@testing-library/jest-dom";

// ---------- localStorage mock ----------
// Ensure localStorage is properly available in test environment
// jsdom should provide localStorage, but there can be timing issues where
// modules are loaded before jsdom fully initializes the window object.
// This ensures localStorage is available even during module initialization.
if (typeof window !== 'undefined') {
  // Check if localStorage exists and has the required methods
  const hasValidLocalStorage =
    window.localStorage &&
    typeof window.localStorage.getItem === 'function' &&
    typeof window.localStorage.setItem === 'function' &&
    typeof window.localStorage.removeItem === 'function' &&
    typeof window.localStorage.clear === 'function';

  if (!hasValidLocalStorage) {
    // Create a mock localStorage only if jsdom's localStorage is not properly set up
    const storage = {};
    const localStorageMock = {
      getItem: (key) => {
        return storage[key] || null;
      },
      setItem: (key, value) => {
        storage[key] = String(value);
      },
      removeItem: (key) => {
        delete storage[key];
      },
      clear: () => {
        Object.keys(storage).forEach(key => delete storage[key]);
      },
      get length() {
        return Object.keys(storage).length;
      },
      key: (index) => {
        const keys = Object.keys(storage);
        return keys[index] || null;
      },
    };

    // Replace with mock only if needed
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
  }
}

// Also ensure global.localStorage exists for Node.js context
if (typeof global !== 'undefined' && !global.localStorage) {
  // Use window.localStorage if available, otherwise create a simple mock
  global.localStorage = typeof window !== 'undefined' && window.localStorage
    ? window.localStorage
    : {
      getItem: () => null,
      setItem: () => { },
      removeItem: () => { },
      clear: () => { },
      get length() { return 0; },
      key: () => null,
    };
}

// ---------- DOM shims your components may rely on ----------
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),            // deprecated
      removeListener: vi.fn(),         // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

if (!window.ResizeObserver) {
  class MockResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
  }
  // @ts-ignore
  window.ResizeObserver = MockResizeObserver;
}

if (!window.IntersectionObserver) {
  class MockIO {
    observe() { }
    unobserve() { }
    disconnect() { }
    takeRecords() { return []; }
    root = null; rootMargin = ""; thresholds = [0];
  }
  // @ts-ignore
  window.IntersectionObserver = MockIO;
}

if (!URL.createObjectURL) {
  URL.createObjectURL = vi.fn(() => "blob:mock");
}
if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = vi.fn();
}

// ---------- WebSocket mock (for chat hook tests) ----------
class MockWS {
  static instances = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url;
  readyState = MockWS.CONNECTING;
  sent = [];

  onopen = null;
  onclose = null;
  onerror = null;
  onmessage = null;

  constructor(url) {
    this.url = url;
    MockWS.instances.push(this);
    setTimeout(() => {
      this.readyState = MockWS.OPEN;
      this.onopen && this.onopen({});
    }, 0);
  }

  send(data) {
    if (this.readyState !== MockWS.OPEN) throw new Error("WebSocket not open");
    this.sent.push(data);
  }

  close() {
    if (this.readyState === MockWS.CLOSED) return;
    this.readyState = MockWS.CLOSING;
    setTimeout(() => {
      this.readyState = MockWS.CLOSED;
      this.onclose && this.onclose({});
    }, 0);
  }

  // simulate a server push
  __serverMessage(payload) {
    this.onmessage && this.onmessage({ data: JSON.stringify(payload) });
  }
}

vi.stubGlobal("WebSocket", MockWS);

// Handy helpers for tests that need them
const nextTick = () => new Promise((r) => queueMicrotask(r));
const onceOpen = (sock) =>
  !sock || sock.readyState === MockWS.OPEN
    ? Promise.resolve()
    : new Promise((resolve) => {
      const prev = sock.onopen;
      sock.onopen = (ev) => {
        prev && prev(ev);
        resolve();
      };
    });

globalThis.__WS_TEST__ = {
  MockWS,
  lastSocket() {
    const a = MockWS.instances;
    return a.length ? a[a.length - 1] : null;
  },
  nextTick,
  onceOpen,
};

// ---------- Axios client mock (NO network) ----------
// We only mock the *shared* axios instance module your API layer imports.
// Individual API modules (e.g. "@/api/chat") can still be mocked per-test if needed.
vi.mock("@/api/client", () => {
  const handlers = new Map(); // key = "METHOD url" -> () => Promise({data})

  const makeKey = (m, u) => `${m.toUpperCase()} ${u}`;

  const client = {
    defaults: { baseURL: "", headers: {} },
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },

    get: vi.fn((url, config) => {
      const key = makeKey("GET", url);
      if (handlers.has(key)) return handlers.get(key)({ url, config });
      // sensible defaults to keep common flows happy
      if (url === "/auth/me/" || url === "/auth/me") {
        return Promise.resolve({
          data: { email: "test@nyu.edu", username: "current_user" },
        });
      }
      return Promise.resolve({ data: null });
    }),

    post: vi.fn((url, data, config) => {
      const key = makeKey("POST", url);
      if (handlers.has(key)) return handlers.get(key)({ url, data, config });
      return Promise.resolve({ data: { ok: true } });
    }),

    put: vi.fn((url, data, config) => {
      const key = makeKey("PUT", url);
      if (handlers.has(key)) return handlers.get(key)({ url, data, config });
      return Promise.resolve({ data: { ok: true } });
    }),

    patch: vi.fn((url, data, config) => {
      const key = makeKey("PATCH", url);
      if (handlers.has(key)) return handlers.get(key)({ url, data, config });
      return Promise.resolve({ data: { ok: true } });
    }),

    delete: vi.fn((url, config) => {
      const key = makeKey("DELETE", url);
      if (handlers.has(key)) return handlers.get(key)({ url, config });
      return Promise.resolve({ data: { ok: true } });
    }),
  };

  // per-test helpers (opt-in): you can import the module and do:
  // const client = (await import("@/api/client")).default;
  // client.__mock.reply("GET", "/some/url", () => Promise.resolve({data: ...}))
  // client.__mock.reject("GET", "/some/url", new Error("boom"))
  client.__mock = {
    reply(method, url, fnOrData) {
      if (typeof fnOrData === "function") {
        handlers.set(makeKey(method, url), fnOrData);
      } else {
        handlers.set(makeKey(method, url), () =>
          Promise.resolve({ data: fnOrData })
        );
      }
    },
    reject(method, url, error) {
      handlers.set(makeKey(method, url), () => Promise.reject(error));
    },
    clear() {
      handlers.clear();
    },
  };

  return { default: client };
});
