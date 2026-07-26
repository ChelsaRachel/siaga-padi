import { HomeTile } from './HomeTile'

/** Domain reviewer home — kelola pengetahuan (contract § Roles). */
export function DomainReviewerHome() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <HomeTile
        to="/pengetahuan"
        icon="books"
        title="Pengetahuan"
        description="Kelola sumber rujukan dan basis pengetahuan hama & penyakit."
        isPrimary
      />
    </div>
  )
}
