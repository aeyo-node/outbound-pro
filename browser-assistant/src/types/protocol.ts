/**
 * WebSocket protocol message types.
 *
 * Every message on the wire is a JSON object with a `type` field. This file is
 * shared between the extension (background) and any backend client so both ends
 * speak the exact same dialect.
 *
 * See docs/WEBSOCKET_PROTOCOL.md for the human-readable spec.
 */

// ---------------------------------------------------------------------------
// Client -> Backend  (extension reporting state / results)
// ---------------------------------------------------------------------------
export type ClientMessageType =
  | 'authenticate' // initial handshake with backend token
  | 'response' // result of an execute command
  | 'logs' // streamed log lines
  | 'status' // periodic status snapshot
  | 'monitor' // dashboard monitor updates
  | 'pong' // heartbeat reply
  | 'error'; // protocol-level error

// ---------------------------------------------------------------------------
// Backend -> Client  (commands from the voice agent)
// ---------------------------------------------------------------------------
export type ServerMessageType =
  | 'authenticated' // ack of authenticate
  | 'unauthorized' // auth rejected
  | 'execute' // run a tool
  | 'cancel' // cancel an in-flight execution
  | 'ping' // heartbeat
  | 'reload'; // force extension reload (ops)

/** Arguments are always a free-form object — each tool defines its own shape. */
export type ToolArgs = Record<string, unknown>;

/** Envelope for a tool execution request from the backend. */
export interface ExecuteCommand {
  type: 'execute';
  id: string; // correlation id — echoed in the response
  tool: string; // tool name, e.g. "click"
  args: ToolArgs; // tool arguments
  timeout?: number; // per-call timeout in ms (default 30s)
  traceId?: string; // optional voice-agent trace id for logs
}

/** Envelope for a cancel request. */
export interface CancelCommand {
  type: 'cancel';
  id: string; // the execute id to cancel
  reason?: string;
}

export interface PingCommand {
  type: 'ping';
  ts: number;
}

export interface ReloadCommand {
  type: 'reload';
}

export type ServerMessage =
  | ExecuteCommand
  | CancelCommand
  | PingCommand
  | ReloadCommand
  | { type: 'authenticated'; sessionId: string }
  | { type: 'unauthorized'; reason: string };

// ---------------------------------------------------------------------------
// Standard tool response shape (returned by EVERY tool).
// ---------------------------------------------------------------------------
export interface ToolResponse<T = unknown> {
  success: boolean;
  tool: string;
  /** Wall-clock duration of the tool call in ms. */
  time: number;
  /** Arbitrary structured payload on success. */
  data?: T;
  /** Human-readable failure reason. */
  reason?: string;
  /** Base64 data URL screenshot, attached on failure or when requested. */
  screenshot?: string;
  /** Correlation id from the execute command. */
  id?: string;
  /** Optional error code for programmatic handling. */
  code?: string;
  /** Stack/contextual trace for debugging. */
  trace?: string;
  /** True if the execution was cancelled before completing. */
  cancelled?: boolean;
}

/** The message the extension sends back to the backend after executing a tool. */
export interface ResponseMessage {
  type: 'response';
  id: string;
  result: ToolResponse;
}

export interface AuthenticateMessage {
  type: 'authenticate';
  token: string; // backend-issued extension token
  extensionId: string;
  version: string;
  /** Optional tenant/label so the backend can route commands to this extension. */
  tenantId?: string;
  capabilities?: string[];
}

export interface StatusMessage {
  type: 'status';
  id?: string;
  connected: boolean;
  loggedIn: boolean;
  currentUrl: string;
  currentPage: string;
  lastAction: string | null;
  lastError: string | null;
  ts: number;
}

export interface MonitorMessage {
  type: 'monitor';
  campaigns: unknown;
  calls: unknown;
  errors: string[];
  ts: number;
}

export interface LogMessage {
  type: 'logs';
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  ts: number;
  traceId?: string;
}

export interface ErrorMessage {
  type: 'error';
  id?: string;
  code: string;
  message: string;
}

export interface PongMessage {
  type: 'pong';
  ts: number;
}

export type ClientMessage =
  | AuthenticateMessage
  | ResponseMessage
  | StatusMessage
  | MonitorMessage
  | LogMessage
  | ErrorMessage
  | PongMessage;

// ---------------------------------------------------------------------------
// Internal messaging between background <-> content script <-> popup.
// ---------------------------------------------------------------------------

/** Messages routed over chrome.runtime / chrome.tabs. */
export type RuntimeMessageType =
  | 'getState' // popup -> bg: fetch debug snapshot
  | 'state' // bg -> popup: debug snapshot
  | 'executeTool' // bg -> content: run a DOM tool
  | 'toolResult' // content -> bg: tool result
  | 'login' // popup -> bg: trigger dashboard login
  | 'logout' // popup -> bg: trigger logout
  | 'reconnect' // popup -> bg: reconnect WS
  | 'screenshot' // popup -> bg: capture screenshot
  | 'notify' // bg -> popup: push a transient status
  | 'monitorTick'; // content -> bg: monitor snapshot

export interface RuntimeMessage<T = unknown> {
  type: RuntimeMessageType;
  id?: string;
  payload?: T;
}

export interface ExtensionState {
  loggedIn: boolean;
  connected: boolean;
  currentUrl: string;
  currentPage: string;
  lastAction: string | null;
  lastError: string | null;
  dashboardUrl: string;
  wsState: 'connecting' | 'open' | 'closed' | 'error';
  history: ActionHistoryEntry[];
  ts: number;
}

export interface ActionHistoryEntry {
  id: string;
  ts: number;
  tool: string;
  args: ToolArgs;
  duration: number;
  success: boolean;
  reason?: string;
  screenshot?: string;
}

/** Shape of stored, encrypted configuration. */
export interface StoredConfig {
  dashboardUrl: string;
  email: string;
  /** AES-GCM ciphertext (base64). */
  password: string;
  /** Initialization vector (base64). */
  iv: string;
  /** Salt used to derive the wrapping key (base64). */
  salt: string;
  wsUrl: string;
  backendToken: string;
  /** Optional tenant/label identifying which dashboard this extension drives. */
  tenantId: string;
  autoReconnect: boolean;
  keepAlive: boolean;
}

/** Plain (decrypted) credentials, only alive in memory. */
export interface PlainCredentials {
  dashboardUrl: string;
  email: string;
  password: string;
  wsUrl: string;
  backendToken: string;
  tenantId: string;
}
