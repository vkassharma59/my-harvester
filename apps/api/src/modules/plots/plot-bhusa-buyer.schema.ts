import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { idColumn, money } from '../../common/columns';
import { Customer } from '../customers/customer.schema';
import { Plot } from './plot.schema';

/** Join table: the Bhusa buyers on a job and the amount each owes (Type 2). */
@Entity('plot_bhusa_buyers')
@Index(['customerId'])
export class PlotBhusaBuyer {
  @PrimaryColumn(idColumn)
  plotId!: string;

  @PrimaryColumn(idColumn)
  customerId!: string;

  @Column(money())
  amount!: number;

  @ManyToOne(() => Plot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plotId' })
  plot?: Plot;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customerId' })
  customer?: Customer;
}
