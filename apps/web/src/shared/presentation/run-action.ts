export function runAction(action: () => Promise<void>): void {
  void action().catch(() => undefined);
}
