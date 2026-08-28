import { Global, Module } from '@nestjs/common';
import { CsrfService } from './csrf.service';
import { CsrfGuard } from './csrf.guard';
import { CsrfController } from './csrf.controller';

@Global()
@Module({
  providers: [CsrfService, CsrfGuard],
  exports: [CsrfService, CsrfGuard],
  controllers: [CsrfController],
})
export class CsrfModule {}

export { CsrfService, CsrfGuard };
