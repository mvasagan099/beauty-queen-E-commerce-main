import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPaymentDto {
  @ApiProperty({ example: 'order_xxx' })
  @IsString()
  @IsNotEmpty()
  razorpayOrderId: string;

  @ApiProperty({ example: 'pay_xxx' })
  @IsString()
  @IsNotEmpty()
  razorpayPaymentId: string;

  @ApiProperty({ example: 'xxx' })
  @IsString()
  @IsNotEmpty()
  razorpaySignature: string;
}

export class PaymentStatusParamDto {
  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  id: number;
}

export class CheckoutStatusParamDto {
  @ApiProperty({ example: 'abc-123-checkout-id' })
  @IsString()
  @IsNotEmpty()
  checkoutId: string;
}