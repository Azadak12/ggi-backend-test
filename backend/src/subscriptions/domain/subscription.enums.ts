export enum BundleTier {
  BASIC = 'BASIC',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export enum BundleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE', // payment failed on renewal
  EXPIRED = 'EXPIRED', // cycle ended and auto-renew was off / cancelled
}

export enum BillingEventType {
  CREATED = 'CREATED',
  RENEWAL_SUCCESS = 'RENEWAL_SUCCESS',
  RENEWAL_FAILED = 'RENEWAL_FAILED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}
