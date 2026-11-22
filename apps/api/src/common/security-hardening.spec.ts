import { UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { AuthService } from '../auth/auth.service';
import { JwtStrategy } from '../auth/jwt.strategy';
import { CsrfGuard } from './csrf/csrf.guard';
import { CsrfService } from './csrf/csrf.service';
import { FinanceService } from '../finance/finance.service';
import { resolveProductSize } from './product-size.util';

describe('Security Hardening Regression Suite', () => {
  describe('Refresh Token Full-JWT Hashing (anti bcrypt 72-byte truncation)', () => {
    it('distinguishes two >120-byte JWTs that share an identical 80-byte prefix', async () => {
      const storedHashes: string[] = [];
      const prisma: any = {
        refreshToken: {
          create: jest.fn(async ({ data }: any) => {
            storedHashes.push(data.token);
            return { id: 1, ...data };
          }),
          findMany: jest.fn(async () => [
            {
              id: 1,
              token: storedHashes[0],
              expiresAt: new Date(Date.now() + 86400_000),
              revoked: false,
            },
          ]),
          update: jest.fn(async () => ({})),
          updateMany: jest.fn(async () => ({})),
        },
        user: {
          findUnique: jest.fn(async () => ({ id: 1, email: 'queen@example.com', role: 'CUSTOMER' })),
        },
      };

      const sharedPrefix = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + 'A'.repeat(60);
      const tokenA = `${sharedPrefix}.signature-A-unique-tail`;
      const tokenB = `${sharedPrefix}.signature-B-different-tail`;

      const jwtService: any = {
        signAsync: jest.fn().mockResolvedValueOnce('access-token').mockResolvedValueOnce(tokenA),
        verify: jest.fn().mockReturnValue({ sub: 1, email: 'queen@example.com', role: 'CUSTOMER' }),
      };
      const configService: any = {
        get: jest.fn((key: string) =>
          key.includes('SECRET') ? 'super-strong-test-secret-32-chars-minimum' : undefined,
        ),
      };
      const redis: any = { get: jest.fn(), set: jest.fn(), del: jest.fn(), incr: jest.fn() };
      const notifications: any = { notifyOtpRequested: jest.fn() };

      const authService = new AuthService(prisma, jwtService, configService, redis, notifications);
      await authService.generateTokens(1, 'queen@example.com', 'CUSTOMER' as any);

      expect(storedHashes[0]).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(storedHashes[0]).toBe(
        `sha256:${crypto.createHash('sha256').update(tokenA).digest('hex')}`,
      );

      // Token B shares the first 97 bytes with Token A, but MUST be rejected and trigger revocation
      await expect(authService.refreshTokens(tokenB)).rejects.toThrow(UnauthorizedException);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        data: { revoked: true },
      });
    });

    it('normalizes email case when generating and verifying OTPs', async () => {
      const kv = new Map<string, string>();
      const redis: any = {
        set: jest.fn(async (k: string, v: string) => kv.set(k, v)),
        get: jest.fn(async (k: string) => kv.get(k) ?? null),
        del: jest.fn(async (k: string) => kv.delete(k)),
        incr: jest.fn(async (k: string) => {
          const next = String(Number(kv.get(k) || '0') + 1);
          kv.set(k, next);
          return Number(next);
        }),
      };
      const authService = new AuthService(
        {} as any,
        {} as any,
        { get: jest.fn() } as any,
        redis,
        { notifyOtpRequested: jest.fn() } as any,
      );

      const otp = await authService.generateOtp('  Queen@Example.COM ');
      await expect(authService.verifyOtp('queen@example.com', otp)).resolves.toBe(true);
    });
  });

  describe('JwtStrategy Seller Active Enforcement', () => {
    it('rejects JWTs belonging to a deactivated seller immediately', async () => {
      const configService: any = {
        get: jest.fn(() => 'jwt-access-secret-for-security-tests-32chars'),
      };
      const prisma: any = {
        seller: {
          findUnique: jest.fn(async () => ({
            id: 42,
            email: 'seller@example.com',
            sellername: 'Suspended Silk House',
            isActive: false,
          })),
        },
      };

      const strategy = new JwtStrategy(configService, prisma);
      await expect(
        strategy.validate({ sub: 42, email: 'seller@example.com', role: 'SELLER' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('CsrfGuard Double-Submit & Mobile Bearer Isolation', () => {
    const csrfService = new CsrfService({ get: jest.fn(() => 'csrf-test-secret') } as any);
    const guard = new CsrfGuard(csrfService);

    const makeCtx = (req: any) =>
      ({
        switchToHttp: () => ({ getRequest: () => req }),
      }) as any;

    it('blocks cookie-authenticated POST without CSRF token', () => {
      expect(() =>
        guard.canActivate(
          makeCtx({
            method: 'POST',
            headers: {},
            cookies: { access_token: 'jwt-cookie' },
          }),
        ),
      ).toThrow(ForbiddenException);
    });

    it('allows pure Bearer-token mobile requests with no auth cookies', () => {
      expect(
        guard.canActivate(
          makeCtx({
            method: 'POST',
            headers: { authorization: 'Bearer mobile-jwt-token' },
            cookies: {},
          }),
        ),
      ).toBe(true);
    });

    it('blocks hybrid requests that send both Bearer header and auth cookie without CSRF token', () => {
      expect(() =>
        guard.canActivate(
          makeCtx({
            method: 'POST',
            headers: { authorization: 'Bearer forged' },
            cookies: { access_token: 'victim-cookie' },
          }),
        ),
      ).toThrow(ForbiddenException);
    });
  });

  describe('CSV Formula Injection Neutralization (GSTR-1)', () => {
    it('neutralizes spreadsheet formula prefixes and escapes commas/quotes', () => {
      const finance = new FinanceService({} as any);
      const csv = finance.formatGstr1Csv({
        month: '2026-11',
        gstin: '33AAACB0000A1Z5',
        legalName: 'Beauty Queen',
        invoiceCount: 2,
        totals: { taxableValue: 1000, cgst: 60, sgst: 60, igst: 0, totalTax: 120, totalValue: 1120 },
        hsnSummary: [
          {
            hsn: '5407',
            category: '=CMD("calc"),"Silk"',
            gstRate: 12,
            quantity: 1,
            taxableValue: 1000,
            cgst: 60,
            sgst: 60,
            igst: 0,
            totalValue: 1120,
          },
          {
            hsn: '3304',
            category: '+SUM(A1:A2)',
            gstRate: 18,
            quantity: 1,
            taxableValue: 500,
            cgst: 45,
            sgst: 45,
            igst: 0,
            totalValue: 590,
          },
        ],
      });

      const lines = csv.split('\n');
      expect(lines[1]).toContain('"\'=CMD(""calc""),""Silk"""');
      expect(lines[2]).toContain("'+SUM(A1:A2)");
    });
  });

  describe('SQL Column Allowlist Protection', () => {
    it('rejects SQL injection payloads passed as product sizes', () => {
      const payloads = [
        'size_s; DROP TABLE products;--',
        "' OR '1'='1",
        'quantity UNION SELECT password FROM sellers',
        '../etc/passwd',
      ];
      for (const payload of payloads) {
        expect(() => resolveProductSize(payload)).toThrow(BadRequestException);
      }
    });
  });
});
