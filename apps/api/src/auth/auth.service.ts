import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redis: RedisService,
    private notificationsService: NotificationsService,
  ) {}

  async generateOtp(email: string): Promise<string> {
    const otp = crypto.randomInt(100000, 999999).toString();
    const ttl = 300; // 5 minutes
    await this.redis.set(`otp:${email}`, otp, ttl);
    await this.redis.set(`otp:attempts:${email}`, '0', ttl);

    await this.notificationsService.notifyOtpRequested(email, otp);

    return otp;
  }

  async verifyOtp(email: string, otp: string): Promise<boolean> {
    const storedOtp = await this.redis.get(`otp:${email}`);
    if (!storedOtp) {
      throw new UnauthorizedException('OTP expired or not found');
    }

    const attempts = parseInt(await this.redis.get(`otp:attempts:${email}`) || '0');
    if (attempts >= 5) {
      throw new UnauthorizedException('Too many attempts. Please request a new OTP.');
    }

    if (storedOtp !== otp) {
      await this.redis.incr(`otp:attempts:${email}`);
      throw new UnauthorizedException('Invalid OTP');
    }

    await this.redis.del(`otp:${email}`);
    await this.redis.del(`otp:attempts:${email}`);
    return true;
  }

  async findOrCreateUser(email: string) {
    let user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, name: true },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: { email, role: Role.CUSTOMER },
        select: { id: true, email: true, role: true, name: true },
      });
      this.logger.log(`New user created: ${email}`);
    }

    return user;
  }

  async generateTokens(userId: number, email: string, role: Role) {
    const payload = { sub: userId, email, role };

    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!accessSecret || !refreshSecret) {
      throw new UnauthorizedException('JWT secrets not configured');
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: '7d',
      }),
    ]);

    // Store refresh token hash
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        token: tokenHash,
        userId,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
      if (!refreshSecret) {
        throw new UnauthorizedException('JWT refresh secret not configured');
      }

      const payload = this.jwtService.verify(refreshToken, {
        secret: refreshSecret,
      });

      // Find and validate refresh token
      const storedTokens = await this.prisma.refreshToken.findMany({
        where: { userId: payload.sub, revoked: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      let validToken = null;
      for (const stored of storedTokens) {
        const isValid = await bcrypt.compare(refreshToken, stored.token);
        if (isValid) {
          validToken = stored;
          break;
        }
      }

      if (!validToken) {
        // Potential token reuse - revoke all tokens
        await this.prisma.refreshToken.updateMany({
          where: { userId: payload.sub },
          data: { revoked: true },
        });
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (new Date() > validToken.expiresAt) {
        throw new UnauthorizedException('Refresh token expired');
      }

      // Revoke old token (rotation)
      await this.prisma.refreshToken.update({
        where: { id: validToken.id },
        data: { revoked: true },
      });

      // Generate new tokens
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.generateTokens(user.id, user.email, user.role);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: number) {
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true },
    });
  }

  async getSellerUser(mobile: string) {
    return this.prisma.seller.findFirst({
      where: { mobile },
    });
  }
}
