import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Labour, LabourSchema } from '../labour/labour.schema';
import { Expense, ExpenseSchema } from './expense.schema';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Expense.name, schema: ExpenseSchema },
      { name: Labour.name, schema: LabourSchema },
    ]),
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
