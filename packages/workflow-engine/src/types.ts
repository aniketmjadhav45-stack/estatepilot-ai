import { TenantScopedEntity } from '@estatepilot/shared';

export type WorkflowTriggerType =
  | 'lead_created'
  | 'lead_status_changed'
  | 'property_created'
  | 'property_price_updated'
  | 'customer_message_received'
  | 'appointment_booked'
  | 'deal_stage_changed'
  | 'schedule_cron';

export type WorkflowActionType =
  | 'create_task'
  | 'assign_lead'
  | 'send_email'
  | 'send_whatsapp'
  | 'invoke_ai_agent'
  | 'update_crm_field'
  | 'create_appointment'
  | 'dispatch_webhook';

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'delay';
  actionType?: WorkflowActionType;
  config: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  conditionBranch?: 'true' | 'false' | 'default';
}

export interface WorkflowDefinition extends TenantScopedEntity {
  name: string;
  description?: string;
  isActive: boolean;
  triggerType: WorkflowTriggerType;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}
