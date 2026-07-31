interface PhotoPreviewProps {
  previewUrl: string
  onRetake: () => void
  onUse: () => void
}

/** Pratinjau pasca-jepret (FR-003): "Foto Ulang" / "Pakai Foto Ini". */
function PhotoPreview({ previewUrl, onRetake, onUse }: PhotoPreviewProps) {
  return (
    <section className="flex w-full flex-col gap-4" aria-label="Pratinjau foto">
      <img
        src={previewUrl}
        alt="Pratinjau foto daun yang baru diambil"
        className="max-h-[60vh] w-full rounded-2xl border border-border-primary object-contain"
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          data-testid="preview-retake"
          onClick={onRetake}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border-primary bg-background-primary px-5 py-3 text-body-md font-semibold text-font-primary transition-colors hover:bg-muted"
        >
          <i className="ph ph-arrow-counter-clockwise" aria-hidden="true" />
          Foto Ulang
        </button>
        <button
          type="button"
          data-testid="preview-use"
          onClick={onUse}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary-base px-5 py-3 text-body-md font-semibold text-font-on-accent transition-colors hover:bg-primary-bold"
        >
          <i className="ph ph-check" aria-hidden="true" />
          Pakai Foto Ini
        </button>
      </div>
    </section>
  )
}

export default PhotoPreview
