import * as rspack from '@rspack/core'
import { CleanWebpackPlugin } from 'clean-webpack-plugin'
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin'
import * as dotenv from 'dotenv'
import ESLintPlugin from 'eslint-rspack-plugin'
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'
import path from 'path'
import TerserPlugin from 'terser-webpack-plugin'
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'
import { merge } from 'webpack-merge'

import common from './rspack.config'

module.exports = merge(common, {
  mode: 'production',
  devtool: false,
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: '[name].[contenthash].js',
    publicPath: '/',
  },
  module: {
    rules: [

      {
        test: /\.css$/i,
        use: [
          rspack.CssExtractRspackPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: ['@tailwindcss/postcss', 'autoprefixer'],
              },
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new rspack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
      'process.env.ENV_TARGET': JSON.stringify(process.env.ENV_TARGET || 'production'),
      ...Object.entries(dotenv.config({ path: './env/.env.' + process.env.ENV_TARGET }).parsed || {}).reduce((acc: any, [key, value]) => {
        acc[`process.env.${key}`] = JSON.stringify(value);
        return acc;
      }, {}),
    }),
    new rspack.HtmlRspackPlugin({
      template: 'index.html',
      minify: true,
    }),
    new rspack.CopyRspackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'public', ''),
          to: path.resolve(__dirname, 'build', ''),
        },
      ],
    }),
    // new ForkTsCheckerWebpackPlugin({
    //   async: false,
    // }),
    // new ESLintPlugin({
    //   extensions: ['js', 'jsx', 'ts', 'tsx'],
    //   overrideConfigFile: path.resolve(__dirname, '.eslintrc.json'),
    // }),
    new CleanWebpackPlugin(),
    new rspack.CssExtractRspackPlugin({
      filename: `css/[name].[contenthash].css`,
      chunkFilename: `css/[id].[contenthash].css`,
    }),
    ...(process.env.NODE_ENV == 'production-analyze'
      ? [
        new BundleAnalyzerPlugin({
          analyzerMode: 'static', // menggunakan mode 'static' untuk menghasilkan laporan sebagai file HTML
          openAnalyzer: true, // secara otomatis membuka laporan setelah build selesai
        }),
      ]
      : []),
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          format: {
            comments: false,
          },
          compress: {
            drop_console: process.env.ENV_TARGET == 'staging' ? false : true,
          },
        },
        extractComments: false,
        parallel: 2,
      }),
      new CssMinimizerPlugin(),
    ],
    splitChunks: {
      chunks: 'all',
      automaticNameDelimiter: '-', // Ensures consistent chunk naming
      minSize: 30000,
      maxSize: 244000,
      cacheGroups: {
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        },
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
          reuseExistingChunk: true,
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'async',
          priority: 10,
          reuseExistingChunk: true,
          enforce: true,
        },
        styles: {
          name: 'styles',
          test: /\.css$/,
          chunks: 'all',
          enforce: true,
        },
      },
    },
  },
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
})
