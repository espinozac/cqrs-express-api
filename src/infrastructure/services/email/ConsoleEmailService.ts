import { IEmailService, SendEmailInput } from "../../../application/ports/IEmailService";
import { ILogger } from "../../../application/ports/ILogger";

/**
 * Stand-in "third-party service" adapter. In production this would be
 * replaced by e.g. an SesEmailService or SendGridEmailService — both would
 * implement the same IEmailService port, so no use case would need to
 * change. This one just logs, so the whole flow is runnable with zero
 * external accounts.
 */
export class ConsoleEmailService implements IEmailService {
  private logger: ILogger;

  constructor({ logger }: { logger: ILogger }) {
    this.logger = logger;
  }

  async send(input: SendEmailInput): Promise<void> {
    // Simulate real network latency so timing/error-handling code paths behave realistically.
    await new Promise((resolve) => setTimeout(resolve, 25));
    this.logger.info("Email sent (console adapter)", {
      to: input.to,
      subject: input.subject,
    });
  }
}
