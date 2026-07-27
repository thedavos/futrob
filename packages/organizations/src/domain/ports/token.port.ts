export interface TokenPort {
  generatePlainToken(): string;
  hashToken(token: string): string;
}
