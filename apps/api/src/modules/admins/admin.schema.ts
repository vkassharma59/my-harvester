import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Role } from '@wh/shared';
import { AuditedDocument, AUDITED_SCHEMA_OPTIONS } from '../../common/schemas/audited.schema';

export type AdminDocument = HydratedDocument<Admin>;

@Schema(AUDITED_SCHEMA_OPTIONS)
export class Admin extends AuditedDocument {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  /** Mobile number — a unique login identity (sparse so seeded owners may omit it). */
  @Prop({ trim: true, unique: true, sparse: true })
  phone?: string;

  /** Never selected by default so it cannot leak through generic queries. */
  @Prop({ required: true, select: false })
  passwordHash!: string;

  @Prop({ type: String, enum: Role, default: Role.ADMIN })
  role!: Role;

  @Prop({ default: true })
  isActive!: boolean;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);

// Defence in depth: strip the hash from any serialized output.
AdminSchema.set('toJSON', {
  ...(AUDITED_SCHEMA_OPTIONS.toJSON as object),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id?.toString();
    delete ret._id;
    delete ret.passwordHash;
    return ret;
  },
});
