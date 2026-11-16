import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UpdateEmployeeProfileDto } from './dto/update-employee-profile.dto';
import { UploadEmployeeMediaDto } from './dto/upload-employee-media.dto';
import { EmployeesService } from './employees.service';

type AuthRequest = Request & { user: { userId: string } };

@ApiTags('employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('employee')
@Controller('employees/profile')
export class EmployeeProfileController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get('me')
  getMyProfile(@Req() req: AuthRequest) {
    return this.employeesService.getMyProfile(req.user.userId);
  }

  @Patch('me')
  updateMyProfile(
    @Body() dto: UpdateEmployeeProfileDto,
    @Req() req: AuthRequest,
  ) {
    return this.employeesService.updateMyProfile(req.user.userId, dto);
  }

  @Post('me/media')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        caption: { type: 'string', maxLength: 500 },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 50_000_000 } }),
  )
  uploadMedia(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadEmployeeMediaDto,
    @Req() req: AuthRequest,
  ) {
    if (!file) {
      throw new BadRequestException('A media file is required');
    }

    return this.employeesService.uploadMedia(
      req.user.userId,
      file,
      dto.caption,
    );
  }

  @Delete('me/media/:mediaId')
  @HttpCode(204)
  deleteMedia(
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
    @Req() req: AuthRequest,
  ) {
    return this.employeesService.deleteMedia(req.user.userId, mediaId);
  }
}
