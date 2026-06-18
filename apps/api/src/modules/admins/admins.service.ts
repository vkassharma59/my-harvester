import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Not, Repository } from 'typeorm';
import { Role } from '@wh/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { LinksService } from '../../common/links.service';
import { newObjectId } from '../../common/object-id';
import { AppConfig } from '../../config/configuration';
import { Admin } from './admin.schema';
import { CreateAdminDto } from './dto/create-admin.dto';
import { ChangePasswordDto, UpdateAdminDto } from './dto/update-admin.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AdminsService implements OnModuleInit {
  private readonly logger = new Logger(AdminsService.name);

  constructor(
    @InjectRepository(Admin) private readonly admins: Repository<Admin>,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly links: LinksService,
  ) {}

  /** Seed the platform super admin and (optionally) a dev OWNER on a fresh DB. */
  async onModuleInit(): Promise<void> {
    // Legacy, idempotent migration of an old role name. (The former
    // 'SUPER_ADMIN' → OWNER rename is intentionally gone: SUPER_ADMIN is now a
    // real, distinct platform role and must not be rewritten.)
    await this.admins.update({ role: 'ADMIN' as Role }, { role: Role.STAFF_ADMIN });

    await this.seedSuperAdmin();
    await this.seedOwner();
  }

  /** Create the platform operator (web-console login) if none exists yet. */
  private async seedSuperAdmin(): Promise<void> {
    const exists = await this.admins.exists({ where: { role: Role.SUPER_ADMIN } });
    if (exists) return;

    const seed = this.config.get('superAdmin', { infer: true });
    if (!seed?.email || !seed?.password) {
      this.logger.warn(
        'No SUPER_ADMIN exists and SUPER_ADMIN_EMAIL/PASSWORD are not set — the web console will have no login until one is seeded.',
      );
      return;
    }
    await this.createAdminAccount(seed.email, seed.password, seed.name ?? 'Super Admin', Role.SUPER_ADMIN);
    this.logger.log(`Bootstrapped SUPER_ADMIN: ${seed.email}`);
  }

  /** Optional dev/owner seed (e.g. for local mobile testing) gated on env. */
  private async seedOwner(): Promise<void> {
    const exists = await this.admins.exists({ where: { role: Role.OWNER } });
    if (exists) return;

    const seed = this.config.get('bootstrapAdmin', { infer: true });
    if (!seed?.email || !seed?.password) return;

    await this.createOwner(seed.email, seed.password, seed.name ?? 'Owner');
    this.logger.log(`Bootstrapped OWNER: ${seed.email}`);
  }

  /**
   * Creates an OWNER whose tenant is itself. Used by the bootstrap and the
   * manual seed script — never exposed over the API.
   */
  createOwner(email: string, password: string, name: string, phone?: string): Promise<Admin> {
    return this.createAdminAccount(email, password, name, Role.OWNER, phone);
  }

  /** Creates an OWNER from an already-hashed password (approving a request). */
  async createOwnerWithHash(
    email: string,
    passwordHash: string,
    name: string,
    phone?: string,
  ): Promise<Admin> {
    return this.persistTenantRoot(email, passwordHash, name, Role.OWNER, phone);
  }

  /**
   * Creates a tenant-root admin (its tenant is itself). Shared by the OWNER and
   * SUPER_ADMIN seeds — both are accounts that own their tenant scope.
   */
  private async createAdminAccount(
    email: string,
    password: string,
    name: string,
    role: Role,
    phone?: string,
  ): Promise<Admin> {
    return this.persistTenantRoot(email, await bcrypt.hash(password, BCRYPT_ROUNDS), name, role, phone);
  }

  private async persistTenantRoot(
    email: string,
    passwordHash: string,
    name: string,
    role: Role,
    phone?: string,
  ): Promise<Admin> {
    const existing = await this.admins.findOne({
      where: [{ email: email.toLowerCase() }, ...(phone ? [{ phone }] : [])],
    });
    if (existing) throw new ConflictException('An admin with this email or mobile already exists');

    const id = newObjectId();
    const admin = this.admins.create({
      id,
      tenantId: id, // a tenant-root admin is its own tenant
      name,
      email: email.toLowerCase(),
      phone: phone ?? null,
      passwordHash,
      role,
      isActive: true,
    });
    const saved = await this.admins.save(admin);
    saved.harvesterIds = []; // tenant-root sees all harvesters; no explicit links
    return saved;
  }

  /** Login lookup — global, by email OR mobile number, includes the password hash. */
  async findByIdentifierWithHash(identifier: string): Promise<Admin | null> {
    const value = identifier.trim();
    const admin = await this.admins
      .createQueryBuilder('a')
      .addSelect('a.passwordHash')
      .where('a.email = :email OR a.phone = :phone', { email: value.toLowerCase(), phone: value })
      .getOne();
    if (admin) await this.links.attachAdminHarvesters([admin]);
    return admin;
  }

  /** True if `password` matches the admin's stored hash (used to re-confirm
   *  the owner before destructive actions). */
  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const admin = await this.admins
      .createQueryBuilder('a')
      .addSelect('a.passwordHash')
      .where('a.id = :id', { id: userId })
      .getOne();
    if (!admin) return false;
    return bcrypt.compare(password, admin.passwordHash);
  }

  /** Auth lookup by id (unscoped) — used by the JWT strategy to validate a token. */
  async findAuthById(id: string): Promise<Admin | null> {
    const admin = await this.admins.findOneBy({ id });
    if (admin) await this.links.attachAdminHarvesters([admin]);
    return admin;
  }

  /** Creates a staff admin within the actor's tenant (owners are seeded only). */
  async create(dto: CreateAdminDto, actor: AuthUser): Promise<Admin> {
    // Email is optional for staff admins (they can sign in by mobile).
    const email = dto.email?.trim().toLowerCase() || null;
    const clash = await this.admins.findOne({
      where: [...(email ? [{ email }] : []), { phone: dto.phone }],
    });
    if (clash) {
      throw new ConflictException(
        clash.phone === dto.phone
          ? 'An admin with this mobile number already exists'
          : 'An admin with this email already exists',
      );
    }
    const admin = this.admins.create({
      id: newObjectId(),
      tenantId: actor.tenantId,
      name: dto.name,
      email,
      phone: dto.phone ?? null,
      passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
      role: Role.STAFF_ADMIN,
      isActive: true,
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    const saved = await this.admins.save(admin);
    const harvesterIds = dto.harvesterIds ?? [];
    await this.links.setAdminHarvesters(saved.id, harvesterIds);
    saved.harvesterIds = harvesterIds;
    return saved;
  }

  async findAll(tenantId: string): Promise<Admin[]> {
    const admins = await this.admins.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
    await this.links.attachAdminHarvesters(admins);
    return admins;
  }

  async findOne(id: string, tenantId: string): Promise<Admin> {
    const admin = await this.admins.findOne({ where: { id, tenantId } });
    if (!admin) throw new NotFoundException('Admin not found');
    await this.links.attachAdminHarvesters([admin]);
    return admin;
  }

  async update(id: string, dto: UpdateAdminDto, actor: AuthUser): Promise<Admin> {
    if (dto.email) {
      const clash = await this.admins.findOne({ where: { email: dto.email.toLowerCase(), id: Not(id) } });
      if (clash) throw new ConflictException('An admin with this email already exists');
    }
    if (dto.phone) {
      const clash = await this.admins.findOne({ where: { phone: dto.phone, id: Not(id) } });
      if (clash) throw new ConflictException('An admin with this mobile number already exists');
    }
    const admin = await this.admins.findOne({ where: { id, tenantId: actor.tenantId } });
    if (!admin) throw new NotFoundException('Admin not found');

    Object.assign(admin, dto);
    if (dto.email) admin.email = dto.email.toLowerCase();
    admin.updatedBy = actor.id;
    const saved = await this.admins.save(admin);

    if (dto.harvesterIds !== undefined) await this.links.setAdminHarvesters(saved.id, dto.harvesterIds ?? []);
    await this.links.attachAdminHarvesters([saved]);
    return saved;
  }

  async changePassword(id: string, dto: ChangePasswordDto, actor: AuthUser): Promise<void> {
    const res = await this.admins.update(
      { id, tenantId: actor.tenantId },
      { passwordHash: await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS), updatedBy: actor.id },
    );
    if (!res.affected) throw new NotFoundException('Admin not found');
  }

  /** Unscoped password reset for the super-admin console (no tenant check). */
  async resetPasswordById(id: string, newPassword: string): Promise<void> {
    const res = await this.admins.update(
      { id },
      { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS) },
    );
    if (!res.affected) throw new NotFoundException('Admin not found');
  }

  /**
   * Self-service profile update: rename and/or change password (the latter
   * verifies the current password). Returns the refreshed admin.
   */
  async updateOwnProfile(
    userId: string,
    patch: { name?: string; currentPassword?: string; newPassword?: string },
  ): Promise<Admin> {
    const update: Partial<Pick<Admin, 'name' | 'passwordHash'>> = {};
    if (patch.name?.trim()) update.name = patch.name.trim();

    if (patch.newPassword) {
      const admin = await this.admins
        .createQueryBuilder('a')
        .addSelect('a.passwordHash')
        .where('a.id = :id', { id: userId })
        .getOne();
      if (!admin) throw new NotFoundException('Account not found');
      if (!patch.currentPassword || !(await bcrypt.compare(patch.currentPassword, admin.passwordHash))) {
        throw new UnauthorizedException('Current password is incorrect');
      }
      update.passwordHash = await bcrypt.hash(patch.newPassword, BCRYPT_ROUNDS);
    }

    if (Object.keys(update).length) {
      const res = await this.admins.update({ id: userId }, update);
      if (!res.affected) throw new NotFoundException('Account not found');
    }

    const refreshed = await this.findAuthById(userId);
    if (!refreshed) throw new NotFoundException('Account not found');
    return refreshed;
  }
}
