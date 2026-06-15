import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Not, Repository } from 'typeorm';
import { Role } from '@wh/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
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
  ) {}

  /** Seed the first OWNER (its own tenant) from env if none exists. */
  async onModuleInit(): Promise<void> {
    // One-time, idempotent migration of the old role names to the new ones.
    await this.admins.update({ role: 'SUPER_ADMIN' as Role }, { role: Role.OWNER });
    await this.admins.update({ role: 'ADMIN' as Role }, { role: Role.STAFF_ADMIN });

    const count = await this.admins.count();
    if (count > 0) return;

    const seed = this.config.get('bootstrapAdmin', { infer: true });
    if (!seed?.email || !seed?.password) {
      this.logger.warn(
        'No admins exist and BOOTSTRAP_ADMIN_EMAIL/PASSWORD are not set — login will be impossible until an admin is seeded.',
      );
      return;
    }

    await this.createOwner(seed.email, seed.password, seed.name ?? 'Owner');
    this.logger.log(`Bootstrapped OWNER: ${seed.email}`);
  }

  /**
   * Creates an OWNER whose tenant is itself. Used by the bootstrap and the
   * manual seed script — never exposed over the API.
   */
  async createOwner(email: string, password: string, name: string, phone?: string): Promise<Admin> {
    const existing = await this.admins.findOne({
      where: [{ email: email.toLowerCase() }, ...(phone ? [{ phone }] : [])],
    });
    if (existing) throw new ConflictException('An admin with this email or mobile already exists');

    const id = newObjectId();
    const admin = this.admins.create({
      id,
      tenantId: id, // an owner is its own tenant root
      name,
      email: email.toLowerCase(),
      phone: phone ?? null,
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      role: Role.OWNER,
      isActive: true,
      harvesterIds: [],
    });
    return this.admins.save(admin);
  }

  /** Login lookup — global, by email OR mobile number, includes the password hash. */
  async findByIdentifierWithHash(identifier: string): Promise<Admin | null> {
    const value = identifier.trim();
    return this.admins
      .createQueryBuilder('a')
      .addSelect('a.passwordHash')
      .where('a.email = :email OR a.phone = :phone', { email: value.toLowerCase(), phone: value })
      .getOne();
  }

  /** Auth lookup by id (unscoped) — used by the JWT strategy to validate a token. */
  async findAuthById(id: string): Promise<Admin | null> {
    return this.admins.findOneBy({ id });
  }

  /** Creates a staff admin within the actor's tenant (owners are seeded only). */
  async create(dto: CreateAdminDto, actor: AuthUser): Promise<Admin> {
    const clash = await this.admins.findOne({
      where: [{ email: dto.email.toLowerCase() }, ...(dto.phone ? [{ phone: dto.phone }] : [])],
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
      email: dto.email.toLowerCase(),
      phone: dto.phone ?? null,
      passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
      role: Role.STAFF_ADMIN,
      isActive: true,
      harvesterIds: dto.harvesterIds ?? [],
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    return this.admins.save(admin);
  }

  findAll(tenantId: string): Promise<Admin[]> {
    return this.admins.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string, tenantId: string): Promise<Admin> {
    const admin = await this.admins.findOne({ where: { id, tenantId } });
    if (!admin) throw new NotFoundException('Admin not found');
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
    return this.admins.save(admin);
  }

  async changePassword(id: string, dto: ChangePasswordDto, actor: AuthUser): Promise<void> {
    const res = await this.admins.update(
      { id, tenantId: actor.tenantId },
      { passwordHash: await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS), updatedBy: actor.id },
    );
    if (!res.affected) throw new NotFoundException('Admin not found');
  }
}
