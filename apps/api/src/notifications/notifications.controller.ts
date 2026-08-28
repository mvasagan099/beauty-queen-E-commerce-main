import { Controller, Get, Patch, Put, Param, UseGuards, Request, ParseIntPipe, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { InAppNotificationService } from './email/in-app-notification.service';
import { UpdateNotificationPreferencesDto } from './dto/notification-preferences.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('Notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private notificationsService: NotificationsService,
    private inAppNotificationService: InAppNotificationService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getNotifications(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);
    const result = await this.inAppNotificationService.getNotifications(
      req.user.sub,
      pageNum,
      limitNum,
    );
    return { success: true, ...result };
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@Request() req: any) {
    const count = await this.inAppNotificationService.getUnreadCount(req.user.sub);
    return { success: true, count };
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.inAppNotificationService.markAsRead(req.user.sub, id);
    return { success: true, message: 'Notification marked as read' };
  }

  @Patch('read-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Request() req: any) {
    await this.inAppNotificationService.markAllAsRead(req.user.sub);
    return { success: true, message: 'All notifications marked as read' };
  }

  @Get('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get notification preferences' })
  async getPreferences(@Request() req: any) {
    const preferences = await this.notificationsService.getPreferences(req.user.sub);
    return { success: true, preferences };
  }

  @Put('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update notification preferences' })
  async updatePreferences(@Request() req: any, @Body() dto: UpdateNotificationPreferencesDto) {
    const preferences = await this.notificationsService.updatePreferences(req.user.sub, dto);
    return { success: true, message: 'Notification preferences updated', preferences };
  }
}
