import { SetMetadata } from '@nestjs/common';

/**
 * Public decorator to mark routes as publicly accessible
 * Routes marked with @Public() bypass JWT authentication
 */
export const Public = () => SetMetadata('isPublic', true);
