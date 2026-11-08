import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CreditPreviewDto, PurchasePlotDto } from './dto/purchase-plot.dto';
import { PlotsService } from './plots.service';

type AuthReq = Request & { user: { userId: string; role: string } };

@Controller()
@Roles('customer')
export class PlotsController {
  constructor(private readonly plotsService: PlotsService) {}

  @Get('cemeteries')
  cemeteries() {
    return this.plotsService.findCemeteries();
  }

  @Get('cemeteries/:id/plots')
  plots(@Param('id') id: string) {
    return this.plotsService.findPlots(id);
  }

  @Get('plots/my')
  my(@Req() req: AuthReq) {
    return this.plotsService.findMine(req.user.userId);
  }

  @Post('plots/:id/reserve')
  reserve(@Param('id') id: string, @Req() req: AuthReq) {
    return this.plotsService.reserve(id, req.user.userId);
  }

  @Delete('plots/:id/reserve')
  release(@Param('id') id: string, @Req() req: AuthReq) {
    return this.plotsService.release(id, req.user.userId);
  }

  @Get('plots/:id/credit-preview')
  creditPreview(@Param('id') id: string, @Query() query: CreditPreviewDto) {
    return this.plotsService.creditPreview(id, query);
  }

  @Post('plots/:id/purchase')
  purchase(
    @Param('id') id: string,
    @Req() req: AuthReq,
    @Body() dto: PurchasePlotDto,
  ) {
    return this.plotsService.purchase(id, req.user.userId, dto);
  }
}
