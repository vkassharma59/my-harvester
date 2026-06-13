import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AuditedDocument, AUDITED_SCHEMA_OPTIONS } from '../../common/schemas/audited.schema';

export type AttendanceDocument = HydratedDocument<Attendance>;

/**
 * One row per day a daily-wage worker was present. Existence = present;
 * unchecking a day deletes the row. `date` is a tz-safe 'YYYY-MM-DD' string.
 */
@Schema(AUDITED_SCHEMA_OPTIONS)
export class Attendance extends AuditedDocument {
  @Prop({ type: Types.ObjectId, ref: 'Labour', required: true, index: true })
  labourId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Harvester', required: true, index: true })
  harvesterId!: Types.ObjectId;

  @Prop({ required: true })
  date!: string;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);
AttendanceSchema.index({ labourId: 1, date: 1 }, { unique: true });
