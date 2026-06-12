import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AreaUnit, HarvestType } from '@wh/shared';
import { AuditedDocument, AUDITED_SCHEMA_OPTIONS } from '../../common/schemas/audited.schema';

export type PlotDocument = HydratedDocument<Plot>;

/** A harvesting job on a plot of land, carrying its commercial terms. */
@Schema(AUDITED_SCHEMA_OPTIONS)
export class Plot extends AuditedDocument {
  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Harvester', required: true, index: true })
  harvesterId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  plotName!: string;

  @Prop({ trim: true })
  village?: string;

  @Prop({ required: true, min: 0 })
  area!: number;

  @Prop({ type: String, enum: AreaUnit, default: AreaUnit.BIGHA })
  areaUnit!: AreaUnit;

  @Prop({ required: true })
  harvestDate!: Date;

  @Prop({ trim: true })
  remarks?: string;

  @Prop({ type: String, enum: HarvestType, required: true })
  harvestType!: HarvestType;

  // Harvesting charge to the landowner (both types)
  @Prop({ required: true, min: 0 })
  ratePerBigha!: number;

  @Prop({ required: true, min: 0 })
  harvestingAmount!: number;

  // Type 2 only: Bhusa sold to a separate buyer
  @Prop({ type: Types.ObjectId, ref: 'Customer', default: null })
  bhusaBuyerId?: Types.ObjectId | null;

  @Prop({ min: 0, default: 0 })
  bhusaAmount?: number;

  // One or more Bhusa buyers, each owing their own amount (Type 2).
  @Prop({
    type: [{ customerId: { type: Types.ObjectId, ref: 'Customer' }, amount: { type: Number, min: 0 } }],
    default: [],
  })
  bhusaBuyers?: { customerId: Types.ObjectId; amount: number }[];

  @Prop({ required: true, min: 0 })
  totalAmount!: number;

  // Optional commission agent for this job.
  @Prop({ type: Types.ObjectId, ref: 'Agent', default: null })
  agentId?: Types.ObjectId | null;

  @Prop({ min: 0, default: 0 })
  commissionAmount?: number;
}

export const PlotSchema = SchemaFactory.createForClass(Plot);
PlotSchema.index({ customerId: 1, harvestDate: -1 });
PlotSchema.index({ harvesterId: 1, harvestDate: -1 });
