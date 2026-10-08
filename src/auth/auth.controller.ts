import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginUserDTO } from './dto/LoginUser.dto';
import { RegisterUserDTO } from './dto/RegisterUser.dto';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import type { Request, Response, CookieOptions } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { EmployeeProfileDTO } from './dto/EmployeeProfile.dto';
import { AccessTokenResponseDTO } from './dto/AccessTokenResponse.dto';

const REFRESH_COOKIE = 'refreshToken';
const isProd = process.env.NODE_ENV === 'production';

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  path: '/auth',
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE, token, {
      ...refreshCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  @ApiOperation({ summary: 'Вхід користувача' })
  @ApiOkResponse({ type: AccessTokenResponseDTO })
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginUserDTO,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(dto);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @ApiOperation({ summary: 'Реєстрація користувача' })
  @ApiOkResponse({ type: AccessTokenResponseDTO })
  @Post('register')
  async register(
    @Body() dto: RegisterUserDTO,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.register(dto);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Додати роль customer' })
  @ApiOkResponse({ type: AccessTokenResponseDTO })
  @UseGuards(JwtAuthGuard)
  @Post('roles/customer')
  async addCustomerRole(
    @Req() req: Request & { user: { userId: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } =
      await this.authService.addCustomerRole(req.user.userId);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Додати роль employee' })
  @ApiOkResponse({ type: AccessTokenResponseDTO })
  @UseGuards(JwtAuthGuard)
  @Post('roles/employee')
  async addEmployeeRole(
    @Req() req: Request & { user: { userId: string } },
    @Body() dto: EmployeeProfileDTO,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } =
      await this.authService.addEmployeeRole(req.user.userId, dto);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @ApiCookieAuth()
  @ApiOperation({ summary: 'Оновити токени за refresh cookie' })
  @ApiOkResponse({ type: AccessTokenResponseDTO })
  @Post('refresh')
  @HttpCode(200)
  @UseGuards(RefreshTokenGuard)
  async refresh(
    @Req()
    req: Request & {
      user: {
        userId: string;
        refreshToken: string;
      };
    },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.refresh(
      req.user.userId,
      req.user.refreshToken,
    );
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Вихід, очищення refresh cookie' })
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() req: Request & { user: { userId: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(req.user.userId);
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
    return { message: 'Logged out' };
  }
}
