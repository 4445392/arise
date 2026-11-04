import { db } from './db'
import { Repo } from './repo'

/** The app-wide repository (real clock, real IndexedDB). Tests build their own Repo with a fake clock. */
export const repo = new Repo(db)

/**
 * Ask the browser not to evict our data. Safe to call repeatedly; resolves false when unsupported or declined.
 * Installing the PWA to the home screen makes the browser far more likely to grant it.
 */
export async function requestPersist(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false
    if (await navigator.storage.persisted?.()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export { Repo } from './repo'
export { AriseDB } from './db'
export type { Snapshot, Totals, BackupFile } from './repo'
