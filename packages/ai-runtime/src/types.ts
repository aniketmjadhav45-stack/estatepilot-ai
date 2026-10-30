import { TenantContext } from '@estatepilot/shared';

export type AIProvider = 'openai' | 'gemini' | 'anthropic';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMRequest {
  provider: AIProvider;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  tools?: RegisteredToolDefinition[];
}

export interface LLMResponse {
  content: string | null;
  toolCalls?: ToolCall[];
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  durationMs: number;
}

export interface RegisteredToolDefinition {
  name: string;
  description: string;
  requiredPermission: string;
  requiresApproval: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any;
  execute: (args: Record<string, unknown>, context: TenantContext) => Promise<unknown>;
}

export interface AIRunRecord {
  id: string;
  agentId: string;
  organizationId: string;
  userId: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'requires_approval';
  totalTokens: number;
  costCents: number;
}
