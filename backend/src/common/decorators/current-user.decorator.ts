import { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Current User decorator to inject authenticated user into route handlers
 * Extracts user from request object populated by JWT strategy
 * 
 * @example
 * @Get('profile')
 * getProfile(@CurrentUser() user: AuthenticatedUser) {
 *   return user;
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext): AuthenticatedUser | any => {
    const request = ctx.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;

    return data ? user?.[data] : user;
  },
);
