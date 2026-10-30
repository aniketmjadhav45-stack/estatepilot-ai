export type IntegrationProvider =
  | 'whatsapp_cloud'
  | 'gmail'
  | 'google_calendar'
  | 'twilio'
  | 'stripe'
  | 'razorpay'
  | 'vapi'
  | 'n8n'
  | 'webhook';

export interface IntegrationAccount {
  id: string;
  organizationId: string;
  provider: IntegrationProvider;
  name: string;
  isConnected: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessagePayload {
  recipient: string;
  body: string;
  subject?: string;
  channel: 'whatsapp' | 'email' | 'sms';
}

export interface CalendarEventPayload {
  summary: string;
  description?: string;
  startTime: string;
  endTime: string;
  attendees: string[];
}
