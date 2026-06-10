import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { PartyType } from '@wh/shared';
import { AuditedDocument, AUDITED_SCHEMA_OPTIONS } from '../../common/schemas/audited.schema';

export type PaymentDocument = HydratedDocument<Payment>;

/**
 * A money movement. `partyType` says whose ledger it belongs to; `partyId`
 * points at the customer / bhusa-buyer / labour accordingly. This single
 * collection lets the customer ledger and labour payment reports be rebuilt.
 */
@Schema(AUDITED_SCHEMA_OPTIONS)
export class Payment extends AuditedDocument {
  @Prop({ type: String, enum: PartyType, required: true, index: true })
  partyType!: PartyType;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  partyId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Plot', default: null })
  plotId?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Harvester', default: null, index: true })
  harvesterId?: Types.ObjectId | null;

  @Prop({ required: true })
  date!: Date;

  @Prop({ required: true, min: 0 })
  amount!: number;

  @Prop({ trim: true })
  notes?: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index({ partyType: 1, partyId: 1, date: -1 });
