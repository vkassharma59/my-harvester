import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Admin } from '@wh/shared';
import { AdminsService } from '../admins/admins.service';
import { JwtPayload } from './jwt.strategy';
import { LoginDto } from './dto/login.dto';

export interface LoginResult {
  accessToken: string;
  admin: Admin;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly admins: AdminsService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResult> {
    const admin = await this.admins.findByIdentifierWithHash(dto.identifier);
    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      tenantId: admin.tenantId,
    };
    // Strip the password hash before returning the admin to the client.
    const { passwordHash: _hash, ...safe } = admin;
    return {
      accessToken: await this.jwt.signAsync(payload),
      admin: safe as unknown as Admin,
    };
  }
}
