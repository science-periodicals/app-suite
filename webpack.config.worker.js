const path = require('path');
const webpack = require('webpack');
const AssetsPlugin = require('assets-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { babel } = require('./package.json');

const isProd = process.env.NODE_ENV === 'production';

module.exports = {
  target: 'webworker',

  mode: isProd ? 'production' : 'development',

  entry: {
    'xlsx-worker': ['./src/webworkers/xlsx-worker.js'],
    'highlight-worker': ['./src/webworkers/highlight-worker.js']
  },

  output: {
    filename: `app-suite-worker-bundle.[name]${
      isProd ? '.[chunkhash]' : ''
    }.js`,
    path: path.resolve(__dirname, 'public/assets/'),
    publicPath: isProd ? undefined : 'http://127.0.0.1:3000/assets/'
  },

  resolve: Object.assign({
    mainFields: ['browser', 'main']
  }),

  devtool: isProd ? undefined : 'cheap-module-eval-source-map',

  module: {
    rules: [
      {
        test: /unicode\/category\/So/,
        use: [
          {
            loader: 'null-loader'
          }
        ],
        include: path.resolve(__dirname, 'node_modules')
      },
      {
        test: /\.js$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: babel.presets,
              plugins: babel.plugins
            }
          }
        ],
        exclude: /node_modules/,
        include: [path.resolve(__dirname, 'src')]
      }
    ]
  },

  //  optimization: {
  //    minimize: false
  //    //splitChunks: {
  //    //  chunks: 'all'
  //    //}
  //  },

  optimization: isProd
    ? {
        minimizer: [
          new TerserPlugin({
            terserOptions: {
              keep_classnames: true,
              keep_fnames: true
            }
          })
        ]
      }
    : undefined,

  plugins: [
    new webpack.DefinePlugin({
      window: JSON.stringify({}), // poor man window mock...
      'process.env.NODE_ENV': JSON.stringify(
        process.env.NODE_ENV || 'development'
      ),
      'process.env.DB_NAME': JSON.stringify(process.env.DB_NAME || 'scienceai')
    }),
    new AssetsPlugin({
      filename: `app-suite-worker-bundle-manifest-${
        isProd ? 'prod' : 'dev'
      }.json`,
      fullPath: false,
      path: path.resolve(__dirname, 'public/assets/'),
      prettyPrint: true
    })
  ]
};
