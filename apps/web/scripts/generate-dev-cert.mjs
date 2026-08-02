#!/usr/bin/env node
/**
 * Generates a TLS certificate for the local dev server so the app can be opened
 * over HTTPS from other devices on the LAN (phones, tablets).
 *
 * Browsers only expose service workers on a secure context: https:// or
 * http://localhost. Opening the dev server through a LAN IP over plain HTTP
 * leaves `navigator.serviceWorker` undefined, which the app surfaces as
 * "Penyimpanan offline tidak tersedia".
 *
 * Prefers mkcert (locally trusted, no warning on this machine) and falls back
 * to openssl (available everywhere, shows a one-time browser warning).
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { networkInterfaces, tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = path.resolve(SCRIPT_DIRECTORY, '..')
const CERT_DIRECTORY = path.join(WEB_ROOT, 'certs')
const KEY_FILE = path.join(CERT_DIRECTORY, 'dev-key.pem')
const CERT_FILE = path.join(CERT_DIRECTORY, 'dev-cert.pem')
// Safari and iOS reject leaf certificates valid for longer than 825 days.
const CERT_VALIDITY_DAYS = 825
const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '::1']

function listLanAddresses() {
  return Object.values(networkInterfaces())
    .flatMap((entries) => entries ?? [])
    .filter((entry) => entry.family === 'IPv4' && !entry.internal)
    .map((entry) => entry.address)
}

function hasCommand(command) {
  try {
    execFileSync('which', [command], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function isIpAddress(host) {
  return /^[0-9.]+$/.test(host) || host.includes(':')
}

function generateWithMkcert(hosts) {
  execFileSync('mkcert', ['-key-file', KEY_FILE, '-cert-file', CERT_FILE, ...hosts], {
    stdio: 'inherit',
  })
}

function buildOpensslConfig(hosts) {
  const altNames = hosts
    .map((host, index) => `${isIpAddress(host) ? 'IP' : 'DNS'}.${index + 1} = ${host}`)
    .join('\n')

  return [
    '[req]',
    'distinguished_name = dn',
    'x509_extensions = v3_req',
    'prompt = no',
    '',
    '[dn]',
    'CN = siaga-padi-dev',
    '',
    '[v3_req]',
    'basicConstraints = CA:FALSE',
    'keyUsage = digitalSignature, keyEncipherment',
    'extendedKeyUsage = serverAuth',
    'subjectAltName = @alt_names',
    '',
    '[alt_names]',
    altNames,
    '',
  ].join('\n')
}

function generateWithOpenssl(hosts) {
  const configFile = path.join(tmpdir(), `siaga-padi-dev-cert-${process.pid}.cnf`)
  writeFileSync(configFile, buildOpensslConfig(hosts), 'utf8')

  try {
    execFileSync(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-nodes',
        '-sha256',
        '-days',
        String(CERT_VALIDITY_DAYS),
        '-keyout',
        KEY_FILE,
        '-out',
        CERT_FILE,
        '-config',
        configFile,
      ],
      { stdio: 'inherit' },
    )
  } finally {
    rmSync(configFile, { force: true })
  }
}

function main() {
  const lanAddresses = listLanAddresses()
  const hosts = [...new Set([...LOOPBACK_HOSTS, ...lanAddresses])]

  mkdirSync(CERT_DIRECTORY, { recursive: true })

  const usesMkcert = hasCommand('mkcert')
  if (!usesMkcert && !hasCommand('openssl')) {
    console.error(
      '✗ Butuh mkcert atau openssl untuk membuat sertifikat dev.\n' +
        '  Install salah satu: brew install mkcert   (atau)   brew install openssl',
    )
    process.exit(1)
  }

  try {
    if (usesMkcert) {
      generateWithMkcert(hosts)
    } else {
      generateWithOpenssl(hosts)
    }
  } catch (error) {
    console.error(
      `✗ Gagal membuat sertifikat dev: ${error instanceof Error ? error.message : String(error)}`,
    )
    process.exit(1)
  }

  const port = process.env.PORT ?? '3000'
  console.log(`\n✓ Sertifikat dev dibuat untuk: ${hosts.join(', ')}`)
  console.log(`  key : ${path.relative(WEB_ROOT, KEY_FILE)}`)
  console.log(`  cert: ${path.relative(WEB_ROOT, CERT_FILE)}\n`)
  console.log('  Jalankan dev server HTTPS: npm run dev:https')
  for (const address of lanAddresses) {
    console.log(`  Buka dari HP            : https://${address}:${port}`)
  }
  if (!usesMkcert) {
    console.log(
      '\n  Sertifikat ini self-signed. Browser akan menampilkan peringatan sekali —\n' +
        '  pilih "Advanced" / "Lanjutkan" untuk melanjutkan. Untuk menghilangkan\n' +
        '  peringatan di mesin ini: brew install mkcert && mkcert -install,\n' +
        '  lalu jalankan ulang perintah ini.',
    )
  }
}

main()
