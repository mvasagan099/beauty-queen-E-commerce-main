import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { ImageService } from '../common/image.service';

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsService, ImageService],
})
export class ReviewsModule {}
