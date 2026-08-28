import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../common/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: Record<string, any>;
  let jwtService: Record<string, any>;
  let configService: Record<string, any>;
  let redis: Record<string, any>;
  let notificationsService: Record<string, any>;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      seller: {
        findUnique: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    jwtService = {
      signAsync: jest.fn(),
      verify: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, string> = {
          JWT_ACCESS_SECRET: 'test-access-secret-min-32-chars-long!!',
          JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-chars-long!!',
        };
        return config[key] ?? defaultValue;
      }),
    };

    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      incr: jest.fn(),
    };

    notificationsService = {
      notifyOtpRequested: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: RedisService, useValue: redis },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('generateOtp', () => {
    it('should generate a 6-digit OTP using crypto', async () => {
      redis.set.mockResolvedValue(undefined);
      notificationsService.notifyOtpRequested.mockResolvedValue(undefined);

      const otp = await service.generateOtp('test@example.com');

      expect(otp).toMatch(/^\d{6}$/);
      expect(parseInt(otp)).toBeGreaterThanOrEqual(100000);
      expect(parseInt(otp)).toBeLessThanOrEqual(999999);
      expect(redis.set).toHaveBeenCalledWith('otp:test@example.com', otp, 300);
      expect(redis.set).toHaveBeenCalledWith('otp:attempts:test@example.com', '0', 300);
    });

    it('should send OTP via notifications service', async () => {
      redis.set.mockResolvedValue(undefined);
      notificationsService.notifyOtpRequested.mockResolvedValue(undefined);

      await service.generateOtp('test@example.com');

      expect(notificationsService.notifyOtpRequested).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
      );
    });
  });

  describe('verifyOtp', () => {
    it('should verify a valid OTP', async () => {
      redis.get.mockResolvedValueOnce('123456');
      redis.get.mockResolvedValueOnce('0');
      redis.del.mockResolvedValue(undefined);

      const result = await service.verifyOtp('test@example.com', '123456');

      expect(result).toBe(true);
      expect(redis.del).toHaveBeenCalledWith('otp:test@example.com');
      expect(redis.del).toHaveBeenCalledWith('otp:attempts:test@example.com');
    });

    it('should throw for expired OTP', async () => {
      redis.get.mockResolvedValue(null);

      await expect(service.verifyOtp('test@example.com', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw for invalid OTP', async () => {
      redis.get.mockResolvedValueOnce('123456');
      redis.get.mockResolvedValueOnce('0');
      redis.incr.mockResolvedValue(1);

      await expect(service.verifyOtp('test@example.com', '999999')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw after 5 failed attempts', async () => {
      redis.get.mockResolvedValueOnce('123456');
      redis.get.mockResolvedValueOnce('5');

      await expect(service.verifyOtp('test@example.com', '999999')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('findOrCreateUser', () => {
    it('should return existing user', async () => {
      const existingUser = { id: 1, email: 'test@example.com', role: 'CUSTOMER', name: null };
      prisma.user.findUnique.mockResolvedValue(existingUser);

      const result = await service.findOrCreateUser('test@example.com');

      expect(result).toEqual(existingUser);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should create new user if not exists', async () => {
      const newUser = { id: 2, email: 'new@example.com', role: 'CUSTOMER', name: null };
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(newUser);

      const result = await service.findOrCreateUser('new@example.com');

      expect(result).toEqual(newUser);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { email: 'new@example.com', role: 'CUSTOMER' },
        select: { id: true, email: true, role: true, name: true },
      });
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      jwtService.signAsync.mockResolvedValue('mock-token');
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.generateTokens(1, 'test@example.com', 'CUSTOMER');

      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });

    it('should require JWT secrets', async () => {
      configService.get.mockReturnValue(undefined);

      await expect(service.generateTokens(1, 'test@example.com', 'CUSTOMER')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const payload = { sub: 1, email: 'test@example.com', role: 'CUSTOMER' };
      jwtService.verify.mockReturnValue(payload);

      const storedToken = { id: 1, token: 'hashed-token', expiresAt: new Date(Date.now() + 86400000), revoked: false };
      prisma.refreshToken.findMany.mockResolvedValue([storedToken]);

      // Mock bcrypt.compare
      const bcrypt = require('bcryptjs');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      const user = { id: 1, email: 'test@example.com', role: 'CUSTOMER' };
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.refreshToken.update.mockResolvedValue({});

      jwtService.signAsync.mockResolvedValue('new-token');
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refreshTokens('mock-refresh-token');

      expect(result.accessToken).toBe('new-token');
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { revoked: true },
      });

      jest.restoreAllMocks();
    });

    it('should revoke all tokens on reuse detection', async () => {
      const payload = { sub: 1, email: 'test@example.com', role: 'CUSTOMER' };
      jwtService.verify.mockReturnValue(payload);

      prisma.refreshToken.findMany.mockResolvedValue([]);

      await expect(service.refreshTokens('reused-token')).rejects.toThrow(UnauthorizedException);

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        data: { revoked: true },
      });
    });
  });

  describe('logout', () => {
    it('should revoke all refresh tokens for user', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({});

      await service.logout(1);

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        data: { revoked: true },
      });
    });
  });
});
