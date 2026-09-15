const records = new Map<string, string>();

export async function setItemAsync(key: string, value: string): Promise<void> {
  records.set(key, value);
}

export async function getItemAsync(key: string): Promise<string | null> {
  return records.get(key) ?? null;
}

export async function deleteItemAsync(key: string): Promise<void> {
  records.delete(key);
}
