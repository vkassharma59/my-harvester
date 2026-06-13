import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import configuration, { AppConfig } from './config/configuration';
import { AdminsModule } from './modules/admins/admins.module';
import { AgentsModule } from './modules/agents/agents.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AuthModule } from './modules/auth/auth.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ExpenseCategoriesModule } from './modules/expense-categories/expense-categories.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { FuelPumpsModule } from './modules/fuel-pumps/fuel-pumps.module';
import { HarvestersModule } from './modules/harvesters/harvesters.module';
import { HealthModule } from './modules/health/health.module';
import { LabourModule } from './modules/labour/labour.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PlotsModule } from './modules/plots/plots.module';
import { SettingsModule } from './modules/settings/settings.module';
import { UploadsModule } from './modules/uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        uri: config.get('mongoUri', { infer: true }),
      }),
    }),
    AuthModule,
    AdminsModule,
    HarvestersModule,
    CustomersModule,
    SettingsModule,
    ExpensesModule,
    ExpenseCategoriesModule,
    FuelPumpsModule,
    LabourModule,
    AttendanceModule,
    AgentsModule,
    PlotsModule,
    PaymentsModule,
    DashboardModule,
    MaintenanceModule,
    UploadsModule,
    HealthModule,
  ],
  providers: [
    // Every route requires a valid JWT unless marked @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
