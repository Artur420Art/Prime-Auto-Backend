import { PartialType } from '@nestjs/swagger';

import { CreateAdminVehicleDto } from './create-admin-vehicle.dto';

export class UpdateAdminVehicleDto extends PartialType(CreateAdminVehicleDto) {}

