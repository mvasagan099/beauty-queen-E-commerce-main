import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { CsrfService } from './csrf.service';
import { CsrfGuard } from './csrf.guard';

describe('CsrfService', () => {
  let service: CsrfService;

  const mockConfig = (overrides: Record<string, string | undefined> = { CSRF_SECRET: 'test-csrf-secret' }) => ({
    get: jest.fn((key: string) => overrides[key]),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CsrfService,
        { provide: ConfigService, useValue: mockConfig() },
      ],
    }).compile();

    service = module.get<CsrfService>(CsrfService);
  });

  it('generates a token that verifies', () => {
    const token = service.generateToken();
    expect(token).toBeTruthy();
    expect(token.includes('.')).toBe(true);
    expect(service.verifyToken(token)).toBe(true);
  });

  it('maintains a stable fallback secret when CSRF_SECRET is unset', async () => {
    const module = await Test.createTestingModule({
      providers: [
        CsrfService,
        { provide: ConfigService, useValue: mockConfig({}) },
      ],
    }).compile();
    const fallbackService = module.get<CsrfService>(CsrfService);
    const token = fallbackService.generateToken();
    expect(fallbackService.verifyToken(token)).toBe(true);
  });

  it('rejects a tampered token (token tampering resistance)', () => {
    const token = service.generateToken();
    const [value] = token.split('.');
    const tampered = `${value}.AAAA`;
    expect(service.verifyToken(tampered)).toBe(false);
  });

  it('rejects empty/malformed tokens', () => {
    expect(service.verifyToken(undefined)).toBe(false);
    expect(service.verifyToken('')).toBe(false);
    expect(service.verifyToken('no-dot-here')).toBe(false);
  });

  it('produces distinct tokens each call', () => {
    expect(service.generateToken()).not.toEqual(service.generateToken());
  });

  it('validates only when cookie and header match', () => {
    const token = service.generateToken();
    const req = {
      headers: { 'x-csrf-token': token },
      cookies: { csrf_token: token },
    } as any;
    expect(service.validate(req)).toBe(true);

    const other = service.generateToken();
    const reqMismatch = {
      headers: { 'x-csrf-token': other },
      cookies: { csrf_token: token },
    } as any;
    expect(service.validate(reqMismatch)).toBe(false);
  });

  describe('CsrfGuard', () => {
    const makeCtx = (req: any) =>
      ({
        switchToHttp: () => ({ getRequest: () => req }),
      }) as any;

    it('allows safe GET requests without CSRF header', () => {
      const guard = new CsrfGuard(service);
      expect(guard.canActivate(makeCtx({ method: 'GET', headers: {}, cookies: {} }))).toBe(true);
    });

    it('allows pure Bearer-authenticated API requests without auth cookies', () => {
      const guard = new CsrfGuard(service);
      expect(
        guard.canActivate(
          makeCtx({
            method: 'POST',
            headers: { authorization: 'Bearer jwt-token' },
            cookies: {},
          }),
        ),
      ).toBe(true);
    });

    it('blocks cookie-authenticated POST requests missing x-csrf-token', () => {
      const guard = new CsrfGuard(service);
      expect(() =>
        guard.canActivate(
          makeCtx({
            method: 'POST',
            headers: {},
            cookies: { access_token: 'cookie-jwt' },
          }),
        ),
      ).toThrow(ForbiddenException);
    });

    it('allows cookie-authenticated POST requests with matching double-submit token', () => {
      const guard = new CsrfGuard(service);
      const token = service.generateToken();
      expect(
        guard.canActivate(
          makeCtx({
            method: 'POST',
            headers: { 'x-csrf-token': token },
            cookies: { access_token: 'cookie-jwt', csrf_token: token },
          }),
        ),
      ).toBe(true);
    });
  });
});
