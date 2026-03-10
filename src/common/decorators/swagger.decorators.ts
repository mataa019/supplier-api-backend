import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';

/**
 * Standard API responses for public endpoints
 */
export function ApiPublicEndpoint(summary: string, successDescription: string) {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiResponse({ status: 200, description: successDescription }),
  );
}

/**
 * Standard API responses for protected endpoints (requires JWT)
 */
export function ApiProtectedEndpoint(summary: string, successDescription: string) {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({ summary }),
    ApiResponse({ status: 200, description: successDescription }),
    ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' }),
  );
}

/**
 * Standard API responses for admin-only endpoints
 */
export function ApiAdminEndpoint(summary: string, successDescription: string) {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({ summary }),
    ApiResponse({ status: 200, description: successDescription }),
    ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' }),
    ApiForbiddenResponse({ description: 'Forbidden - Admin role required' }),
  );
}

/**
 * Standard API responses for create operations
 */
export function ApiCreateEndpoint(summary: string, successDescription: string) {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiResponse({ status: 201, description: successDescription }),
    ApiConflictResponse({ description: 'Resource already exists' }),
  );
}

/**
 * Standard API responses for protected create operations
 */
export function ApiProtectedCreateEndpoint(summary: string, successDescription: string) {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({ summary }),
    ApiResponse({ status: 201, description: successDescription }),
    ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' }),
    ApiConflictResponse({ description: 'Resource already exists' }),
  );
}

/**
 * Standard API responses for get-by-id operations
 */
export function ApiGetByIdEndpoint(summary: string, resourceName: string) {
  return applyDecorators(
    ApiBearerAuth('JWT-auth'),
    ApiOperation({ summary }),
    ApiResponse({ status: 200, description: `Returns the ${resourceName}` }),
    ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token' }),
    ApiNotFoundResponse({ description: `${resourceName} not found` }),
  );
}
