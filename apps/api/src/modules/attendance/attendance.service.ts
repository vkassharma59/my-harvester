import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { newObjectId } from '../../common/object-id';
import { harvesterFilter } from '../../common/scope';
import { Labour } from '../labour/labour.schema';
import { Attendance } from './attendance.schema';
import { SetWeekDto } from './dto/attendance.dto';

/** Add days to a 'YYYY-MM-DD' string, tz-safely. */
function addDays(isoDate: string, n: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance) private readonly repo: Repository<Attendance>,
    @InjectRepository(Labour) private readonly labour: Repository<Labour>,
  ) {}

  /** The worker, scoped to what the user may see, or throws. */
  private async assertWorker(labourId: string, user: AuthUser): Promise<Labour> {
    const worker = await this.labour.findOne({
      where: { id: labourId, tenantId: user.tenantId, ...harvesterFilter(user) },
    });
    if (!worker) throw new NotFoundException('Worker not found');
    return worker;
  }

  /** Present dates ('YYYY-MM-DD') for a worker within [from, to]. */
  async getRange(labourId: string, from: string, to: string, user: AuthUser): Promise<string[]> {
    await this.assertWorker(labourId, user);
    const rows = await this.repo.find({
      where: { tenantId: user.tenantId, labourId, date: Between(from, to) },
      select: { date: true },
    });
    return rows.map((r) => r.date).sort();
  }

  /** Replace a worker's attendance for one week with the provided present days. */
  async setWeek(dto: SetWeekDto, user: AuthUser): Promise<string[]> {
    const worker = await this.assertWorker(dto.labourId, user);
    const weekEnd = addDays(dto.weekStart, 6);
    const valid = [...new Set(dto.days)].filter((d) => d >= dto.weekStart && d <= weekEnd);

    await this.repo.delete({
      tenantId: user.tenantId,
      labourId: dto.labourId,
      date: Between(dto.weekStart, weekEnd),
    });
    if (valid.length) {
      await this.repo.insert(
        valid.map((date) => ({
          id: newObjectId(),
          tenantId: user.tenantId,
          labourId: dto.labourId,
          harvesterId: worker.harvesterId,
          date,
          createdBy: user.id,
          updatedBy: user.id,
        })),
      );
    }
    return this.getRange(dto.labourId, dto.weekStart, weekEnd, user);
  }
}
