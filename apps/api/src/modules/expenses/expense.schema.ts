import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ExpenseType } from '@wh/shared';
import { AuditedDocument, AUDITED_SCHEMA_OPTIONS } from '../../common/schemas/audited.schema';

export type ExpenseDocument = HydratedDocument<Expense>;

@Schema(AUDITED_SCHEMA_OPTIONS)
export class Expense extends AuditedDocument {
  @Prop({ type: Types.ObjectId, ref: 'Harvester', required: true, index: true })
  harvesterId!: Types.ObjectId;

  @Prop({ required: true })
  date!: Date;

  @Prop({ type: String, enum: ExpenseType, required: true, index: true })
  type!: ExpenseType;

  /** A super-admin-defined custom category; null for the built-in types. */
  @Prop({ type: Types.ObjectId, ref: 'ExpenseCategory', default: null, index: true })
  categoryId?: Types.ObjectId | null;

  /** Set only for DIESEL expenses: the fuel pump the diesel was bought from. */
  @Prop({ type: Types.ObjectId, ref: 'FuelPump', default: null, index: true })
  pumpId?: Types.ObjectId | null;

  /** Set only for LABOUR expenses: the labourer this payment is for. */
  @Prop({ type: Types.ObjectId, ref: 'Labour', default: null, index: true })
  labourId?: Types.ObjectId | null;

  @Prop({ required: true, min: 0 })
  amount!: number;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ trim: true })
  attachmentUrl?: string;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);
ExpenseSchema.index({ harvesterId: 1, date: -1 });
