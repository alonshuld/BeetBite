import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from 'src/generated/client';
import { PRISMA_ERROR_CODES } from 'src/common/constants';
import { SubcontractorTeamRequestDto } from './dto/subcontractor-team-request.dto';
import {
  SubcontractorTeamMemberDto,
  SubcontractorTeamResponseDto,
} from './dto/subcontractor-team-response.dto';
import {
  byName,
  toSubcontractorTeamResponse,
} from './mappers/subcontractor-team.mapper';
import { SubcontractorNotFoundError } from './errors/subcontractor-not-found';
import { SubcontractorAlreadyInTeamError } from './errors/subcontractor-already-in-team.error';
import { SubcontractorTeamNotFoundError } from './errors/subcontractor-team-not-found.error';

const MEMBER_SELECT = {
  id: true,
  name: true,
  companyNumber: true,
} as const;

/**
 * Teams of subcontractors who split projects between them. A team is only
 * its members: it has no name, and every project report still names the one
 * member who took that project, so nothing financial is attached to it.
 */
@Injectable()
export class SubcontractorTeamsService {
  private readonly logger = new Logger(SubcontractorTeamsService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async findAll(): Promise<SubcontractorTeamResponseDto[]> {
    const teams = await this.prismaService.subcontractorTeam.findMany({
      select: { id: true, members: { select: MEMBER_SELECT } },
      orderBy: { createdAt: 'asc' },
    });
    return teams.map(toSubcontractorTeamResponse);
  }

  async create(
    dto: SubcontractorTeamRequestDto,
  ): Promise<SubcontractorTeamResponseDto> {
    const team = await this.prismaService.$transaction(async (tx) => {
      await this.assertMembersAvailable(tx, dto.memberIds, null);
      return tx.subcontractorTeam.create({
        data: { members: { connect: dto.memberIds.map((id) => ({ id })) } },
        select: { id: true, members: { select: MEMBER_SELECT } },
      });
    });

    this.logger.log(`Subcontractor team created: ${team.id}`);
    return toSubcontractorTeamResponse(team);
  }

  /** Replaces the team's members; anyone left out leaves the team. */
  async update(
    id: string,
    dto: SubcontractorTeamRequestDto,
  ): Promise<SubcontractorTeamResponseDto> {
    const team = await this.prismaService.$transaction(async (tx) => {
      const exists = await tx.subcontractorTeam.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!exists) throw new SubcontractorTeamNotFoundError(id);

      await this.assertMembersAvailable(tx, dto.memberIds, id);
      return tx.subcontractorTeam.update({
        where: { id },
        data: {
          members: { set: dto.memberIds.map((memberId) => ({ id: memberId })) },
        },
        select: { id: true, members: { select: MEMBER_SELECT } },
      });
    });

    this.logger.log(`Subcontractor team updated: ${id}`);
    return toSubcontractorTeamResponse(team);
  }

  /** Disbands the team. Its members stay, each working alone again. */
  async remove(id: string): Promise<void> {
    try {
      await this.prismaService.subcontractorTeam.delete({ where: { id } });
      this.logger.log(`Subcontractor team deleted: ${id}`);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODES.NOT_FOUND
      ) {
        throw new SubcontractorTeamNotFoundError(id);
      }
      throw error;
    }
  }

  /**
   * Everyone who works alongside the given subcontractor, the subcontractor
   * included, sorted by name. A subcontractor with no team is a team of one.
   */
  async findTeamOf(
    subcontractorId: string,
  ): Promise<SubcontractorTeamMemberDto[]> {
    const map = await this.findTeamsOf([subcontractorId]);
    const members = map.get(subcontractorId);
    if (!members) throw new SubcontractorNotFoundError(subcontractorId);
    return members;
  }

  /** {@link findTeamOf} for many subcontractors in two queries. */
  async findTeamsOf(
    subcontractorIds: string[],
  ): Promise<Map<string, SubcontractorTeamMemberDto[]>> {
    const subcontractors = await this.prismaService.subcontractor.findMany({
      where: { id: { in: [...new Set(subcontractorIds)] } },
      select: { ...MEMBER_SELECT, teamId: true },
    });
    const teamIds = [
      ...new Set(subcontractors.flatMap((s) => (s.teamId ? [s.teamId] : []))),
    ];
    const teammates = teamIds.length
      ? await this.prismaService.subcontractor.findMany({
          where: { teamId: { in: teamIds } },
          select: { ...MEMBER_SELECT, teamId: true },
        })
      : [];

    const result = new Map<string, SubcontractorTeamMemberDto[]>();
    for (const subcontractor of subcontractors) {
      const members = subcontractor.teamId
        ? teammates.filter((m) => m.teamId === subcontractor.teamId)
        : [subcontractor];
      result.set(
        subcontractor.id,
        [...members].sort(byName).map((m) => ({
          id: m.id,
          name: m.name,
          companyNumber: m.companyNumber,
        })),
      );
    }
    return result;
  }

  /**
   * Every member must exist and must not already be in a team other than
   * `teamId` (null when creating).
   */
  private async assertMembersAvailable(
    tx: Prisma.TransactionClient,
    memberIds: string[],
    teamId: string | null,
  ): Promise<void> {
    const members = await tx.subcontractor.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, name: true, teamId: true },
    });
    const missing = memberIds.find((id) => !members.some((m) => m.id === id));
    if (missing) throw new SubcontractorNotFoundError(missing);

    const taken = members.find((m) => m.teamId && m.teamId !== teamId);
    if (taken) throw new SubcontractorAlreadyInTeamError(taken.name);
  }
}
