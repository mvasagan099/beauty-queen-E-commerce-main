import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { SendOtpDto, VerifyOtpDto, RefreshTokenDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard, Roles } from './guards/roles.guard';
import { OtpRateLimit, OtpRateLimitGuard } from './guards/otp-rate-limit.guard';
import { RateLimit, RateLimitGuard } from '../common/rate-limit.guard';
import { Role } from '@prisma/client';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('send-otp')
  @UseGuards(OtpRateLimitGuard)
  @OtpRateLimit('send', 5, 15 * 60) // 5 sends per 15 min per email/IP
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to email' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  async sendOtp(@Body() dto: SendOtpDto) {
    await this.authService.generateOtp(dto.email);
    return {
      success: true,
      message: 'OTP sent successfully! Please check your email.',
      email: dto.email,
    };
  }

  @Post('verify-otp')
  @UseGuards(OtpRateLimitGuard)
  @OtpRateLimit('verify', 5, 15 * 60) // 5 verification attempts per 15 min per email/IP
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const verified = await this.authService.verifyOtp(dto.email, dto.otp);
    if (!verified) {
      throw new UnauthorizedException('Invalid OTP');
    }

    const user = await this.authService.findOrCreateUser(dto.email);
    const tokens = await this.authService.generateTokens(
      user.id,
      user.email,
      user.role,
    );

    this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

    return {
      success: true,
      message: 'Login successful',
      user: { id: user.id, email: user.email, role: user.role, name: user.name },
    };
  }

  @Post('refresh')
  @UseGuards(RateLimitGuard)
  @RateLimit('auth_refresh', 30, 15 * 60)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.refreshTokens(dto.refreshToken);
    this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

    return { success: true, message: 'Token refreshed' };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke tokens' })
  async logout(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(req.user.sub);
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    return { success: true, message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Get current user' })
  getMe(@Req() req: any) {
    return { user: req.user };
  }

  private setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }
}
