import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountRequest } from '../account-requests/account-request.schema';
import { Admin } from '../admins/admin.schema';
import { AdminsModule } from '../admins/admins.module';
import { BugReport } from '../bug-reports/bug-report.schema';
import { Customer } from '../customers/customer.schema';
import { Expense } from '../expenses/expense.schema';
import { Harvester } from '../harvesters/harvester.schema';
import { OwnerDetailsModule } from '../owner-details/owner-details.module';
import { Payment } from '../payments/payment.schema';
import { Plot } from '../plots/plot.schema';
import { SubscriptionPayment } from '../tenants/subscription-payment.schema';
import { Tenant } from '../tenants/tenant.schema';
import { TenantsModule } from '../tenants/tenants.module';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';

/** Cross-tenant console for the platform operator (SUPER_ADMIN). */
@Module({
  imports: [
    AdminsModule,
    TenantsModule,
    OwnerDetailsModule,
    TypeOrmModule.forFeature([
      Tenant,
      SubscriptionPayment,
      Admin,
      Harvester,
      Plot,
      Customer,
      Expense,
      Payment,
      AccountRequest,
      BugReport,
    ]),
  ],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
})
export class SuperAdminModule {}
