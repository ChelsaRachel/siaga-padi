import { rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { injectManifest } from 'workbox-build'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const appDirectory = path.resolve(scriptDirectory, '..')
const buildDirectory = path.join(appDirectory, 'build')
const workerTemplate = path.join(buildDirectory, 'service-worker.template.js')
const workerDestination = path.join(buildDirectory, 'service-worker.js')

try {
  const result = await injectManifest({
    swSrc: workerTemplate,
    swDest: workerDestination,
    globDirectory: buildDirectory,
    globPatterns: ['**/*.{css,html,ico,js,json,png,svg,woff,woff2}'],
    globIgnores: ['**/*.gz', 'service-worker*.js'],
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  })

  result.warnings.forEach((warning) => process.stderr.write(`${warning}\n`))
  process.stdout.write(
    `Injected ${result.count} files (${result.size} bytes) into service-worker.js.\n`,
  )
} finally {
  await rm(workerTemplate, { force: true })
}

