import type { SiagaCaseStatus } from '@/types/siaga-case'

/**
 * Which canonical case statuses still expect photo work — mirrors the
 * backend's `ADVANCE_FROM_STATUSES` (`service/photos.py`).
 *
 * While a case sits in one of these, the photo flow must stay reachable:
 * a farmer who leaves mid-capture (or is sent back by a penyuluh) needs a
 * way back to the camera, otherwise the case is stranded.
 */
export const PHOTO_PENDING_STATUSES: SiagaCaseStatus[] = ['DRAFT', 'QUALITY_REJECTED', 'REVISION_REQUIRED']

/** Statuses where earlier photos exist and the user is redoing them. */
const RETAKE_STATUSES: SiagaCaseStatus[] = ['QUALITY_REJECTED', 'REVISION_REQUIRED']

/** `status` stays `string` per the contract — compare defensively. */
export const isPhotoPending = (status: string): boolean => PHOTO_PENDING_STATUSES.includes(status as SiagaCaseStatus)

export const isPhotoRetake = (status: string): boolean => RETAKE_STATUSES.includes(status as SiagaCaseStatus)
