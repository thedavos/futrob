/** A link email addressed to one account owner. */
export interface AuthLinkEmail {
  readonly to: string;
  readonly name: string;
  readonly url: string;
}

/**
 * Sends the account emails Better Auth asks for. A deployment without an adapter leaves
 * email change and password reset disabled (ADR-0030, ADR-0031).
 */
export interface AuthMailPort {
  /** Asks the owner of `to` to confirm it: the change applies only once they open `url`. */
  sendEmailChangeVerification(input: AuthLinkEmail): Promise<void>;
  /** Sends a single-use link that lets the owner of `to` choose a new password. */
  sendPasswordReset(input: AuthLinkEmail): Promise<void>;
}
