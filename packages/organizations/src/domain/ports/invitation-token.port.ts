export interface InvitationTokenPort {
  generatePlainToken(): string;
  hashToken(token: string): string;
}
