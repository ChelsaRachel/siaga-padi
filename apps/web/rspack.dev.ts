import * as rspack from '@rspack/core'
import tailwindcssPlugin from '@tailwindcss/postcss'
import * as dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { merge } from 'webpack-merge'
import proxyConfiguration from './proxy.config.json'
import common from './rspack.config'

const DEV_CERT_DIRECTORY = path.join(__dirname, 'certs')
const DEV_CERT_KEY_FILE = path.join(DEV_CERT_DIRECTORY, 'dev-key.pem')
const DEV_CERT_FILE = path.join(DEV_CERT_DIRECTORY, 'dev-cert.pem')

/**
 * Service workers are only exposed on a secure context — https:// or
 * http://localhost. Testing the PWA from a phone means reaching the dev server
 * by LAN IP, which is insecure over plain HTTP, so HTTPS is opt-in here through
 * DEV_HTTPS=true (see `npm run dev:https`).
 */
function resolveDevServerProtocol() {
  if (process.env.DEV_HTTPS !== 'true') {
    return { type: 'http' as const }
  }

  const missingFiles = [DEV_CERT_KEY_FILE, DEV_CERT_FILE].filter((file) => !fs.existsSync(file))
  if (missingFiles.length > 0) {
    throw new Error(
      'DEV_HTTPS=true tetapi sertifikat dev belum ada:\n' +
        missingFiles.map((file) => `  - ${path.relative(__dirname, file)}`).join('\n') +
        '\nBuat dulu dengan: npm run dev:cert',
    )
  }

  return {
    type: 'https' as const,
    options: {
      key: fs.readFileSync(DEV_CERT_KEY_FILE),
      cert: fs.readFileSync(DEV_CERT_FILE),
    },
  }
}

module.exports = merge(common, {
  mode: 'development',
  devtool: 'eval-source-map',
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              import: true,
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                ident: 'postcss',
                plugins: [tailwindcssPlugin],
              },
              execute: false,
              sourceMap: true,
            },
          },
        ],
      },
      {
        test: /\.(s(a|c)ss)$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              import: true,
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                ident: 'postcss',
                plugins: [tailwindcssPlugin],
              },
              execute: false,
              // ✅ FIX resolve-url-loader: sourceMap harus true agar source map di-pass ke loader berikutnya
              sourceMap: true,
            },
          },
          {
            loader: 'resolve-url-loader',
            // ✅ FIX: hapus debug:true (verbose), pastikan sourceMap: true konsisten di semua loader
            options: { sourceMap: true, keepQuery: true },
          },
          {
            loader: 'sass-loader',
            options: {
              // sourceMap: true WAJIB agar resolve-url-loader dapat source map dari sass
              sourceMap: true,
              api: 'modern-compiler',
              sassOptions: {
                quietDeps: true,
                silenceDeprecations: ['import', 'global-builtin', 'if-function'],
              },
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new rspack.HtmlRspackPlugin({
      template: 'index.html',
    }),
    new rspack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.ENV_TARGET': JSON.stringify(process.env.ENV_TARGET || 'development'),
      ...Object.entries(dotenv.config({ path: './env/.env' }).parsed || {}).reduce((acc: any, [key, value]) => {
        acc[`process.env.${key}`] = JSON.stringify(value)
        return acc
      }, {}),
    }),
  ],
  devServer: {
    hot: true,
    port: process.env.PORT || 'auto',
    host: '0.0.0.0',
    allowedHosts: 'all',
    server: resolveDevServerProtocol(),
    static: {
      directory: path.join(__dirname, 'public'),
    },
    client: {
      overlay: true,
      logging: 'info',
    },
    historyApiFallback: true,
    proxy: <any>proxyConfiguration,
    open: true,
  },
})
