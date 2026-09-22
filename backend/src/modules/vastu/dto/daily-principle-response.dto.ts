import { ApiProperty } from '@nestjs/swagger';

export class DailyPrincipleResponseDto {
  @ApiProperty({ example: 'ne-ishanya-clarity' })
  id: string;

  @ApiProperty({ example: 'North-East (Ishanya)' })
  zone: string;

  @ApiProperty({ example: 'Water (Jal)' })
  element: string;

  @ApiProperty({
    example:
      'The North-East quadrant is governed by the water element and supreme mental clarity. Keep it light, clean, and free from heavy clutter.',
  })
  quote: string;

  @ApiProperty({
    example:
      'Keep this corner open and clean; place a crystal or clear water bowl to invite positive prana.',
  })
  actionTip: string;

  @ApiProperty({ example: '2026-09-11' })
  date: string;
}
