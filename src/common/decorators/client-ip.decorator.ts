import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Extracts the client IP address from the request.
 * Handles proxies (X-Forwarded-For) and direct connections.
 * 
 * @example
 * @Post('login')
 * async login(@Body() dto: LoginDto, @ClientIp() ip: string) {
 *   // ip = '192.168.1.1'
 * }
 */
export const ClientIp = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    
    // Check for proxy headers first (when behind nginx, load balancer, etc.)
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      // X-Forwarded-For can be a comma-separated list; take the first (original client)
      const ips = Array.isArray(forwardedFor) 
        ? forwardedFor[0] 
        : forwardedFor.split(',')[0];
      return ips.trim();
    }

    // Check other common proxy headers
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Fallback to direct connection IP
    return request.ip || request.socket?.remoteAddress || 'unknown';
  },
);
