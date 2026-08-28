export interface OrderCreatedEvent {
  orderId: number;
  email: string;
  username: string;
  productName: string;
  price: number;
  quantity: number;
  total: number;
  paymentMethod: string;
}

export interface OrderStatusChangedEvent {
  orderId: number;
  email: string;
  username: string;
  productName: string;
  oldStatus: string;
  newStatus: string;
}

export interface OrderCancelledEvent {
  orderId: number;
  email: string;
  username: string;
  productName: string;
  reason?: string;
}
