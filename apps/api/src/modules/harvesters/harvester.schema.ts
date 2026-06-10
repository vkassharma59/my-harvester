import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { HarvesterStatus, HarvesterType } from '@wh/shared';
import { AuditedDocument, AUDITED_SCHEMA_OPTIONS } from '../../common/schemas/audited.schema';

export type HarvesterDocument = HydratedDocument<Harvester>;

@Schema(AUDITED_SCHEMA_OPTIONS)
export class Harvester extends AuditedDocument {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ trim: true })
  registrationNo?: string;

  @Prop({ trim: true })
  model?: string;

  @Prop({ type: String, enum: HarvesterStatus, default: HarvesterStatus.ACTIVE })
  status!: HarvesterStatus;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ type: String, enum: HarvesterType, required: true, default: HarvesterType.COMBINE })
  type!: HarvesterType;

  // COMBINE: a single per-unit rate.
  @Prop({ min: 0 })
  ratePerUnit?: number;

  // BHUSA: separate per-unit rates.
  @Prop({ min: 0 })
  rateWithBhusa?: number;

  @Prop({ min: 0 })
  rateWithoutBhusa?: number;
}

export const HarvesterSchema = SchemaFactory.createForClass(Harvester);
