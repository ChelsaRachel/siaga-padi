import * as rspack from '@rspack/core';
import tailwindcssPlugin from '@tailwindcss/postcss';
import * as dotenv from 'dotenv';
import path from 'path';
import { merge } from 'webpack-merge';
import proxyConfiguration from './proxy.config.json';
import common from './rspack.config';

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
        acc[`process.env.${key}`] = JSON.stringify(value);
        return acc;
      }, {}),
    }),
  ],
  devServer: {
    hot: true,
    port: process.env.PORT || 'auto',
    host: '0.0.0.0',
    allowedHosts: 'all',
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
