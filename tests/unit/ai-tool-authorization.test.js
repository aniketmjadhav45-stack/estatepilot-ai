import test from 'node:test';
import assert from 'node:assert/strict';

// AI Tool Runner Simulator
class MockAIOrchestrator {
  constructor() {
    this.tools = new Map();
  }

  registerTool(tool) {
    this.tools.set(tool.name, tool);
  }

  async executeToolCall(call, context) {
    const tool = this.tools.get(call.name);
    if (!tool) {
      throw new Error(`ToolNotFoundError: ${call.name}`);
    }

    // Role check
    if (!context.permissions.includes(tool.requiredPermission)) {
      throw new Error(`UnauthorizedToolCall: Missing ${tool.requiredPermission}`);
    }

    // Approval gate
    if (tool.requiresApproval) {
      return {
        status: 'pending_approval',
        requiresApproval: true,
        tool: tool.name,
      };
    }

    const output = await tool.execute(call.args, context);
    return {
      status: 'executed',
      requiresApproval: false,
      output,
    };
  }
}

test('AI Orchestration: Unregistered tool execution is rejected', async () => {
  const orchestrator = new MockAIOrchestrator();
  await assert.rejects(
    async () => {
      await orchestrator.executeToolCall(
        { name: 'unregistered_tool', args: {} },
        { permissions: ['properties:read'] }
      );
    },
    { message: 'ToolNotFoundError: unregistered_tool' }
  );
});

test('AI Orchestration: Unauthorized tool call is blocked by RBAC', async () => {
  const orchestrator = new MockAIOrchestrator();
  orchestrator.registerTool({
    name: 'update_property_price',
    requiredPermission: 'properties:write',
    requiresApproval: true,
    execute: async () => ({ updated: true }),
  });

  // User only has read permission
  await assert.rejects(
    async () => {
      await orchestrator.executeToolCall(
        { name: 'update_property_price', args: { price: 500000 } },
        { permissions: ['properties:read'] }
      );
    },
    { message: 'UnauthorizedToolCall: Missing properties:write' }
  );
});

test('AI Orchestration: Sensitive tool is paused for Human-in-the-Loop approval', async () => {
  const orchestrator = new MockAIOrchestrator();
  orchestrator.registerTool({
    name: 'update_property_price',
    requiredPermission: 'properties:write',
    requiresApproval: true,
    execute: async (args) => ({ newPrice: args.price }),
  });

  const res = await orchestrator.executeToolCall(
    { name: 'update_property_price', args: { price: 850000 } },
    { permissions: ['properties:write'] }
  );

  assert.equal(res.status, 'pending_approval');
  assert.equal(res.requiresApproval, true);
  assert.equal(res.tool, 'update_property_price');
});

test('AI Orchestration: Safe informational tool executes immediately', async () => {
  const orchestrator = new MockAIOrchestrator();
  orchestrator.registerTool({
    name: 'search_properties',
    requiredPermission: 'properties:read',
    requiresApproval: false,
    execute: async (args, ctx) => ({
      results: [{ id: 'p1', title: 'Grand Penthouse' }],
      orgId: ctx.organizationId,
    }),
  });

  const res = await orchestrator.executeToolCall(
    { name: 'search_properties', args: { query: 'penthouse' } },
    { permissions: ['properties:read'], organizationId: 'org_123' }
  );

  assert.equal(res.status, 'executed');
  assert.equal(res.output.results.length, 1);
  assert.equal(res.output.orgId, 'org_123');
});
