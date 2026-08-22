export function print(message: string): void {
  console.log(message);
}

export function printError(message: string): void {
  console.error(message);
}

export function printJson<T>(value: T): void {
  console.log(JSON.stringify(value, null, 2));
}
