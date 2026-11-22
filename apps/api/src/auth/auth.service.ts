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

  private hashRefreshToken(token: string): string {
    return `sha256:${crypto.createHash('sha256').update(token).digest('hex')}`;
  }

  private async verifyRefreshTokenHash(token: string, storedHash: string): Promise<boolean> {
    if (storedHash.startsWith('sha256:')) {
      const expected = Buffer.from(this.hashRefreshToken(token), 'utf8');
      const actual = Buffer.from(storedHash, 'utf8');
      return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
    }
    // Backward compatibility for legacy bcrypt-hashed refresh tokens during rollout
    return bcrypt.compare(token, storedHash);
  }

  async generateOtp(email: string): Promise<string> {
    const normalizedEmail = email.trim().toLowerCase();
    const otp = crypto.randomInt(100000, 999999).toString();
    const ttl = 300; // 5 minutes
    await this.redis.set(`otp:${normalizedEmail}`, otp, ttl);
    await this.redis.set(`otp:attempts:${normalizedEmail}`, '0', ttl);

    await this.notificationsService.notifyOtpRequested(normalizedEmail, otp);

    return otp;
  }

  async verifyOtp(email: string, otp: string): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    const storedOtp = await this.redis.get(`otp:${normalizedEmail}`);
    if (!storedOtp) {
      throw new UnauthorizedException('OTP expired or not found');
    }

    const attempts = parseInt(await this.redis.get(`otp:attempts:${normalizedEmail}`) || '0', 10);
    if (attempts >= 5) {
      throw new UnauthorizedException('Too many attempts. Please request a new OTP.');
    }

    const expectedBuf = Buffer.from(storedOtp, 'utf8');
    const providedBuf = Buffer.from(String(otp || '').trim(), 'utf8');
    const isMatch =
      expectedBuf.length === providedBuf.length &&
      crypto.timingSafeEqual(expectedBuf, providedBuf);

    if (!isMatch) {
      await this.redis.incr(`otp:attempts:${normalizedEmail}`);
      throw new UnauthorizedException('Invalid OTP');
    }

    await this.redis.del(`otp:${normalizedEmail}`);
    await this.redis.del(`otp:attempts:${normalizedEmail}`);
    return true;
  }

  async findOrCreateUser(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    let user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, role: true, name: true },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: { email: normalizedEmail, role: Role.CUSTOMER },
        select: { id: true, email: true, role: true, name: true },
      });
      this.logger.log(`New user created: ${normalizedEmail}`);
    }

    return user;
  }

  async verifyGoogleCredential(credential: string) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      throw new UnauthorizedException('Google sign-in is not configured on this server');
    }
    const token = (credential || '').trim();
    if (!token) {
      throw new UnauthorizedException('Missing Google credential');
    }

    let payload: {
      aud?: string;
      email?: string;
      email_verified?: string | boolean;
      name?: string;
    };
    try {
      const res = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`,
      );
      if (!res.ok) {
        throw new UnauthorizedException('Invalid Google token');
      }
      payload = (await res.json()) as any;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Failed to verify Google credential');
    }

    const emailVerified =
      payload.email_verified === true || payload.email_verified === 'true';
    if (payload.aud !== clientId || !payload.email || !emailVerified) {
      throw new UnauthorizedException('Unverified or mismatched Google token');
    }

    const normalizedEmail = payload.email.trim().toLowerCase();
    let user = await this.findOrCreateUser(normalizedEmail);
    if (!user.name && payload.name) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { name: payload.name.trim().slice(0, 120) },
        select: { id: true, email: true, role: true, name: true },
      });
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
      this.jwtService.signAsync(
        { ...payload, jti: crypto.randomUUID() },
        {
          secret: refreshSecret,
          expiresIn: '7d',
        },
      ),
    ]);

    // Hash the entire JWT with SHA-256 (avoids bcrypt's 72-byte truncation on JWTs)
    const tokenHash = this.hashRefreshToken(refreshToken);
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
        const isValid = await this.verifyRefreshTokenHash(refreshToken, stored.token);
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
