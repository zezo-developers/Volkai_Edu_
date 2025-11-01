import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayNotEmpty, IsString } from 'class-validator';

export class ResolveThreatsDto {
  @ApiProperty({
    description: 'List of threat IDs to resolve',
    example: ['b5d8a4e0-1b2c-4e77-a5a2-f4c654f2db01', 'a1c2b3d4-e5f6-7890-abcd-ef1234567890'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  threatIds: string[];
}
