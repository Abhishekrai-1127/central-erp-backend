import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger('AuthMiddlewareGuard');

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      this.logger.warn(`[authMiddleware] No Authorization header on ${request.method} ${request.url}`);
      throw new UnauthorizedException({ message: 'Token missing' });
    }

    const token = authHeader.split(' ')[1];
    this.logger.log(`[authMiddleware] Verifying token for ${request.method} ${request.url}...`);

    try {
      const jwtSecret =
        this.configService.get<string>('jwt.secret') ||
        process.env.JWT_SECRET ||
        'super-secret-erp-key';

      const decoded = jwt.verify(token, jwtSecret) as any;
      request.user = decoded;

      this.logger.log(
        `[authMiddleware] Token valid | user_id: ${decoded.user_id} | role: ${decoded.role}`,
      );

      return true;
    } catch (error: any) {
      this.logger.warn(`[authMiddleware] Token verification failed: ${error.message}`);
      throw new UnauthorizedException({ message: 'Invalid token' });
    }
  }
}
