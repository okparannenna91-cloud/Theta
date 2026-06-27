export class BillingError extends Error {
  public code: string;
  public statusCode: number;
  public details?: any;

  constructor(code: string, message: string, statusCode = 500, details?: any) {
    super(message);
    this.name = "BillingError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class InvalidTransitionError extends BillingError {
  constructor(from: string, event: string) {
    super(
      "INVALID_TRANSITION",
      `Cannot transition from '${from}' using event '${event}'`,
      400
    );
    this.name = "InvalidTransitionError";
  }
}

export class ProviderNotFoundError extends BillingError {
  constructor(providerId: string) {
    super(
      "PROVIDER_NOT_FOUND",
      `Billing provider '${providerId}' is not registered`,
      400
    );
    this.name = "ProviderNotFoundError";
  }
}

export class ProviderNotSupportedError extends BillingError {
  constructor(providerId: string, operation: string) {
    super(
      "PROVIDER_NOT_SUPPORTED",
      `Provider '${providerId}' does not support '${operation}'`,
      400
    );
    this.name = "ProviderNotSupportedError";
  }
}

export class EntitlementError extends BillingError {
  public feature: string;
  public plan: string;

  constructor(feature: string, plan: string, message: string) {
    super(
      "PLAN_LIMIT_EXCEEDED",
      message,
      403,
      { feature, plan }
    );
    this.name = "EntitlementError";
    this.feature = feature;
    this.plan = plan;
  }
}

export class PaymentRequiredError extends BillingError {
  constructor(message = "Payment is required to access this resource") {
    super("PAYMENT_REQUIRED", message, 402);
    this.name = "PaymentRequiredError";
  }
}

export class WebhookSignatureError extends BillingError {
  constructor() {
    super("INVALID_WEBHOOK_SIGNATURE", "Webhook signature verification failed", 401);
    this.name = "WebhookSignatureError";
  }
}

export class DuplicateEventError extends BillingError {
  constructor(eventId: string) {
    super("DUPLICATE_EVENT", `Event ${eventId} has already been processed`, 200);
    this.name = "DuplicateEventError";
  }
}
