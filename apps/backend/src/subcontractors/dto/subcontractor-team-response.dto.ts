import { ApiProperty } from '@nestjs/swagger';

export class SubcontractorTeamMemberDto {
  @ApiProperty({ example: 'cmb1member1' })
  id!: string;

  @ApiProperty({ example: 'Quality Builders LLC' })
  name!: string;

  @ApiProperty({ example: '515123456' })
  companyNumber!: string;
}

export class SubcontractorTeamResponseDto {
  @ApiProperty({
    example: 'cmb1team',
    description: 'Unique identifier for the team',
  })
  id!: string;

  @ApiProperty({
    description:
      'The team members, sorted by name. A team has no name of its own.',
    type: [SubcontractorTeamMemberDto],
  })
  members!: SubcontractorTeamMemberDto[];
}
