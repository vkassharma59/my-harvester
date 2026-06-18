import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '@wh/shared';
import { AppConfig } from '../../config/configuration';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { AdminsService } from '../admins/admins.service';

export interface JwtPayload {
  sub: string;
  /** Absent for staff admins created without an email. */
  email?: string;
  role: Role;
  tenantId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly admins: AdminsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('jwt', { infer: true }).secret,
    });
  }

  /** Runs on every authenticated request; re-checks the admin still exists and is active. */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const admin = await this.admins.findAuthById(payload.sub).catch(() => null);
    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Account is inactive or no longer exists');
    }
    return {
      id: admin.id,
      email: admin.email ?? undefined,
      role: admin.role,
      tenantId: admin.tenantId.toString(),
      harvesterIds: (admin.harvesterIds ?? []).map((h) => h.toString()),
    };
  }
}
