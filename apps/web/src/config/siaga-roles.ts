import type { SiagaRole } from '@/types/siaga-auth'

/** Display labels (Bahasa Indonesia) for every Siaga role. */
export const ROLE_LABELS: Record<SiagaRole, string> = {
  petani: 'Petani',
  penyuluh: 'Penyuluh',
  admin: 'Admin',
  domain_reviewer: 'Peninjau Domain',
}

export function getRoleLabel(role: SiagaRole | null | undefined): string {
  return role ? ROLE_LABELS[role] : ''
}
