import { TenantContext, Result, ok, err } from '@estatepilot/shared';
import { hasPermission } from '@estatepilot/permissions';
import { RegisteredToolDefinition, LLMRequest, LLMResponse, ToolCall } from './types';

export class AIOrchestrator {
  private readonly toolRegistry = new Map<string, RegisteredToolDefinition>();

  public registerTool(tool: RegisteredToolDefinition): void {
    this.toolRegistry.set(tool.name, tool);
  }

  public getTool(name: string): RegisteredToolDefinition | undefined {
    return this.toolRegistry.get(name);
  }

  public getAllTools(): RegisteredToolDefinition[] {
    return Array.from(this.toolRegistry.values());
  }

  /**
   * Securely dispatches a tool call with permission checks, tenant context injection,
   * and human-in-the-loop approval protection
   */
  public async executeToolCall(
    call: ToolCall,
    context: TenantContext
  ): Promise<Result<{ status: 'executed' | 'pending_approval'; result?: unknown }, Error>> {
    const tool = this.toolRegistry.get(call.name);

    if (!tool) {
      return err(new Error(`Tool [${call.name}] is not registered in the AI runtime.`));
    }

    // 1. Validate caller permission
    const allowed = hasPermission(
      { roleCode: context.roleCode, userPermissions: context.permissions },
      tool.requiredPermission
    );

    if (!allowed) {
      return err(
        new Error(
          `Permission denied: User with role [${context.roleCode}] cannot execute tool [${tool.name}].`
        )
      );
    }

    // 2. Check if tool requires Human-in-the-Loop approval
    if (tool.requiresApproval) {
      return ok({
        status: 'pending_approval',
        result: {
          message: `Tool [${tool.name}] requires authorized human approval before execution. Request logged in approval center.`,
          arguments: call.arguments,
        },
      });
    }

    // 3. Execute authorized tool with injected tenant context
    try {
      const output = await tool.execute(call.arguments, context);
      return ok({
        status: 'executed',
        result: output,
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
