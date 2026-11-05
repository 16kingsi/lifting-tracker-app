// Asks Chrome not to clear this app's data when the phone runs low on space.
// Chrome decides by itself, without showing a prompt, and is more likely to say
// yes once the app is installed. So this asks on every launch until it says yes.
export async function requestPersistentStorage(): Promise<void> {
  if (!navigator.storage?.persist) return;
  if (await navigator.storage.persisted()) return;
  await navigator.storage.persist();
}
