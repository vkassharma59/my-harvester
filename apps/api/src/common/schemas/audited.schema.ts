import { Prop } from '@nestjs/mongoose';
import { SchemaOptions, Types } from 'mongoose';

/**
 * Base class every domain schema extends. Adds the audit columns required by
 * the spec ("every record should have an updated-by field") plus created-by.
 * Combine with AUDITED_SCHEMA_OPTIONS to also get createdAt / updatedAt.
 */
export abstract class AuditedDocument {
  /**
   * Owning tenant: the super-admin (owner) account id this record belongs to.
   * Indexed because every scoped query filters on it. A super-admin's own
   * Admin record sets tenantId to its own _id; everything else inherits it.
   */
  @Prop({ type: Types.ObjectId, ref: 'Admin', required: true, index: true })
  tenantId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Admin', default: null })
  createdBy?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Admin', default: null })
  updatedBy?: Types.ObjectId | null;
}

/**
 * Standard options for all domain schemas: timestamps on, and a clean JSON
 * shape (`id` instead of `_id`, no `__v`) so responses match the shared types.
 */
export const AUDITED_SCHEMA_OPTIONS: SchemaOptions = {
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret: Record<string, unknown>) => {
      ret.id = ret._id?.toString();
      delete ret._id;
      return ret;
    },
  },
  toObject: { virtuals: true },
};
