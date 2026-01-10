import { PartialType } from '@nestjs/swagger';

import { CreateAvailableCarDto } from './create-available-car.dto';

export class UpdateAvailableCarDto extends PartialType(CreateAvailableCarDto) {}
