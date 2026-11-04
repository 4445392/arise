import { repo } from '../data'

export function saveBlob(name: string, blob: Blob) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
}

export async function downloadBackup(today: string): Promise<number> {
  const file = await repo.exportAll()
  saveBlob(`arise-backup-${today}.json`, new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }))
  return Object.values(file.data).reduce((n, r) => n + (r?.length ?? 0), 0)
}
