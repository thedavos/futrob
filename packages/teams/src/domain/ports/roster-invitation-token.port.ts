export interface RosterInvitationTokenPort {
  generateToken(): string;
  hashToken(token: string): string;
}
