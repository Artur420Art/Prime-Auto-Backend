import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check' })
  @ApiOkResponse({
    schema: {
      example: {
        status: 'ok',
        uptime: 123.45,
        timestamp: '2026-01-11T00:00:00.000Z',
      },
    },
  })
  health() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
