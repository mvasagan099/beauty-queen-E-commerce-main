import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { CsrfService } from './csrf.service';

/**
 * CSRF double-submit guard.
 *
 * Place on state-changing endpoints (POST/PUT/PATCH/DELETE) that you have
 * opted into CSRF protection. The client must mirror the `csrf_token` cookie
 * into the `x-csrf-token` header. Enabling this guard on a route requires the
 * frontend to send that header; adopt it deliberately, not blindly.
 *
 * Note: cookie-authenticated requests are already protected against ordinary
 * cross-site requests by `SameSite=Lax`. This guard is additional, opt-in
 * defense-in-depth.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private csrfService: CsrfService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!this.csrfService.validate(request)) {
      throw new ForbiddenException('Invalid or missing CSRF token');
    }
    return true;
  }
}
