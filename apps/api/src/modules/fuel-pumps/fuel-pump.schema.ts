import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AuditedDocument, AUDITED_SCHEMA_OPTIONS } from '../../common/schemas/audited.schema';

export type FuelPumpDocument = HydratedDocument<FuelPump>;

@Schema(AUDITED_SCHEMA_OPTIONS)
export class FuelPump extends AuditedDocument {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ trim: true })
  phone?: string;

  /** Harvesters this pump supplies diesel to (many-to-many). */
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Harvester' }], default: [], index: true })
  harvesterIds!: Types.ObjectId[];

  @Prop({ default: true })
  isActive!: boolean;
}

export const FuelPumpSchema = SchemaFactory.createForClass(FuelPump);
