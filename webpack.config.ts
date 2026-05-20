import * as path from 'path';
import { type Configuration } from 'webpack';
import { ConsoleRemotePlugin } from '@openshift-console/dynamic-plugin-sdk-webpack';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const CopyWebpackPlugin = require('copy-webpack-plugin');

const isProd = process.env.NODE_ENV === 'production';

const config: Configuration & { devServer?: Record<string, unknown> } = {
  mode: isProd ? 'production' : 'development',
  entry: {},
  context: path.resolve(__dirname, 'src'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: isProd ? '[name]-bundle-[contenthash].min.js' : '[name]-bundle.js',
    chunkFilename: isProd
      ? '[name]-chunk-[contenthash].min.js'
      : '[name]-chunk.js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@models': path.resolve(__dirname, 'src/models'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@utils': path.resolve(__dirname, 'src/utils'),
    },
  },
  module: {
    rules: [
      {
        test: /\.(jsx?|tsx?)$/,
        exclude: /node_modules/,
        use: [{ loader: 'swc-loader' }],
      },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      {
        test: /\.(png|jpg|jpeg|gif|svg|woff2?|ttf|eot|otf)(\?.*)?$/,
        type: 'asset/resource',
        generator: {
          filename: isProd
            ? 'assets/[name]-[contenthash][ext]'
            : 'assets/[name][ext]',
        },
      },
      { test: /\.m?js/, resolve: { fullySpecified: false } },
    ],
  },
  devServer: {
    static: './dist',
    port: 9001,
    allowedHosts: 'all',
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods':
        'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    },
    devMiddleware: { writeToDisk: true },
  },
  plugins: [
    new ConsoleRemotePlugin(),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'locales'),
          to: 'locales',
          noErrorOnMissing: true,
        },
      ],
    }),
  ],
  devtool: isProd ? false : 'source-map',
  optimization: {
    chunkIds: isProd ? 'deterministic' : 'named',
    minimize: isProd,
  },
};

export default config;
