import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PaymentsService } from './payments.service';
import {
  CreateCheckoutDto,
  CreatePaymentOrderDto,
  VerifyPaymentDto,
  AdminRefundPaymentDto,
  RetryPaymentDto,
  CheckoutStatusParamDto,
} from './dto/payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { RateLimit, RateLimitGuard } from '../common/rate-limit.guard';
import { PAYMENT_RATE_LIMITS } from './types/payment-status';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private paymentsService: PaymentsService,
  ) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
  @Roles(Role.CUSTOMER)
  @RateLimit('create_checkout', PAYMENT_RATE_LIMITS.createOrder.max, PAYMENT_RATE_LIMITS.createOrder.windowSeconds)
  @ApiOperation({ summary: 'Create checkout - validates cart, calculates amount, creates orders' })
  async createCheckout(@Request() req: any, @Body() dto: CreateCheckoutDto) {
    const result = await this.paymentsService.createCheckout(req.user.sub, dto);
    return { success: true, data: result };
  }

  @Post('create-order')
  @UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
  @Roles(Role.CUSTOMER)
  @RateLimit('create_order', PAYMENT_RATE_LIMITS.createOrder.max, PAYMENT_RATE_LIMITS.createOrder.windowSeconds)
  @ApiOperation({ summary: 'Create (or reuse) a Razorpay order for a checkout' })
  async createOrder(@Request() req: any, @Body() dto: CreatePaymentOrderDto) {
    const result = await this.paymentsService.createOrderForCheckout(
      req.user.sub,
      dto.checkoutId,
    );
    return { success: true, data: result };
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
  @Roles(Role.CUSTOMER)
  @RateLimit('verify', PAYMENT_RATE_LIMITS.verify.max, PAYMENT_RATE_LIMITS.verify.windowSeconds)
  @ApiOperation({ summary: 'Verify Razorpay payment signature and confirm order' })
  async verifyPayment(@Request() req: any, @Body() dto: VerifyPaymentDto) {
    const result = await this.paymentsService.verifyPayment(req.user.sub, dto);
    return { success: true, data: result };
  }

  @Post('cod/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
  @Roles(Role.CUSTOMER)
  @RateLimit('cod_confirm', PAYMENT_RATE_LIMITS.createOrder.max, PAYMENT_RATE_LIMITS.createOrder.windowSeconds)
  @ApiOperation({ summary: 'Confirm COD order' })
  async confirmCod(@Request() req: any, @Body() body: { checkoutId: string }) {
    const result = await this.paymentsService.processCodPayment(req.user.sub, body.checkoutId);
    return { success: true, data: result };
  }

  @Post('retry')
  @UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
  @Roles(Role.CUSTOMER)
  @RateLimit('retry', PAYMENT_RATE_LIMITS.retry.max, PAYMENT_RATE_LIMITS.retry.windowSeconds)
  @ApiOperation({ summary: 'Retry a failed payment for a checkout' })
  async retryPayment(@Request() req: any, @Body() dto: RetryPaymentDto) {
    const result = await this.paymentsService.retryPayment(req.user.sub, dto.checkoutId);
    return { success: true, data: result };
  }

  @Get(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Get payment status by payment id' })
  async getPaymentStatus(@Request() req: any, @Param('id') id: string) {
    const result = await this.paymentsService.getPaymentStatus(req.user.sub, parseInt(id, 10));
    return { success: true, data: result };
  }

  @Get('checkout/:checkoutId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Get payment status by checkout id' })
  async getCheckoutStatus(@Request() req: any, @Param() params: CheckoutStatusParamDto) {
    const result = await this.paymentsService.getPaymentByCheckout(
      req.user.sub,
      params.checkoutId,
    );
    return { success: true, data: result };
  }

  @Post(':paymentId/refund')
  @UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
  @Roles(Role.ADMIN)
  @RateLimit('refund', PAYMENT_RATE_LIMITS.refund.max, PAYMENT_RATE_LIMITS.refund.windowSeconds)
  @ApiOperation({ summary: 'Admin - refund a captured payment (full or partial)' })
  async adminRefund(
    @Request() req: any,
    @Param('paymentId') paymentId: string,
    @Body() dto: AdminRefundPaymentDto,
  ) {
    const result = await this.paymentsService.refundByPaymentId(
      req.user.sub,
      parseInt(paymentId, 10),
      dto.amount,
      dto.reason,
      dto.metadata,
    );
    return { success: true, data: result };
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Razorpay webhook endpoint' })
  async handleWebhook(@Req() req: any) {
    const signature = req.headers['x-razorpay-signature'] as string;
    const rawBody = req.rawBody;

    if (!signature || !rawBody) {
      this.logger.warn('Webhook rejected: missing signature or raw body');
      throw new BadRequestException('Missing signature');
    }

    const bodyBuffer = Buffer.isBuffer(rawBody)
      ? rawBody
      : Buffer.from(
          typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody),
        );

    const isValid = this.paymentsService.verifyWebhookSignatureSafe(
      bodyBuffer.toString(),
      signature,
    );

    if (!isValid) {
      this.logger.warn('Webhook rejected: invalid signature');
      throw new BadRequestException('Invalid signature');
    }

    const event = req.body?.event;
    if (!event) {
      throw new BadRequestException('Missing event');
    }

    const result = await this.paymentsService.handleWebhook(event, req.body);
    return { success: true, data: result };
  }
}