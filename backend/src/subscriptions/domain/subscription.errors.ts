import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../common/exceptions/domain.exception';

export class SubscriptionNotFoundException extends DomainException {
  constructor(id: string) {
    super(
      'SUBSCRIPTION_NOT_FOUND',
      `Subscription ${id} not found`,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class SubscriptionAlreadyCancelledException extends DomainException {
  constructor(id: string) {
    super(
      'SUBSCRIPTION_ALREADY_CANCELLED',
      `Subscription ${id} is already cancelled`,
      HttpStatus.CONFLICT,
    );
  }
}
