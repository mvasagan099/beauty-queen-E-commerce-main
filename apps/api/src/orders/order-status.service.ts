import { Injectable, ConflictException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import {
  VALID_TRANSITIONS,
  isValidTransition,
  isTerminalStatus,
  FULFILLMENT_ORDER,
  getStatusIndex,
} from './types/order-status.type';

/**
 * Centralized order status state machine.
 *
 * Every status change must be routed through this service so that invalid
 * transitions are rejected consistently regardless of which controller
 * (admin, seller) triggered them. Frontend dropdown restrictions are never
 * relied upon — enforcement always happens server-side.
 */
@Injectable()
export class OrderStatusService {
  /**
   * Returns the list of statuses reachable from the given current status.
   */
  getAllowedTransitions(current: OrderStatus): OrderStatus[] {
    return VALID_TRANSITIONS[current] || [];
  }

  /**
   * Validates a status transition and throws if it is not permitted.
   */
  assertValidTransition(current: OrderStatus, next: OrderStatus): void {
    if (!isValidTransition(current, next)) {
      const allowed = this.getAllowedTransitions(current);
      throw new ConflictException(
        `Cannot transition order from ${current} to ${next}. Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }
  }

  isTerminalStatus(status: OrderStatus): boolean {
    return isTerminalStatus(status);
  }

  isFulfillmentStatus(status: OrderStatus): boolean {
    return FULFILLMENT_ORDER.includes(status);
  }

  getStatusIndex(status: OrderStatus): number {
    return getStatusIndex(status);
  }

  getFulfillmentOrder(): OrderStatus[] {
    return [...FULFILLMENT_ORDER];
  }

  /**
   * Whether a customer may cancel an order from the given status.
   *
   * Business rule: cancellation is only allowed before an irreversible
   * fulfilment stage. Pending/Confirmed/Processing are cancellable.
   * Shipped/Delivered/Refunded cannot be cancelled through this path.
   */
  isCustomerCancellable(status: OrderStatus): boolean {
    return (
      status === OrderStatus.Pending ||
      status === OrderStatus.Confirmed ||
      status === OrderStatus.Processing
    );
  }
}
