import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAuditLogsController } from './admin-audit-logs.controller';
import { AdminExportsController } from './admin-exports.controller';
import { AdminExportsService } from './admin-exports.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [AdminController, AdminAuditLogsController, AdminExportsController],
  providers: [AdminService, AdminExportsService],
})
export class AdminModule {}
