import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ImageService } from '../common/image.service';
import { SearchModule } from '../search/search.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule, SearchModule],
  controllers: [ProductsController],
  providers: [ProductsService, ImageService],
  exports: [ProductsService],
})
export class ProductsModule {}
