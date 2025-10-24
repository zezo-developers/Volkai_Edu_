import { Controller, Get } from '@nestjs/common';

@Controller('my-test')
export class MyTestController {

    @Get()
    testFunc(){
        return "Hello from My Test Controller"
    }
}
