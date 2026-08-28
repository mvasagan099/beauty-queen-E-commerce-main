export enum EmailEventType {
  OTP_REQUESTED = 'OTP_REQUESTED',
  ORDER_CREATED = 'ORDER_CREATED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  ORDER_CONFIRMED = 'ORDER_CONFIRMED',
  ORDER_PROCESSING = 'ORDER_PROCESSING',
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  RETURN_REQUESTED = 'RETURN_REQUESTED',
  RETURN_APPROVED = 'RETURN_APPROVED',
  RETURN_REJECTED = 'RETURN_REJECTED',
  REFUND_INITIATED = 'REFUND_INITIATED',
  REFUND_COMPLETED = 'REFUND_COMPLETED',
  BACK_IN_STOCK = 'BACK_IN_STOCK',
  PRICE_DROP = 'PRICE_DROP',
  CART_REMINDER = 'CART_REMINDER',
  SUPPORT_TICKET_CREATED = 'SUPPORT_TICKET_CREATED',
  SUPPORT_TICKET_REPLIED = 'SUPPORT_TICKET_REPLIED',
  SUPPORT_TICKET_RESOLVED = 'SUPPORT_TICKET_RESOLVED',
  SUPPORT_TICKET_CLOSED = 'SUPPORT_TICKET_CLOSED',
}

export enum InAppNotificationType {
  ORDER_UPDATE = 'ORDER_UPDATE',
  PAYMENT_UPDATE = 'PAYMENT_UPDATE',
  PROMOTIONAL = 'PROMOTIONAL',
  SYSTEM = 'SYSTEM',
}

export interface EmailJobPayload {
  eventId: string;
  type: EmailEventType;
  to: string;
  data: Record<string, any>;
}

export interface InAppNotificationPayload {
  userId: number;
  type: InAppNotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
}

export interface AuditEventPayload {
  action: string;
  entityType: string;
  entityId?: number;
  actorId?: number;
  actorRole?: string;
  details?: Record<string, any>;
}

export interface DomainEvent {
  eventId: string;
  type: string;
  payload: Record<string, any>;
  timestamp: Date;
}
