import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base class for structured, machine-readable domain errors. Every domain
 * exception carries a stable `code` (used by API consumers to branch on the
 * failure reason) in addition to the human-readable `message`.
 */
export class DomainException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus,
    public readonly details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, status);
  }
}
