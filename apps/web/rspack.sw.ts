import path from 'path'
import { defineConfig } from '@rspack/cli'
import { rspack } from '@rspack/core'

export default defineConfig({
  mode: 'production',
  target: 'webworker',
  devtool: false,
  entry: {
    'service-worker.template': path.resolve(__dirname, 'src', 'service-worker.ts'),
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: '[name].js',
    publicPath: '/',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/i,
        exclude: /node_modules/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            sourceMap: false,
            jsc: {
              parser: {
                syntax: 'typescript',
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
    extensions: ['.js', '.json', '.ts'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [
    new rspack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
  ],
  optimization: {
    minimize: true,
    splitChunks: false,
  },
})

