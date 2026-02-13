import { ApiProperty } from '@nestjs/swagger';
import { NestedClientDto } from './nested-client.dto';
import { NestedProjectDto } from './nested-project.dto';

/**
 * Represents basic project properties with embedded basic client information nested in project report responses.
 */
export class NestedProjectWithClientDto extends NestedProjectDto {
  @ApiProperty({
    description: "Basic information on the project's client",
  })
  client!: NestedClientDto;
}
