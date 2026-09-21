import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginUserDTO } from './dto/LoginUser.dto';
import { RegisterUserDTO } from './dto/RegisterUser.dto';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import type { Request } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { EmployeeProfileDTO } from './dto/EmployeeProfile.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginUserDTO) {
    return this.authService.login(dto);
  }

  @Post('register')
  register(@Body() dto: RegisterUserDTO) {
    return this.authService.register(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('roles/customer')
  addCustomerRole(@Req() req: Request & { user: { userId: string } }) {
    return this.authService.addCustomerRole(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('roles/employee')
  addEmployeeRole(
    @Req() req: Request & { user: { userId: string } },
    @Body() dto: EmployeeProfileDTO,
  ) {
    return this.authService.addEmployeeRole(req.user.userId, dto);
  }

  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  refresh(
    @Req() req: Request & { user: { userId: string; refreshToken: string } },
  ) {
    return this.authService.refresh(req.user.userId, req.user.refreshToken);
  }
}
