export type NotificationQueueMessage = Readonly<Record<string, never>>;

export async function handleNotificationJob(_message: NotificationQueueMessage): Promise<void> {
  throw new Error("notifications.worker: not implemented");
}
