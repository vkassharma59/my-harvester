import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { idColumn } from '../../common/columns';
import { Harvester } from '../harvesters/harvester.schema';
import { Admin } from './admin.schema';

/** Join table: which harvesters a (staff) admin may access. */
@Entity('admin_harvesters')
@Index(['harvesterId'])
export class AdminHarvester {
  @PrimaryColumn(idColumn)
  adminId!: string;

  @PrimaryColumn(idColumn)
  harvesterId!: string;

  @ManyToOne(() => Admin, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'adminId' })
  admin?: Admin;

  @ManyToOne(() => Harvester, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'harvesterId' })
  harvester?: Harvester;
}
