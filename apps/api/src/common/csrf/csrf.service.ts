import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Request, Response } from 'express';

/**
 * Double-submit CSRF token helper.
 *
 * Defense-in-depth for state-changing requests authenticated by httpOnly
 * cookies. A random token is stored as a non-httpOnly (JS-readable) cookie and
 * the client echoes it in the `x-csrf-token` header; the guard compares the
 * two. SameSite=Lax cookies already mitigate ordinary CSRF; this adds a
 * verification layer for higher-risk state-changing endpoints.
 *
 * The token is optional per route so it can be enabled progressively without
 * breaking existing clients - the frontend must mirror the cookie into the
 * `x-csrf-token` header before a route adopts the guard.
 */
@Injectable()
export class CsrfService {
  private readonly logger = new Logger(CsrfService.name);

  constructor(private configService: ConfigService) {}

  private get secret(): string {
    return (
      this.configService.get<string>('CSRF_SECRET') ||
      crypto.randomBytes(32).toString('hex')
    );
  }

  generateToken(): string {
    const value = crypto.randomBytes(32).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(value)
      .digest('base64url');
    return `${value}.${signature}`;
  }

  setCookie(res: Response): string {
    const token = this.generateToken();
    const isProduction = (process.env.NODE_ENV || 'development') === 'production';
    res.cookie('csrf_token', token, {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 1000, // 1 hour
    });
    return token;
  }

  verifyToken(token: string | undefined): boolean {
    if (!token || !token.includes('.')) return false;
    const [value, signature] = token.split('.');
    if (!value || !signature) return false;
    const expected = crypto
      .createHmac('sha256', this.secret)
      .update(value)
      .digest('base64url');
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(sigBuf, expBuf);
  }

  /** Compare the header token to a signed double-submit cookie token. */
  validate(req: Request): boolean {
    const csrfCookie = (req as any).cookies?.csrf_token as string | undefined;
    const headerToken = req.headers['x-csrf-token'] as string | undefined;

    if (!csrfCookie || !headerToken) {
      return false;
    }
    return this.verifyToken(headerToken) && headerToken === csrfCookie;
  }
}
