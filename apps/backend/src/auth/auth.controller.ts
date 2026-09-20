import {
  Controller,
  Post,
  UseGuards,
  Request,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import {
  ApiOperation,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { User } from '../generated/client';

export interface RequestWithUser extends ExpressRequest {
  user: User;
}

/**
 * Controller for authentication endpoints.
 * Only routes decorated with @Public() bypass the global JWT guard.
 * @param authService Service that validates credentials and issues JWT tokens
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Authenticate with username and password and receive a JWT access token.
   * The LocalAuthGuard runs first and rejects invalid credentials before this handler is called.
   * @param _loginDto Validated login payload (consumed by LocalAuthGuard via Passport)
   * @param req Express request enriched with the authenticated user by Passport
   * @returns LoginResponseDto containing the signed JWT access token
   */
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and receive a JWT access token' })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  login(
    @Body() _loginDto: LoginDto,
    @Request() req: RequestWithUser,
  ): LoginResponseDto {
    return this.authService.login(req.user);
  }
}
