import { CAMERA_TIPS, PRIVACY_NOTE } from '../photo-labels'

interface PhotoExamplesProps {
  onStart: () => void
}

interface IExampleCard {
  isGood: boolean
  title: string
  description: string
  icon: string
}

/** Static comparison gallery (FR-003): what a usable leaf photo looks like. */
const EXAMPLE_CARDS: IExampleCard[] = [
  {
    isGood: true,
    title: 'Daun memenuhi bingkai',
    description: 'Satu daun jelas, tajam, dan terang merata.',
    icon: 'check-circle',
  },
  {
    isGood: true,
    title: 'Cahaya cukup',
    description: 'Difoto di tempat terang tanpa bayangan gelap.',
    icon: 'sun',
  },
  {
    isGood: false,
    title: 'Buram / goyang',
    description: 'Kamera bergerak sebelum fokus terkunci.',
    icon: 'drop-half',
  },
  {
    isGood: false,
    title: 'Terlalu jauh',
    description: 'Daun kecil, latar sawah mendominasi foto.',
    icon: 'arrows-out',
  },
]

/**
 * Intro step: contoh baik/buruk sebelum memotret + tips + catatan privasi
 * EXIF. Petani melihat panduan visual dulu, baru kamera (brief 02 §2.1).
 */
function PhotoExamples({ onStart }: PhotoExamplesProps) {
  return (
    <section className="flex w-full flex-col gap-5" aria-label="Contoh foto baik dan buruk">
      <div className="grid grid-cols-2 gap-3">
        {EXAMPLE_CARDS.map((card) => (
          <article
            key={card.title}
            data-testid={card.isGood ? 'example-good' : 'example-bad'}
            className={`flex flex-col gap-2 rounded-2xl border p-4 ${
              card.isGood
                ? 'border-primary-soft bg-primary-light'
                : 'border-destructive/30 bg-destructive/5'
            }`}
          >
            <span
              className={`flex size-9 items-center justify-center rounded-xl ${
                card.isGood
                  ? 'bg-primary-base text-font-on-accent'
                  : 'bg-destructive/15 text-destructive'
              }`}
            >
              <i className={`ph ph-${card.icon} text-body-lg`} aria-hidden="true" />
            </span>
            <p className="text-body-md font-semibold text-font-primary">
              {card.isGood ? 'Baik — ' : 'Hindari — '}
              {card.title}
            </p>
            <p className="text-body-sm text-font-secondary">{card.description}</p>
          </article>
        ))}
      </div>

      <ul className="flex flex-col gap-2 rounded-2xl border border-border-primary bg-background-primary p-4">
        {CAMERA_TIPS.map((tip) => (
          <li key={tip} className="flex items-center gap-2 text-body-md text-font-primary">
            <i className="ph ph-lightbulb text-primary-base" aria-hidden="true" />
            {tip}
          </li>
        ))}
      </ul>

      <p className="flex items-start gap-2 text-body-sm text-font-secondary">
        <i className="ph ph-shield-check mt-0.5 text-primary-base" aria-hidden="true" />
        {PRIVACY_NOTE}
      </p>

      <button
        type="button"
        onClick={onStart}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-base px-5 py-3 text-body-md font-semibold text-font-on-accent transition-colors hover:bg-primary-bold"
      >
        <i className="ph ph-camera" aria-hidden="true" />
        Mulai Ambil Foto
      </button>
    </section>
  )
}

export default PhotoExamples
