/**
 * Sends the account emails Better Auth asks for. MAIL-01 provides the live provider; until
 * then a deployment without one leaves email change disabled (ADR-0028).
 */
export interface AuthMailPort {
  /** Asks the owner of `to` to confirm it: the change applies only once they open `url`. */
  sendEmailChangeVerification(input: {
    readonly to: string;
    readonly name: string;
    readonly url: string;
  }): Promise<void>;
}
