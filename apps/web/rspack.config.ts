import path from 'path'
import { defineConfig } from '@rspack/cli'
import { rspack } from '@rspack/core'
const { ModuleFederationPlugin } = rspack.container
const { dependencies } = require('./package.json')

import ESLintPlugin from 'eslint-rspack-plugin'  // ganti dari eslint-webpack-plugin
import ReactRefreshRspackPlugin from '@rspack/plugin-react-refresh'

const isDev = process.env.NODE_ENV === 'development'

export default defineConfig({
  output: {
    publicPath: '/',
  },
  entry: ['./src/main.tsx'],
  module: {
    rules: [
      // SVG dari node_modules — pakai asset/source (pengganti svg-inline-loader)
      {
        test: /\.svg$/,
        include: [path.resolve(__dirname, './node_modules')],
        type: 'asset/source',
      },

      // Gambar — pakai asset modules (pengganti url-loader + file-loader)
      // url-loader & file-loader digabung jadi satu rule dengan type asset
      {
        test: /\.(png|jpg|jpeg|gif)$/,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024, // file < 8kb jadi inline base64, sisanya jadi file
          },
        },
        generator: {
          filename: '[name].[hash][ext]',
        },
      },

      // TypeScript + React — pakai builtin:swc-loader (pengganti babel-loader)
      {
        test: /\.(ts|js)x?$/i,
        exclude: /node_modules/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            sourceMap: false,
            jsc: {
              parser: {
                syntax: 'typescript',
                tsx: true,
              },
              transform: {
                react: {
                  runtime: 'automatic',
                  development: isDev,
                  refresh: isDev, // pengganti react-refresh/babel
                },
              },
            },
            env: {
              targets: 'Chrome >= 87, Firefox >= 78, Safari >= 14',
            },
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    fallback: {
      os: false,
      fs: false,
    },
  },
  plugins: [
    new rspack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    }),
    new rspack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      'window.jQuery': 'jquery',
    }),
    isDev && new ESLintPlugin({
      extensions: ['js', 'jsx', 'ts', 'tsx'],
    }),
    isDev && new ReactRefreshRspackPlugin(),
  ].filter(Boolean) as any,
})