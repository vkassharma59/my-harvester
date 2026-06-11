import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AuditedDocument, AUDITED_SCHEMA_OPTIONS } from '../../common/schemas/audited.schema';

export type AgentDocument = HydratedDocument<Agent>;

/** A commission agent attached to a single harvester. */
@Schema(AUDITED_SCHEMA_OPTIONS)
export class Agent extends AuditedDocument {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ type: Types.ObjectId, ref: 'Harvester', required: true, index: true })
  harvesterId!: Types.ObjectId;

  /** Commission amount per unit of area (e.g. 200 per bigha/acre). */
  @Prop({ required: true, min: 0 })
  commissionRate!: number;

  @Prop({ default: true })
  isActive!: boolean;
}

export const AgentSchema = SchemaFactory.createForClass(Agent);
