import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AccountRequestStatus } from '@wh/shared';
import { newObjectId } from '../../common/object-id';
import { Admin } from '../admins/admin.schema';
import { AccountRequest } from './account-request.schema';
import { CreateAccountRequestDto } from './dto/create-account-request.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AccountRequestsService {
  constructor(
    @InjectRepository(AccountRequest) private readonly repo: Repository<AccountRequest>,
    @InjectRepository(Admin) private readonly admins: Repository<Admin>,
  ) {}

  /** Raise a new owner-account request, rejecting duplicate email/mobile. */
  async create(dto: CreateAccountRequestDto): Promise<{ id: string; status: AccountRequestStatus }> {
    const email = dto.email.trim().toLowerCase();
    const mobile = dto.mobile.replace(/\D/g, '');
    if (mobile.length !== 10) {
      throw new BadRequestException('Enter a valid 10-digit mobile number.');
    }

    // A pending request with the same email or mobile already exists.
    const pending = await this.repo.findOne({
      where: [
        { email, status: AccountRequestStatus.PENDING },
        { mobile, status: AccountRequestStatus.PENDING },
      ],
    });
    if (pending) {
      throw new ConflictException(
        pending.email === email
          ? 'An account request with this email is already pending approval.'
          : 'An account request with this mobile number is already pending approval.',
      );
    }

    // Or an account (owner/staff) already uses this email/mobile.
    const existingAdmin = await this.admins.findOne({ where: [{ email }, { phone: mobile }] });
    if (existingAdmin) {
      throw new ConflictException('An account with this email or mobile number already exists.');
    }

    const saved = await this.repo.save(
      this.repo.create({
        id: newObjectId(),
        fullName: dto.fullName.trim(),
        email,
        mobile,
        harvesterCount: dto.harvesterCount,
        state: dto.state.trim(),
        district: dto.district.trim(),
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
        status: AccountRequestStatus.PENDING,
      }),
    );
    return { id: saved.id, status: saved.status };
  }

  // --- For the future web portal (platform admin) ---

  /** Pending requests awaiting approval. */
  listPending(): Promise<AccountRequest[]> {
    return this.repo.find({
      where: { status: AccountRequestStatus.PENDING },
      order: { createdAt: 'ASC' },
    });
  }
}
