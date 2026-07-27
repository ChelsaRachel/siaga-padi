/**
 * Panel informasi ringkas: untuk apa data kasus dipakai. Shown on wizard
 * step 1 so consent context precedes any data entry (privacy by design).
 */
export function ConsentInfoPanel() {
  return (
    <aside
      data-testid="consent-info-panel"
      className="flex items-start gap-3 rounded-2xl border border-info-soft bg-info-light p-4"
    >
      <i className="ph-fill ph-shield-check shrink-0 text-h5 text-info-deep" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-body-md font-semibold text-font-primary">Untuk apa data ini dipakai?</p>
        <p className="mt-1 text-body-sm text-font-secondary">
          Data lahan, lokasi, dan foto hanya dipakai untuk memeriksa kesehatan tanaman Anda dan
          membantu penyuluh memberi rekomendasi. Lokasi GPS bersifat opsional dan hanya dikirim
          bila Anda menyetujuinya. Anda dapat meminta penghapusan data kapan saja lewat halaman
          Profil.
        </p>
      </div>
    </aside>
  )
}
