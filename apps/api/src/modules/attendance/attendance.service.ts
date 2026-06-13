import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { harvesterFilter } from '../../common/scope';
import { Labour, LabourDocument } from '../labour/labour.schema';
import { Attendance, AttendanceDocument } from './attendance.schema';
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
    @InjectModel(Attendance.name) private readonly model: Model<AttendanceDocument>,
    @InjectModel(Labour.name) private readonly labour: Model<LabourDocument>,
  ) {}

  /** The worker, scoped to what the user may see, or throws. */
  private async assertWorker(labourId: string, user: AuthUser): Promise<LabourDocument> {
    const worker = await this.labour
      .findOne({ _id: labourId, tenantId: new Types.ObjectId(user.tenantId), ...harvesterFilter(user) })
      .exec();
    if (!worker) throw new NotFoundException('Worker not found');
    return worker;
  }

  /** Present dates ('YYYY-MM-DD') for a worker within [from, to]. */
  async getRange(labourId: string, from: string, to: string, user: AuthUser): Promise<string[]> {
    await this.assertWorker(labourId, user);
    const rows = await this.model
      .find({
        tenantId: new Types.ObjectId(user.tenantId),
        labourId: new Types.ObjectId(labourId),
        date: { $gte: from, $lte: to },
      })
      .select('date')
      .exec();
    return rows.map((r) => r.date).sort();
  }

  /** Replace a worker's attendance for one week with the provided present days. */
  async setWeek(dto: SetWeekDto, user: AuthUser): Promise<string[]> {
    const worker = await this.assertWorker(dto.labourId, user);
    const tenantId = new Types.ObjectId(user.tenantId);
    const labourId = new Types.ObjectId(dto.labourId);
    const weekEnd = addDays(dto.weekStart, 6);
    const valid = [...new Set(dto.days)].filter((d) => d >= dto.weekStart && d <= weekEnd);

    await this.model.deleteMany({
      tenantId,
      labourId,
      date: { $gte: dto.weekStart, $lte: weekEnd },
    });
    if (valid.length) {
      await this.model.insertMany(
        valid.map((date) => ({
          tenantId,
          labourId,
          harvesterId: worker.harvesterId,
          date,
          createdBy: new Types.ObjectId(user.id),
          updatedBy: new Types.ObjectId(user.id),
        })),
      );
    }
    return this.getRange(dto.labourId, dto.weekStart, weekEnd, user);
  }
}
