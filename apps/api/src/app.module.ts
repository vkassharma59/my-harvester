import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from './common/common.module';
import { ensureDatabase } from './common/ensure-database';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import configuration, { AppConfig } from './config/configuration';
import { AccountRequestsModule } from './modules/account-requests/account-requests.module';
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
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService<AppConfig, true>) => {
        const mysql = config.get('mysql', { infer: true });
        // Provision the database itself before connecting; `synchronize` then
        // creates/updates all tables from the entities on startup.
        await ensureDatabase(mysql);
        return {
          type: 'mysql' as const,
          host: mysql.host,
          port: mysql.port,
          username: mysql.username,
          password: mysql.password,
          database: mysql.database,
          autoLoadEntities: true,
          synchronize: true,
        };
      },
    }),
    CommonModule,
    AuthModule,
    AccountRequestsModule,
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
