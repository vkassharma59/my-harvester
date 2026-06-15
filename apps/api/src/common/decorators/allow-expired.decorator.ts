import { SetMetadata } from '@nestjs/common';

export const ALLOW_EXPIRED_KEY = 'allowExpired';

/**
 * Marks a write route as exempt from the subscription paywall, so it works even
 * when the tenant's subscription has expired/been suspended (e.g. reporting a
 * bug — a blocked user must still be able to tell us they're blocked).
 */
export const AllowExpired = () => SetMetadata(ALLOW_EXPIRED_KEY, true);
