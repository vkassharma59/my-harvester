import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from '../admins/admin.schema';
import { SubscriptionPayment } from './subscription-payment.schema';
import { Tenant } from './tenant.schema';
import { TenantsService } from './tenants.service';

/**
 * Owns the tenant / subscription domain (the super-admin's business records).
 * Exports TenantsService so the super-admin module and the expiry guard can
 * provision, read, and gate tenants.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Tenant, SubscriptionPayment, Admin])],
  providers: [TenantsService],
  exports: [TenantsService, TypeOrmModule],
})
export class TenantsModule {}
