import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '@wh/shared';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  /** The tenant (owner) this user belongs to — used to scope every query. */
  tenantId: string;
  /** Harvesters a staff admin may access. Empty/ignored for OWNER. */
  harvesterIds: string[];
}

/** Pulls the authenticated admin (set by JwtStrategy) off the request. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthUser;
  },
);
