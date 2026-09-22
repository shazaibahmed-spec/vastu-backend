import {
  Body,
  Controller,
  Get,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { UsersService } from './users.service.js';
import { UpdateLanguageDto } from './dto/update-language.dto.js';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile and preferences' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  async getProfile(@CurrentUser('userId') userId?: string) {
    const resolvedUserId =
      userId || '00000000-0000-0000-0000-000000000001';
    return this.usersService.findById(resolvedUserId);
  }

  @Patch('me/language')
  @ApiOperation({ summary: 'Update user language preference' })
  @ApiResponse({ status: 200, description: 'Language preference updated' })
  async updateLanguage(
    @Body() dto: UpdateLanguageDto,
    @CurrentUser('userId') userId?: string,
  ) {
    const resolvedUserId =
      userId || '00000000-0000-0000-0000-000000000001';
    return this.usersService.updateLanguagePreference(
      resolvedUserId,
      dto.languageCode,
    );
  }
}
