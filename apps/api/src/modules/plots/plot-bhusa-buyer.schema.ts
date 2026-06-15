import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { idColumn, money } from '../../common/columns';

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
}
