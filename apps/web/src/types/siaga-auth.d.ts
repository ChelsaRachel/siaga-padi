/**
 * Siaga Padi auth domain types — mirrors `docs/api-spec.md` § Shared types.
 * All fields camelCase, exactly as the pinned FE ↔ BE contract defines them.
 */

export type SiagaRole = 'petani' | 'penyuluh' | 'admin' | 'domain_reviewer'

export type AccountStatus = 'mandiri' | 'didampingi' | 'locked' | 'inactive'

export type ConsentMethod = 'lisan' | 'tertulis' | 'in_app'

export interface SiagaProfile {
  profileId: string
  userId: string
  displayName: string
  role: SiagaRole
  areaKabupaten: string | null
  areaKecamatan: string | null
  accountStatus: AccountStatus
  researchConsent: boolean
  locationConsent: boolean
  /** Kecamatan list — non-null only for penyuluh. */
  assignmentAreas: string[] | null
  /** ISO 8601 */
  createdAt: string
  updatedAt: string
}

export interface SiagaSession {
  accessToken: string
  refreshToken: string
  tokenType: 'bearer'
  /** Seconds until the access token expires. */
  expiresIn: number
}
