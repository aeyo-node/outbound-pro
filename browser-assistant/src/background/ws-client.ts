import type {
  AuthenticateMessage,
  ClientMessage,
  ServerMessage,
} from '@/types/protocol';
import { log } from '@/lib/logger';
import { loadCredentials } from '@/lib/storage';
import { patchState } from './state';
import pkg from '../../package.json';

const HEARTBEAT_MS = 30_000;
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;
const ALARM_NAME = 'swaram-ws-keepalive';

type CommandHandler = (cmd: ServerMessage) => void;

/**
 * Persistent WebSocket client to the Swaram backend.
 *
 * MV3 note: a service worker is not always-alive, but an active WebSocket with
 * periodic traffic keeps it alive. We additionally register a chrome.alarms
 * heartbeat as a fallback to re-establish the connection if Chrome has
 * suspended the worker. Reconnect uses exponential backoff with jitter.
 */
export class WsClient {
  private ws: WebSocket | null = null;
  private url: string = '';
  private token: string = '';
  private tenantId: string = '';
  private reconnectAttempts = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private lastPong = 0;
  private shouldConnect = true;
  private readonly onCommand: CommandHandler;

  constructor(onCommand: CommandHandler) {
    this.onCommand = onCommand;
  }

  async start(): Promise<void> {
    this.shouldConnect = true;
    const creds = await loadCredentials();
    if (!creds || !creds.wsUrl) {
      log.warn('WS: not configured (no wsUrl/credentials); skipping connect');
      await patchState({ wsState: 'closed', connected: false, lastError: 'WebSocket URL not configured' });
      return;
    }
    this.url = creds.wsUrl;
    this.token = creds.backendToken;
    this.tenantId = creds.tenantId ?? '';
    this.connect();
    this.installAlarm();
  }

  private installAlarm(): void {
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: 0.5 }); // every 30s
    chrome.alarms.onAlarm.addListener((a) => {
      if (a.name === ALARM_NAME) this.onAlarm();
    });
  }

  private onAlarm(): void {
    if (!this.shouldConnect) return;
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      log.info('WS: alarm detected closed socket, reconnecting');
      this.connect();
      return;
    }
    // Heartbeat via alarm as well (more reliable than setInterval in SW).
    if (Date.now() - this.lastPong > HEARTBEAT_MS * 2) {
      log.warn('WS: missed heartbeats, forcing reconnect');
      this.ws.close();
      return;
    }
    this.send({ type: 'pong', ts: Date.now() }); // respond to any pending ping
    // Also emit a heartbeat ping of our own.
    this.send({ type: 'pong', ts: Date.now() });
  }

  private connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    patchState({ wsState: 'connecting' });
    log.info(`WS: connecting to ${this.url}`);
    try {
      this.ws = new WebSocket(this.url);
    } catch (e) {
      log.error(`WS: construction failed: ${(e as Error).message}`);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.lastPong = Date.now();
      log.info('WS: open — authenticating');
      patchState({ wsState: 'open', connected: true, lastError: null });
      const auth: AuthenticateMessage = {
        type: 'authenticate',
        token: this.token,
        extensionId: chrome.runtime.id,
        version: pkg.version,
        ...(this.tenantId ? { tenantId: this.tenantId } : {}),
      };
      this.send(auth);
      this.startHeartbeat();
    };

    this.ws.onmessage = (ev) => this.onMessage(ev);

    this.ws.onerror = () => {
      log.error('WS: error event');
      patchState({ wsState: 'error', lastError: 'WebSocket error' });
    };

    this.ws.onclose = () => {
      log.info('WS: closed');
      patchState({ wsState: 'closed', connected: false });
      this.stopHeartbeat();
      if (this.shouldConnect) this.scheduleReconnect();
    };
  }

  private onMessage(ev: MessageEvent): void {
    let msg: ServerMessage;
    try {
      msg = JSON.parse(ev.data as string) as ServerMessage;
    } catch (e) {
      log.error(`WS: unparseable message: ${(e as Error).message}`);
      return;
    }
    switch (msg.type) {
      case 'authenticated':
        log.info(`WS: authenticated (session ${msg.sessionId})`);
        break;
      case 'unauthorized':
        log.error(`WS: unauthorized — ${msg.reason}`);
        patchState({ lastError: `Unauthorized: ${msg.reason}`, wsState: 'error' });
        this.shouldConnect = false; // stop retrying until creds fixed
        break;
      case 'ping':
        this.lastPong = Date.now();
        this.send({ type: 'pong', ts: Date.now() });
        break;
      case 'reload':
        chrome.runtime.reload();
        break;
      case 'execute':
      case 'cancel':
        this.onCommand(msg);
        break;
      default:
        log.debug(`WS: unhandled message type ${(msg as ServerMessage).type}`);
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'pong', ts: Date.now() });
      }
    }, HEARTBEAT_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (!this.shouldConnect) return;
    this.reconnectAttempts++;
    const delay = Math.min(
      RECONNECT_MAX_MS,
      RECONNECT_BASE_MS * 2 ** Math.min(this.reconnectAttempts, 6),
    );
    const jitter = Math.floor(delay * 0.3 * Math.random());
    const wait = delay + jitter;
    log.info(`WS: reconnect in ${wait}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.connect(), wait);
  }

  send(msg: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  async reconnect(): Promise<void> {
    this.shouldConnect = true;
    this.reconnectAttempts = 0;
    try {
      this.ws?.close();
    } catch {
      /* ignore */
    }
    await this.start();
  }

  stop(): void {
    this.shouldConnect = false;
    this.stopHeartbeat();
    try {
      this.ws?.close();
    } catch {
      /* ignore */
    }
    chrome.alarms.clear(ALARM_NAME);
  }
}
