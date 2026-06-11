import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { AgentsService } from './agents.service';
import { CreateAgentDto, UpdateAgentDto } from './dto/agent.dto';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agents: AgentsService) {}

  @Post()
  create(@Body() dto: CreateAgentDto, @CurrentUser() user: AuthUser) {
    return this.agents.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('harvesterId') harvesterId?: string) {
    return this.agents.findAll(user, harvesterId);
  }

  @Get(':id/ledger')
  ledger(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.agents.ledger(id, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.agents.findOne(id, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAgentDto, @CurrentUser() user: AuthUser) {
    return this.agents.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.agents.remove(id, user);
  }
}
