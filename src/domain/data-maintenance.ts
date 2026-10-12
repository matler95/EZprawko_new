let revision = 0;
let blocked = false;
export const userDataRevision = () => revision;
export const userDataWritable = (expected = revision) => !blocked && expected === revision;
export async function withDataMaintenance<T>(operation: () => Promise<T>) {
  if (blocked) throw new Error("Data operation already running");
  blocked = true; revision += 1;
  try { return await operation(); } finally { blocked = false; }
}
