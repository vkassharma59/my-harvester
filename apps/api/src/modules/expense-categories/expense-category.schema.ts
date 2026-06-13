import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AuditedDocument, AUDITED_SCHEMA_OPTIONS } from '../../common/schemas/audited.schema';

export type ExpenseCategoryDocument = HydratedDocument<ExpenseCategory>;

@Schema(AUDITED_SCHEMA_OPTIONS)
export class ExpenseCategory extends AuditedDocument {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ default: true })
  isActive!: boolean;
}

export const ExpenseCategorySchema = SchemaFactory.createForClass(ExpenseCategory);
