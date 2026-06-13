import { SetMetadata } from '@nestjs/common';
import { Role } from '@wh/shared';

export const ROLES_KEY = 'roles';

/** Restrict a route to specific admin roles, e.g. @Roles(Role.OWNER). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
