import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';
import { Role } from '@wh/shared';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { AppConfig } from '../../config/configuration';
import { Admin, AdminDocument } from './admin.schema';
import { CreateAdminDto } from './dto/create-admin.dto';
import { ChangePasswordDto, UpdateAdminDto } from './dto/update-admin.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AdminsService implements OnModuleInit {
  private readonly logger = new Logger(AdminsService.name);

  constructor(
    @InjectModel(Admin.name) private readonly adminModel: Model<AdminDocument>,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  /** Seed the first SUPER_ADMIN (its own tenant) from env if none exists. */
  async onModuleInit(): Promise<void> {
    const count = await this.adminModel.estimatedDocumentCount();
    if (count > 0) return;

    const seed = this.config.get('bootstrapAdmin', { infer: true });
    if (!seed?.email || !seed?.password) {
      this.logger.warn(
        'No admins exist and BOOTSTRAP_ADMIN_EMAIL/PASSWORD are not set — login will be impossible until an admin is seeded.',
      );
      return;
    }

    await this.createSuperAdmin(seed.email, seed.password, seed.name ?? 'Owner');
    this.logger.log(`Bootstrapped SUPER_ADMIN (owner): ${seed.email}`);
  }

  /**
   * Creates a SUPER_ADMIN (an owner) whose tenant is itself. Used by the
   * bootstrap and the manual seed script — never exposed over the API.
   */
  async createSuperAdmin(
    email: string,
    password: string,
    name: string,
    phone?: string,
  ): Promise<AdminDocument> {
    const existing = await this.adminModel
      .findOne({ $or: [{ email: email.toLowerCase() }, ...(phone ? [{ phone }] : [])] })
      .exec();
    if (existing) throw new ConflictException('An admin with this email or mobile already exists');

    const id = new Types.ObjectId();
    return this.adminModel.create({
      _id: id,
      tenantId: id, // an owner is its own tenant root
      name,
      email: email.toLowerCase(),
      phone,
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      role: Role.SUPER_ADMIN,
      isActive: true,
    });
  }

  /** Login lookup — global, by email OR mobile number, includes the password hash. */
  async findByIdentifierWithHash(identifier: string): Promise<AdminDocument | null> {
    const value = identifier.trim();
    return this.adminModel
      .findOne({ $or: [{ email: value.toLowerCase() }, { phone: value }] })
      .select('+passwordHash')
      .exec();
  }

  /** Auth lookup by id (unscoped) — used by the JWT strategy to validate a token. */
  async findAuthById(id: string): Promise<AdminDocument | null> {
    return this.adminModel.findById(id).exec();
  }

  /** Creates a staff ADMIN within the actor's tenant (owners are seeded only). */
  async create(dto: CreateAdminDto, actor: AuthUser): Promise<AdminDocument> {
    const clash = await this.adminModel
      .findOne({ $or: [{ email: dto.email.toLowerCase() }, { phone: dto.phone }] })
      .exec();
    if (clash) {
      throw new ConflictException(
        clash.phone === dto.phone
          ? 'An admin with this mobile number already exists'
          : 'An admin with this email already exists',
      );
    }
    return this.adminModel.create({
      tenantId: new Types.ObjectId(actor.tenantId),
      name: dto.name,
      email: dto.email.toLowerCase(),
      phone: dto.phone,
      passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
      role: Role.ADMIN,
      isActive: true,
      harvesterIds: (dto.harvesterIds ?? []).map((id) => new Types.ObjectId(id)),
      createdBy: new Types.ObjectId(actor.id),
      updatedBy: new Types.ObjectId(actor.id),
    });
  }

  findAll(tenantId: string): Promise<AdminDocument[]> {
    return this.adminModel
      .find({ tenantId: new Types.ObjectId(tenantId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, tenantId: string): Promise<AdminDocument> {
    const admin = await this.adminModel
      .findOne({ _id: id, tenantId: new Types.ObjectId(tenantId) })
      .exec();
    if (!admin) throw new NotFoundException('Admin not found');
    return admin;
  }

  async update(id: string, dto: UpdateAdminDto, actor: AuthUser): Promise<AdminDocument> {
    if (dto.email) {
      const clash = await this.adminModel
        .findOne({ email: dto.email.toLowerCase(), _id: { $ne: id } })
        .exec();
      if (clash) throw new ConflictException('An admin with this email already exists');
    }
    if (dto.phone) {
      const clash = await this.adminModel.findOne({ phone: dto.phone, _id: { $ne: id } }).exec();
      if (clash) throw new ConflictException('An admin with this mobile number already exists');
    }
    const admin = await this.adminModel
      .findOneAndUpdate(
        { _id: id, tenantId: new Types.ObjectId(actor.tenantId) },
        {
          ...dto,
          ...(dto.email ? { email: dto.email.toLowerCase() } : {}),
          updatedBy: new Types.ObjectId(actor.id),
        },
        { new: true, runValidators: true },
      )
      .exec();
    if (!admin) throw new NotFoundException('Admin not found');
    return admin;
  }

  async changePassword(id: string, dto: ChangePasswordDto, actor: AuthUser): Promise<void> {
    const result = await this.adminModel
      .findOneAndUpdate(
        { _id: id, tenantId: new Types.ObjectId(actor.tenantId) },
        {
          passwordHash: await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS),
          updatedBy: new Types.ObjectId(actor.id),
        },
      )
      .exec();
    if (!result) throw new NotFoundException('Admin not found');
  }
}
