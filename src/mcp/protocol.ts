/**
 * Transport-neutral MCP core: JSON-RPC 2.0 dispatch for initialize, ping, tools/list, tools/call.
 * Used by the HTTP route and the stdio entry. Pattern adapted from an Apache-2.0 reference credited in NOTICE.
 */
import { demoData, DATA_SOURCE_NOTE } from './data-source';
import type { Principal } from './auth';
import { TOOLS, TOOL_BY_NAME, toToolError, type JsonSchema, type ToolContext } from './tools';

export const SERVER_INFO = { name: 'testbuddy', title: 'TestBuddy', version: '0.1.0' };
export const SUPPORTED_PROTOCOLS = ['2025-06-18', '2025-03-26', '2024-11-05'] as const;
export const INSTRUCTIONS = `TestBuddy test management. ${DATA_SOURCE_NOTE}. You act under the token owner's project role and every write is audited as coming from an agent. Read tools are safe; close_run is irreversible and needs confirm: true.`;

export const ERR = { parse: -32700, invalidRequest: -32600, methodNotFound: -32601, invalidParams: -32602, internal: -32603 } as const;

export interface RpcRequest { jsonrpc: '2.0'; id?: string | number | null; method: string; params?: unknown }
export interface RpcResponse { jsonrpc: '2.0'; id: string | number | null; result?: unknown; error?: { code: number; message: string; data?: unknown } }

const rpcError = (id: RpcResponse['id'], code: number, message: string, data?: unknown): RpcResponse => ({ jsonrpc: '2.0', id, error: { code, message, ...(data !== undefined ? { data } : {}) } });
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Validates args against the JSON-schema subset used by the tools. Returns error strings. */
export function validate(schema: JsonSchema, value: unknown, path = 'arguments'): string[] {
  const errs: string[] = [];
  if (schema.enum && !schema.enum.includes(value as string | number)) errs.push(`${path} must be one of: ${schema.enum.join(', ')}`);
  switch (schema.type) {
    case 'object': {
      if (!isObj(value)) return [`${path} must be an object`];
      for (const r of schema.required ?? []) if (value[r] === undefined) errs.push(`${path}.${r} is required`);
      for (const [k, v] of Object.entries(value)) {
        const sub = schema.properties?.[k];
        if (!sub) { if (schema.additionalProperties === false) errs.push(`${path}.${k} is not a known argument`); continue; }
        errs.push(...validate(sub, v, `${path}.${k}`));
      }
      break;
    }
    case 'array': {
      if (!Array.isArray(value)) return [`${path} must be an array`];
      if (schema.minItems !== undefined && value.length < schema.minItems) errs.push(`${path} needs at least ${schema.minItems} item(s)`);
      if (schema.maxItems !== undefined && value.length > schema.maxItems) errs.push(`${path} allows at most ${schema.maxItems} item(s)`);
      if (schema.items) value.forEach((v, i) => errs.push(...validate(schema.items!, v, `${path}[${i}]`)));
      break;
    }
    case 'string':
      if (typeof value !== 'string') return [`${path} must be a string`];
      if (schema.minLength !== undefined && value.trim().length < schema.minLength) errs.push(`${path} must not be empty`);
      if (schema.maxLength !== undefined && value.length > schema.maxLength) errs.push(`${path} is longer than ${schema.maxLength} characters`);
      break;
    case 'integer':
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value) || (schema.type === 'integer' && !Number.isInteger(value))) return [`${path} must be ${schema.type === 'integer' ? 'an integer' : 'a number'}`];
      if (schema.minimum !== undefined && value < schema.minimum) errs.push(`${path} must be >= ${schema.minimum}`);
      if (schema.maximum !== undefined && value > schema.maximum) errs.push(`${path} must be <= ${schema.maximum}`);
      break;
    case 'boolean':
      if (typeof value !== 'boolean') return [`${path} must be a boolean`];
      break;
  }
  return errs;
}

export function listTools() {
  return TOOLS.map((t) => ({
    name: t.name, title: t.title, description: t.description, inputSchema: t.inputSchema,
    annotations: { title: t.title, readOnlyHint: !t.write, destructiveHint: t.destructive === true, idempotentHint: !t.write, openWorldHint: false },
  }));
}

function toolResult(payload: unknown, isError = false) {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }], isError };
}

export interface HandleOptions { principal: Principal; client?: string }

/** Handles one JSON-RPC message. Returns null for notifications (no response). */
export async function handleMessage(msg: unknown, opts: HandleOptions): Promise<RpcResponse | null> {
  if (!isObj(msg) || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return rpcError(isObj(msg) && (typeof msg.id === 'string' || typeof msg.id === 'number') ? msg.id : null, ERR.invalidRequest, 'Invalid JSON-RPC 2.0 request.');
  const hasId = msg.id !== undefined && msg.id !== null;
  const id = hasId ? (msg.id as string | number) : null;
  const params = msg.params;
  const isNotification = msg.id === undefined;

  if (msg.method.startsWith('notifications/')) return null;
  if (isNotification) return null; // any other id-less message is a notification

  switch (msg.method) {
    case 'ping':
      return { jsonrpc: '2.0', id, result: {} };
    case 'initialize': {
      if (params !== undefined && !isObj(params)) return rpcError(id, ERR.invalidParams, 'params must be an object.');
      const asked = isObj(params) ? params.protocolVersion : undefined;
      const version = (SUPPORTED_PROTOCOLS as readonly string[]).includes(asked as string) ? (asked as string) : SUPPORTED_PROTOCOLS[0];
      return { jsonrpc: '2.0', id, result: { protocolVersion: version, capabilities: { tools: { listChanged: false } }, serverInfo: SERVER_INFO, instructions: INSTRUCTIONS } };
    }
    case 'tools/list':
      return { jsonrpc: '2.0', id, result: { tools: listTools() } };
    case 'tools/call': {
      if (!isObj(params) || typeof params.name !== 'string') return rpcError(id, ERR.invalidParams, 'params.name (string) is required.');
      const tool = TOOL_BY_NAME.get(params.name);
      if (!tool) return rpcError(id, ERR.invalidParams, `Unknown tool: ${params.name}`);
      const args = params.arguments === undefined ? {} : params.arguments;
      const errs = validate(tool.inputSchema, args);
      if (errs.length) return rpcError(id, ERR.invalidParams, `Invalid arguments for ${tool.name}.`, errs);
      try {
        const out = await demoData.runAs(opts.principal.userId, (services) => {
          const ctx: ToolContext = { principal: opts.principal, services, client: opts.client };
          return tool.handler(args as Record<string, unknown>, ctx);
        });
        return { jsonrpc: '2.0', id, result: toolResult(out) };
      } catch (e) {
        const te = toToolError(e);
        return { jsonrpc: '2.0', id, result: toolResult({ error: { code: te.code, status: te.status, message: te.message, ...(te.details ? { details: te.details } : {}) } }, true) };
      }
    }
    default:
      return rpcError(id, ERR.methodNotFound, `Method not found: ${msg.method}`);
  }
}

export { rpcError };
