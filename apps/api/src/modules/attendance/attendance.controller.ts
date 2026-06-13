import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { AttendanceService } from './attendance.service';
import { SetWeekDto } from './dto/attendance.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get()
  getRange(
    @Query('labourId') labourId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.attendance.getRange(labourId, from, to, user);
  }

  @Put('week')
  setWeek(@Body() dto: SetWeekDto, @CurrentUser() user: AuthUser) {
    return this.attendance.setWeek(dto, user);
  }
}
