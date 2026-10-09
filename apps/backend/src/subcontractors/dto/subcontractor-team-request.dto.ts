import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsString,
} from 'class-validator';

/**
 * Body of both creating a team and replacing its members. A team is nothing
 * but its members, so there is nothing else to send.
 */
export class SubcontractorTeamRequestDto {
  @IsArray()
  @ArrayMinSize(2)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @ApiProperty({
    example: ['cmb1member1', 'cmb1member2'],
    description: 'IDs of the subcontractors in the team — at least two',
    type: [String],
  })
  memberIds!: string[];
}
