import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CsrfService } from './csrf.service';

describe('CsrfService', () => {
  let service: CsrfService;

  const mockConfig = () => {
    const config = { CSRF_SECRET: 'test-csrf-secret' };
    return { get: jest.fn((key: string) => (config as any)[key]) };
  };

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

    // Mismatch between cookie and header fails
    const other = service.generateToken();
    const reqMismatch = {
      headers: { 'x-csrf-token': other },
      cookies: { csrf_token: token },
    } as any;
    expect(service.validate(reqMismatch)).toBe(false);
  });
});
