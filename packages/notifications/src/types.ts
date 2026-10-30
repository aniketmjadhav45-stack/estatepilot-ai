export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationPayload {
  id: string;
  organizationId: string;
  recipientProfileId: string;
  title: string;
  message: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  actionUrl?: string;
  readAt?: string | null;
  createdAt: string;
}
