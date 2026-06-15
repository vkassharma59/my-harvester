import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, SubscriptionStatus } from '@wh/shared';
import { Tenant } from '../../modules/tenants/tenant.schema';
import { deriveStatus } from '../../modules/tenants/tenants.service';
import { ALLOW_EXPIRED_KEY } from '../decorators/allow-expired.decorator';
import { AuthUser } from '../decorators/current-user.decorator';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Enforces the subscription paywall: an EXPIRED or SUSPENDED tenant becomes
 * read-only — reads still work so owners keep full visibility of their data
 * (their customers, ledgers, balances), but writes are blocked until they renew.
 *
 * Returns HTTP 402 with a stable `code` so the mobile app can recognise it and
 * show a "renew" prompt instead of retrying the offline outbox forever. Runs as
 * a global guard AFTER JwtAuthGuard (so req.user is populated); SUPER_ADMIN and
 * public/read routes are exempt.
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionGuard.name);

  constructor(
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ method: string; user?: AuthUser }>();

    if (READ_METHODS.has(req.method)) return true; // reads are always allowed
    // Routes explicitly allowed when expired (e.g. reporting a bug).
    if (this.reflector.getAllAndOverride<boolean>(ALLOW_EXPIRED_KEY, [context.getHandler(), context.getClass()])) {
      return true;
    }
    const user = req.user;
    if (!user) return true; // public route (no authenticated tenant)
    if (user.role === Role.SUPER_ADMIN) return true; // operator has no tenant scope

    const tenant = await this.tenants.findOne({ where: { id: user.tenantId } });
    if (!tenant) {
      // Fail open: don't lock a user out over a missing metadata row.
      this.logger.warn(`No tenant row for ${user.tenantId}; allowing write.`);
      return true;
    }

    if (tenant.status === SubscriptionStatus.SUSPENDED) {
      throw this.blocked('SUBSCRIPTION_SUSPENDED', 'This account has been suspended. Please contact support.');
    }
    // Recompute from the dates so a trial that lapsed since the row was last
    // written is treated as expired even if its stored status still says TRIAL.
    if (deriveStatus(tenant) === SubscriptionStatus.EXPIRED) {
      throw this.blocked(
        'SUBSCRIPTION_EXPIRED',
        'Your subscription has expired. Renew to continue adding new records — your existing data is safe.',
      );
    }
    return true;
  }

  private blocked(code: string, message: string): HttpException {
    return new HttpException(
      { statusCode: HttpStatus.PAYMENT_REQUIRED, code, message },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
