import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AuditedDocument, AUDITED_SCHEMA_OPTIONS } from '../../common/schemas/audited.schema';

export type CustomerDocument = HydratedDocument<Customer>;

@Schema(AUDITED_SCHEMA_OPTIONS)
export class Customer extends AuditedDocument {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true })
  phone!: string;

  @Prop({ trim: true })
  village?: string;

  @Prop({ trim: true })
  address?: string;

  /** Source contact id from the device's contact list, if imported. */
  @Prop({ trim: true })
  deviceContactId?: string;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
CustomerSchema.index({ name: 'text', village: 'text' });
