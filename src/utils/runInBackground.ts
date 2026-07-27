/** Fire-and-forget refresh work so success toasts are not blocked on refetch. */
export function runInBackground(promise: Promise<unknown>) {
  void Promise.resolve(promise).catch(() => {});
}
