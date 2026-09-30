export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
}

/**
 * Port for the "third-party service" boundary. Swap ConsoleEmailService for
 * a real SES/SendGrid/Postmark adapter in infrastructure/services/email
 * without touching any use case that sends email.
 */
export interface IEmailService {
  send(input: SendEmailInput): Promise<void>;
}
