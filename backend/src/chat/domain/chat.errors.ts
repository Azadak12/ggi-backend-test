import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../common/exceptions/domain.exception';

export class QuotaExceededException extends DomainException {
  constructor(details: {
    freeMessagesUsed: number;
    freeMessagesLimit: number;
  }) {
    super(
      'QUOTA_EXCEEDED',
      'Monthly free quota used up and no active subscription bundle has ' +
        'remaining messages. Purchase or upgrade a bundle to keep chatting.',
      HttpStatus.PAYMENT_REQUIRED,
      details,
    );
  }
}
