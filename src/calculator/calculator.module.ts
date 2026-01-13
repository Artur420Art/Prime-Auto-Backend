import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { CalculatorController } from './calculator.controller';
import { CalculatorService } from './calculator.service';

@Module({
  imports: [HttpModule],
  controllers: [CalculatorController],
  providers: [CalculatorService],
})
export class CalculatorModule {}

