import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role, ReviewStatus } from '@prisma/client';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get reviews for a product' })
  async getByProduct(@Param('productId', ParseIntPipe) productId: number) {
    const result = await this.reviewsService.getByProduct(productId);
    return { success: true, ...result };
  }

  @Get('product/:productId/admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all reviews for a product (admin)' })
  async getByProductAdmin(@Param('productId', ParseIntPipe) productId: number) {
    const result = await this.reviewsService.getByProductAdmin(productId);
    return { success: true, ...result };
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Get current user reviews' })
  async getMyReviews(@Request() req: any) {
    const reviews = await this.reviewsService.getMyReviews(req.user.sub);
    return { success: true, reviews };
  }

  @Get('product/:productId/can-review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Check if user can review a product' })
  async canReview(@Request() req: any, @Param('productId', ParseIntPipe) productId: number) {
    return this.reviewsService.canReview(req.user.sub, productId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Create a review' })
  async create(
    @Request() req: any,
    @Body('productId') productId: number,
    @Body('rating') rating: number,
    @Body('comment') comment?: string,
    @Body('title') title?: string,
  ) {
    return this.reviewsService.create(req.user.sub, productId, rating, comment, title);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Update a review' })
  async update(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { rating?: number; comment?: string; title?: string },
  ) {
    return this.reviewsService.update(req.user.sub, id, body);
  }

  @Patch(':id/moderate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Moderate a review (admin)' })
  async moderate(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: ReviewStatus,
  ) {
    return this.reviewsService.moderate(id, status);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Delete a review' })
  async delete(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.delete(req.user.sub, id);
  }
}
