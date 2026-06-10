import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { LabourType, PaymentStatus } from '@wh/shared';
import { AuditedDocument, AUDITED_SCHEMA_OPTIONS } from '../../common/schemas/audited.schema';

export type LabourDocument = HydratedDocument<Labour>;

@Schema(AUDITED_SCHEMA_OPTIONS)
export class Labour extends AuditedDocument {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true })
  mobile!: string;

  @Prop({ type: String, enum: LabourType, required: true, index: true })
  type!: LabourType;

  @Prop({ type: Types.ObjectId, ref: 'Harvester', required: true, index: true })
  harvesterId!: Types.ObjectId;

  @Prop({ min: 0 })
  dailyWage?: number;

  @Prop({ min: 0 })
  customAmount?: number;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus!: PaymentStatus;
}

export const LabourSchema = SchemaFactory.createForClass(Labour);
