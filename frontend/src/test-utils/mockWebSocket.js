export class MockWebSocket {
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static CONNECTING = 0;

  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    this.sent = [];
    this.eventHandlers = { open: [], message: [], close: [], error: [] };
    // simulate async open
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.eventHandlers.open.forEach((fn) => fn({ type: 'open' }));
    }, 0);
  }

  addEventListener(type, handler) {
    this.eventHandlers[type]?.push(handler);
  }
  removeEventListener(type, handler) {
    this.eventHandlers[type] = (this.eventHandlers[type] || []).filter((h) => h !== handler);
  }

  send(data) {
    if (this.readyState !== MockWebSocket.OPEN) throw new Error('Socket not open');
    this.sent.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSING;
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      this.eventHandlers.close.forEach((fn) => fn({ type: 'close' }));
    }, 0);
  }

  // helper for tests to push server messages
  __serverMessage(payload) {
    const evt = { data: typeof payload === 'string' ? payload : JSON.stringify(payload) };
    this.eventHandlers.message.forEach((fn) => fn(evt));
  }
}

export function installWebSocketMock() {
    // eslint-disable-next-line no-undef
  global.WebSocket = MockWebSocket;
}
