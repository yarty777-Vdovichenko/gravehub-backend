import {
  Body,
  Controller,
  Get,
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
import { CurrentUserResponseDTO } from './dto/CurrentUserResponse.dto';
import { SwitchModeDTO } from './dto/Switchmode.dto';
import {
  ForgotPasswordDTO,
  ResendVerificationDTO,
  ResetPasswordDTO,
  VerifyEmailDTO,
} from './dto/EmailFlow.dto';

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

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отримати поточного користувача та його ролі' })
  @ApiOkResponse({ type: CurrentUserResponseDTO })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getCurrentUser(@Req() req: Request & { user: { userId: string } }) {
    return this.authService.getCurrentUser(req.user.userId);
  }

  @ApiOperation({ summary: 'Реєстрація користувача' })
  @Post('register')
  register(@Body() dto: RegisterUserDTO) {
    return this.authService.register(dto);
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

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Перемкнути активний режим (customer / employee)',
  })
  @ApiOkResponse({ type: AccessTokenResponseDTO })
  @UseGuards(JwtAuthGuard)
  @Post('switch-mode')
  @HttpCode(200)
  async switchMode(
    @Req() req: Request & { user: { userId: string } },
    @Body() dto: SwitchModeDTO,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.switchMode(
      req.user.userId,
      dto.mode,
    );

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

  @ApiOperation({ summary: 'Підтвердити пошту за токеном з листа' })
  @Post('verify-email')
  @HttpCode(200)
  verifyEmail(@Body() dto: VerifyEmailDTO) {
    return this.authService.verifyEmail(dto.token);
  }

  @ApiOperation({ summary: 'Повторно надіслати лист підтвердження пошти' })
  @Post('resend-verification')
  @HttpCode(200)
  async resendVerification(@Body() dto: ResendVerificationDTO) {
    const user = await this.authService.findUserIdByEmail(dto.email);

    if (user) {
      try {
        await this.authService.sendVerification(user);
      } catch {}
    }
    return {
      message: 'Якщо акаунт існує і пошта не підтверджена, лист буде надіслано',
    };
  }

  @ApiOperation({ summary: 'Запросити відновлення пароля' })
  @Post('forgot-password')
  @HttpCode(200)
  forgotPassword(@Body() dto: ForgotPasswordDTO) {
    return this.authService.forgotPassword(dto.email);
  }

  @ApiOperation({ summary: 'Задати новий пароль за токеном з листа' })
  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDTO) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }
}
