import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { AreaUnit } from '@wh/shared';
import { AuditedDocument, AUDITED_SCHEMA_OPTIONS } from '../../common/schemas/audited.schema';

export type AppSettingsDocument = HydratedDocument<AppSettings>;

/** A single document holds the app-wide configurable defaults. */
@Schema(AUDITED_SCHEMA_OPTIONS)
export class AppSettings extends AuditedDocument {
  @Prop({ required: true, default: 'INR' })
  currency!: string;

  @Prop({ type: String, enum: AreaUnit, default: AreaUnit.BIGHA })
  defaultAreaUnit!: AreaUnit;
}

export const AppSettingsSchema = SchemaFactory.createForClass(AppSettings);
