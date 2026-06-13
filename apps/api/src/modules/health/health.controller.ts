import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';

/** Public liveness check — no auth, safe to hit from a browser / load balancer. */
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'wheat-harvester-api',
      time: new Date().toISOString(),
    };
  }
}
