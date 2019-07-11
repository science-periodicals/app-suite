const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const AssetsPlugin = require('assets-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const DuplicatePackageCheckerPlugin = require('duplicate-package-checker-webpack-plugin');
const { babel } = require('./package.json');

const isProd = process.env.NODE_ENV === 'production';
const hmr = process.env.HMR === 'false' ? false : true;

module.exports = {
  target: 'web',

  mode: isProd ? 'production' : 'development',

  entry: {
    main:
      isProd || !hmr
        ? ['./src/app.js']
        : [
            'webpack-hot-middleware/client?path=/__webpack_hmr&timeout=20000',
            './src/app.js'
          ]
  },

  output: {
    filename: `app-suite-bundle.[name]${isProd ? '.[chunkhash]' : ''}.js`,
    path: path.resolve(__dirname, 'public/assets/'),
    publicPath: '/assets/', // isProd ? undefined : 'http://127.0.0.1:3000/assets/',
    hotUpdateChunkFilename: 'hot/[id].[hash].hot-update.js',
    hotUpdateMainFilename: 'hot/[hash].hot-update.json'
  },

  devtool: isProd ? undefined : 'cheap-module-eval-source-map',

  resolve: Object.assign(
    {
      mainFields: ['module', 'browser', 'main']
    },
    isProd
      ? undefined
      : {
          alias: {
            // prevent multiple instances of react with npm link workflow
            react: path.resolve(__dirname, 'node_modules/react'),
            'react-router-dom': path.resolve(
              __dirname,
              'node_modules/react-router-dom'
            ),
            'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
            'react-dnd': path.resolve(__dirname, 'node_modules/react-dnd'),
            'react-dnd-html5-backend': path.resolve(
              __dirname,
              'node_modules/react-dnd-html5-backend'
            ),
            '@babel/preset-react': path.resolve(
              __dirname,
              'node_modules/@babel/preset-react'
            ),
            // fake global linking of sa deps
            '@scipe/ui$': path.resolve(
              __dirname,
              'node_modules/@scipe/ui/src/index.js'
            ),
            '@scipe/librarian$': path.resolve(
              __dirname,
              'node_modules/@scipe/librarian'
            ),
            '@scipe/api$': path.resolve(__dirname, 'node_modules/@scipe/api')
          }
        }
  ),

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
        exclude: isProd ? /node_modules/ : undefined,
        include: [path.resolve(__dirname, 'src')].concat(
          isProd
            ? []
            : [
                fs.realpathSync(
                  path.resolve(__dirname, 'node_modules/@scipe/ui/src')
                ),
                fs.realpathSync(
                  path.resolve(__dirname, 'node_modules/@scipe/api/src')
                ),
                fs.realpathSync(
                  path.resolve(__dirname, 'node_modules/@scipe/librarian/src')
                )
              ]
        )
      },

      // CSS
      {
        test: /\.css$/,
        sideEffects: true,

        use: [
          isProd
            ? {
                loader: MiniCssExtractPlugin.loader,
                options: {
                  publicPath: path.resolve(__dirname, 'public/assets/')
                }
              }
            : { loader: 'style-loader' },
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              sourceMap: true
            }
          },
          {
            loader: 'postcss-loader',
            options: {
              ident: 'postcss',
              plugins: function(loader) {
                return [
                  require('postcss-import')(),
                  require('postcss-url')(),
                  require('postcss-preset-env')({
                    /* see: https://github.com/csstools/postcss-preset-env/issues/32 */
                    browsers: 'last 2 versions',
                    stage: 3,
                    features: {
                      'nesting-rules': false /* disable css nesting which does not allow nesting of selectors without white spaces between them */,
                      'custom-media-queries': true
                    }
                  }),
                  require('postcss-nested') /*replace cssnext nesting with this one which allows for sass style nesting*/,
                  require('postcss-reporter')({
                    clearAllMessages: false
                  })
                ];
              }
            }
          }
        ].filter(Boolean),
        include: [path.resolve(__dirname, 'src')] // does this work with imports?
      }
    ]
  },

  //optimization: {
  //  minimize: false
  //},

  optimization: isProd
    ? {
        minimizer: [
          new TerserPlugin({
            terserOptions: {
              keep_classnames: true,
              keep_fnames: true
            }
          }),
          new OptimizeCSSAssetsPlugin({})
        ]
      }
    : undefined,

  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(
        process.env.NODE_ENV || 'development'
      ),
      'process.env.DB_NAME': JSON.stringify(process.env.DB_NAME || 'scienceai')
    }),
    // See https://webpack.js.org/plugins/ignore-plugin/#example-of-ignoring-moment-locales
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /moment$/
    }),
    isProd
      ? new MiniCssExtractPlugin({
          filename: 'app-suite-bundle.[name].[hash].css',
          chunkFilename: 'app-suite-bundle.[id].[hash].css'
        })
      : null,
    isProd || !hmr ? null : new webpack.HotModuleReplacementPlugin(),
    new AssetsPlugin({
      filename: `app-suite-bundle-manifest-${isProd ? 'prod' : 'dev'}.json`,
      fullPath: false,
      path: path.resolve(__dirname, 'public/assets/'),
      prettyPrint: true
    }),
    isProd
      ? null
      : new DuplicatePackageCheckerPlugin({
          verbose: true
        })
  ].filter(Boolean)
};
