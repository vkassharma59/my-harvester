import { Entity, Index, PrimaryColumn } from 'typeorm';
import { idColumn } from '../../common/columns';

/** Join table: which harvesters a (staff) admin may access. */
@Entity('admin_harvesters')
@Index(['harvesterId'])
export class AdminHarvester {
  @PrimaryColumn(idColumn)
  adminId!: string;

  @PrimaryColumn(idColumn)
  harvesterId!: string;
}
