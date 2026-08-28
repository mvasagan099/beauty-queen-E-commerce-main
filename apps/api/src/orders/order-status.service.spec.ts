import { ConflictException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { OrderStatusService } from './order-status.service';

describe('OrderStatusService', () => {
  let service: OrderStatusService;

  beforeEach(() => {
    service = new OrderStatusService();
  });

  describe('allowed transitions', () => {
    it('allows Pending -> Confirmed and Pending -> Cancelled', () => {
      const allowed = service.getAllowedTransitions(OrderStatus.Pending);
      expect(allowed).toEqual(
        expect.arrayContaining([OrderStatus.Confirmed, OrderStatus.Cancelled]),
      );
    });

    it('allows Processing -> Shipped and Processing -> Cancelled', () => {
      const allowed = service.getAllowedTransitions(OrderStatus.Processing);
      expect(allowed).toEqual(
        expect.arrayContaining([OrderStatus.Shipped, OrderStatus.Cancelled]),
      );
    });

    it('does not allow regression from Shipped back to Processing', () => {
      expect(() =>
        service.assertValidTransition(OrderStatus.Shipped, OrderStatus.Processing),
      ).toThrow(ConflictException);
    });

    it('forbids skipping from Pending directly to Delivered', () => {
      expect(() =>
        service.assertValidTransition(OrderStatus.Pending, OrderStatus.Delivered),
      ).toThrow(ConflictException);
    });

    it('allows Shipped -> Delivered', () => {
      expect(() =>
        service.assertValidTransition(OrderStatus.Shipped, OrderStatus.Delivered),
      ).not.toThrow();
    });
  });

  describe('isCustomerCancellable', () => {
    it('allows cancellation in Pending/Confirmed/Processing', () => {
      for (const s of [
        OrderStatus.Pending,
        OrderStatus.Confirmed,
        OrderStatus.Processing,
      ]) {
        expect(service.isCustomerCancellable(s)).toBe(true);
      }
    });

    it('forbids cancellation once Shipped/Delivered/Refunded', () => {
      for (const s of [
        OrderStatus.Shipped,
        OrderStatus.Delivered,
        OrderStatus.Refunded,
        OrderStatus.Cancelled,
      ]) {
        expect(service.isCustomerCancellable(s)).toBe(false);
      }
    });
  });

  describe('terminal/fulfilment helpers', () => {
    it('treats Delivered/Cancelled/Refunded as terminal', () => {
      for (const s of [
        OrderStatus.Delivered,
        OrderStatus.Cancelled,
        OrderStatus.Refunded,
      ]) {
        expect(service.isTerminalStatus(s)).toBe(true);
      }
    });

    it('orders fulfilment statuses correctly', () => {
      expect(service.getFulfillmentOrder()).toEqual([
        OrderStatus.Pending,
        OrderStatus.Confirmed,
        OrderStatus.Processing,
        OrderStatus.Shipped,
        OrderStatus.Delivered,
      ]);
    });
  });
});
