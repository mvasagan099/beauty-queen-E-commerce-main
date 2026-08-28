import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { CsrfService } from './csrf.service';

/**
 * CSRF token issuance endpoint.
 *
 * On GET it sets a `csrf_token` cookie (JS-readable). Clients that have opted
 * into CSRF protection mirror this cookie into the `x-csrf-token` header on
 * protected state-changing requests. The cookie/header pair is verified by
 * `CsrfGuard`.
 */
@ApiTags('Security')
@Controller('csrf')
export class CsrfController {
  constructor(private csrfService: CsrfService) {}

  @Get()
  @ApiOperation({ summary: 'Issue a CSRF token cookie (opt-in double-submit)' })
  issueToken(@Res({ passthrough: true }) res: Response) {
    const token = this.csrfService.setCookie(res);
    return { success: true, csrfToken: token };
  }
}
