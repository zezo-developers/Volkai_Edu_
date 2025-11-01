import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/database/entities/user.entity';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CreateJobDto } from '@/modules/hr/dto/job-management.dto';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@Controller('my-test')
@ApiTags('Test')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MyTestController {

    @Post()
    testFunc(@Body() createDto: CreateJobDto,
        @CurrentUser() user: any){
            console.log('user:dfgdgf ', user);
        return user
    }
}
