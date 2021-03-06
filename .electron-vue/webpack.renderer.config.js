'use strict'

process.env.BABEL_ENV = 'renderer'

const os = require('os')
const path = require('path')
const { dependencies } = require('../package.json')
const webpack = require('webpack')

const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const ForkTsCheckerNotifierWebpackPlugin = require('fork-ts-checker-notifier-webpack-plugin')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const HappyPack = require('happypack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CspHtmlWebpackPlugin = require('csp-html-webpack-plugin')
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin')
const VueLoaderPlugin = require('vue-loader/lib/plugin')

const happyThreadPool = HappyPack.ThreadPool({ size: os.cpus().length })
function createHappyPlugin(id, loaders) {
  return new HappyPack({
    id: id,
    loaders: loaders,
    threadPool: happyThreadPool,
    verbose: false
  })
}

function returnLess() {
  return [
    process.env.NODE_ENV !== 'production'
      ? 'vue-style-loader'
      : MiniCssExtractPlugin.loader,
    'css-loader',
    'less-loader'
  ]
}
function returnCss() {
  return [
    process.env.NODE_ENV !== 'production'
      ? 'vue-style-loader'
      : MiniCssExtractPlugin.loader,
    'css-loader'
  ]
}

/**
 * List of node_modules to include in webpack bundle
 *
 * Required for specific packages like Vue UI libraries
 * that provide pure *.vue files that need compiling
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/webpack-configurations.html#white-listing-externals
 */
let whiteListedModules = ['vue']

let rendererConfig = {
  name: 'renderer',
  devtool: '#cheap-module-eval-source-map',
  entry: {
    renderer: path.join(__dirname, '../src/renderer/main.ts')
  },
  externals: [
    /^electron-debug/,
    ...Object.keys(dependencies || {}).filter(d => !whiteListedModules.includes(d))
  ],
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'happypack/loader?id=happy-ts'
        },
        include: [ path.join(__dirname, '../src') ],
        exclude: /node_modules/
      },
      {
        test: /\.js$/,
        enforce: 'pre',
        use: {
          loader: 'happypack/loader?id=happy-eslint'
        },
        include: [ path.join(__dirname, '../src/renderer'), path.join(__dirname, '../src/api') ],
        exclude: /node_modules/
      },
      {
        test: /\.less$/,
        use: returnLess,
        include: [ path.join(__dirname, '../src/renderer') ]
      },
      {
        test: /\.css$/,
        use: returnCss,
        include: [
          path.join(__dirname, '../src/renderer'),
          path.join(__dirname, '../node_modules/element-ui/lib/theme-chalk'),
          path.join(__dirname, '../node_modules/iview/dist/styles'),
          path.join(__dirname, '../node_modules/modern-normalize'),
          path.join(__dirname, '../node_modules/vue-awesome/components')
        ]
      },
      {
        test: /\.html$/,
        use: [{
          loader: 'happypack/loader?id=happy-html'
        }]
      },
      {
        test: /\.js$/,
        use: {
          loader: 'happypack/loader?id=happy-babel'
        },
        include: [ path.join(__dirname, '../src/renderer'), path.join(__dirname, '../src/api') ],
        exclude: /node_modules/
      },
      {
        test: /\.pug$/,
        use: [{
          loader: 'happypack/loader?id=happy-pug'
        }]
      },
      {
        test: /\.vue$/,
        use: {
          loader: 'vue-loader'
        },
        include: [
          path.join(__dirname, '../src/renderer'),
          path.join(__dirname, '../node_modules/iview/src/components/icon'),
          path.join(__dirname, '../node_modules/vue-awesome/components')
        ]
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        use: {
          loader: 'url-loader',
          query: {
            limit: 10000,
            name: 'imgs/[name]--[folder].[ext]'
          }
        },
      },
      {
        test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: 'media/[name]--[folder].[ext]'
        }
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        use: {
          loader: 'url-loader',
          query: {
            limit: 10000,
            name: 'fonts/[name]--[folder].[ext]'
          }
        },
      }
    ]
  },
  node: {
    __dirname: process.env.NODE_ENV !== 'production',
    __filename: process.env.NODE_ENV !== 'production'
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css'
    }),
    new OptimizeCssAssetsPlugin({
      cssProcessorOptions: { discardComments: { removeAll: true } },
      canPrint: false
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: path.join(__dirname, '../src/index.ejs'),
      minify: {
        collapseWhitespace: true,
        removeAttributeQuotes: true,
        removeComments: true
      },
      nodeModules: process.env.NODE_ENV !== 'production'
        ? path.join(__dirname, '../node_modules')
        : false
    }),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.optimize.MinChunkSizePlugin({
      minChunkSize: 10000
    }),
    new webpack.DllReferencePlugin({
      context: __dirname,
      manifest: require('../static/vendor-manifest.json')
    }),
    createHappyPlugin('happy-babel', [{
      loader: 'babel-loader',
      options: {
        cacheDirectory: true
      }
    }]),
    createHappyPlugin('happy-eslint', [{
      loader: 'eslint-loader',
      options: {
        formatter: require('eslint-friendly-formatter')
      }
    }]),
    createHappyPlugin('happy-html',  [{
      loader: 'vue-html-loader'
    }]),
    createHappyPlugin('happy-pug', [{
      loader: 'pug-plain-loader'
    }]),
    createHappyPlugin('happy-ts', [{
      loader: 'ts-loader',
      options: {
        appendTsSuffixTo: [/\.vue$/],
        configFile: path.join(__dirname, '../src/tsconfig.json'),
        happyPackMode: true,
        transpileOnly: true
      }
    }]),
    // https://github.com/amireh/happypack/pull/131
    new HappyPack({
      loaders: [{
        path: 'vue-loader',
        query: {
          loaders: {
            pug: 'pug-plain-loader'
          }
        }
      }]
    }),
    new ForkTsCheckerWebpackPlugin({
      checkSyntacticErrors: true,
      tsconfig: path.join(__dirname, '../src/tsconfig.json'),
      tslint: path.join(__dirname, '../tslint.json'),
      vue: true
    }),
    new ForkTsCheckerNotifierWebpackPlugin({ title: 'Renderer Process [Renderer]', excludeWarnings: false }),
    new VueLoaderPlugin()
  ],
  output: {
    filename: '[name].js',
    chunkFilename: '[name].js',
    libraryTarget: 'commonjs2',
    path: path.join(__dirname, '../dist')
  },
  resolve: {
    alias: {
      'src': path.join(__dirname, '../src'),
      'components': path.join(__dirname, '../src/renderer/components'),
      'renderer': path.join(__dirname, '../src/renderer'),
      'shared': path.join(__dirname, '../src/shared'),
      'i18n': path.join(__dirname, '../helper/i18n'),
      'extensions': path.join(__dirname, '../extensions'),
      'vue$': 'vue/dist/vue.runtime.esm.js'
    },
    extensions: ['.ts', '.js', '.vue', '.json', '.css', '.less', '.pug']
  },
  target: 'electron-renderer'
}

let aboutConfig = {
  name: 'about',
  devtool: '#cheap-module-eval-source-map',
  entry: {
    about: path.join(__dirname, '../src/guest/renderer/main.ts')
  },
  externals: [
    ...Object.keys(dependencies || {}).filter(d => !whiteListedModules.includes(d))
  ],
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'happypack/loader?id=happy-ts'
        },
        include: [ path.join(__dirname, '../src') ],
        exclude: /node_modules/
      },
      {
        test: /\.js$/,
        enforce: 'pre',
        use: {
          loader: 'happypack/loader?id=happy-eslint'
        },
        include: [ path.join(__dirname, '../src/guest/renderer') ],
        exclude: /node_modules/
      },
      {
        test: /\.less$/,
        use: returnLess,
        include: [ path.join(__dirname, '../src/guest/renderer') ]
      },
      {
        test: /\.css$/,
        use: returnCss,
        include: [
          path.join(__dirname, '../src/guest/renderer'),
          path.join(__dirname, '../node_modules/element-ui/lib/theme-chalk'),
          path.join(__dirname, '../node_modules/modern-normalize'),
          path.join(__dirname, '../node_modules/vue-awesome/components')
        ]
      },
      {
        test: /\.html$/,
        use: [{
          loader: 'happypack/loader?id=happy-html'
        }]
      },
      {
        test: /\.js$/,
        use: {
          loader: 'happypack/loader?id=happy-babel'
        },
        include: [ path.join(__dirname, '../src/guest/renderer') ],
        exclude: /node_modules/
      },
      {
        test: /\.pug$/,
        use: [{
          loader: 'happypack/loader?id=happy-pug'
        }]
      },
      {
        test: /\.vue$/,
        use: {
          loader: 'vue-loader'
        },
        include: [ path.join(__dirname, '../src/guest') ]
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        use: {
          loader: 'url-loader',
          query: {
            limit: 10000,
            name: 'imgs/[name]--[folder].[ext]'
          }
        },
      },
      {
        test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: 'media/[name]--[folder].[ext]'
        }
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        use: {
          loader: 'url-loader',
          query: {
            limit: 10000,
            name: 'fonts/[name]--[folder].[ext]'
          }
        },
      }
    ]
  },
  node: {
    __dirname: process.env.NODE_ENV !== 'production',
    __filename: process.env.NODE_ENV !== 'production'
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css'
    }),
    new OptimizeCssAssetsPlugin({
      cssProcessorOptions: { discardComments: { removeAll: true } },
      canPrint: false
    }),
    new HtmlWebpackPlugin({
      filename: 'about.html',
      template: path.join(__dirname, '../src/guest/index.ejs'),
      minify: {
        collapseWhitespace: true,
        removeAttributeQuotes: true,
        removeComments: true
      },
      nodeModules: false
    }),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.optimize.MinChunkSizePlugin({
      minChunkSize: 10000
    }),
    new webpack.DllReferencePlugin({
      context: __dirname,
      manifest: require('../static/vendor-manifest.json')
    }),
    createHappyPlugin('happy-babel', [{
      loader: 'babel-loader',
      options: {
        cacheDirectory: true
      }
    }]),
    createHappyPlugin('happy-eslint', [{
      loader: 'eslint-loader',
      options: {
        formatter: require('eslint-friendly-formatter')
      }
    }]),
    createHappyPlugin('happy-html',  [{
      loader: 'vue-html-loader'
    }]),
    createHappyPlugin('happy-pug', [{
      loader: 'pug-plain-loader'
    }]),
    createHappyPlugin('happy-ts', [{
      loader: 'ts-loader',
      options: {
        appendTsSuffixTo: [/\.vue$/],
        configFile: path.join(__dirname, '../src/tsconfig.json'),
        happyPackMode: true,
        transpileOnly: true
      }
    }]),
    // https://github.com/amireh/happypack/pull/131
    new HappyPack({
      loaders: [{
        path: 'vue-loader',
        query: {
          loaders: {
            pug: 'pug-plain-loader'
          }
        }
      }]
    }),
    new ForkTsCheckerWebpackPlugin({
      checkSyntacticErrors: true,
      tsconfig: path.join(__dirname, '../src/tsconfig.json'),
      tslint: path.join(__dirname, '../tslint.json'),
      vue: true
    }),
    new ForkTsCheckerNotifierWebpackPlugin({ title: 'Renderer Process [About]', excludeWarnings: false }),
    new VueLoaderPlugin()
  ],
  output: {
    filename: '[name].js',
    chunkFilename: '[name].js',
    libraryTarget: 'commonjs2',
    path: path.join(__dirname, '../dist')
  },
  resolve: {
    alias: {
      'components': path.join(__dirname, '../src/guest/renderer/components'),
      'renderer': path.join(__dirname, '../src/guest/renderer'),
      'i18n': path.join(__dirname, '../helper/i18n'),
      'vue$': 'vue/dist/vue.runtime.esm.js'
    },
    extensions: ['.ts', '.js', '.vue', '.json', '.css', '.less', '.pug']
  },
  target: 'web'
}

/**
 * Adjust rendererConfig and aboutConfig for development settings
 */
if (process.env.NODE_ENV !== 'production') {
  rendererConfig.mode = 'development'
  aboutConfig.mode = 'development'

  rendererConfig.plugins.push(
    new webpack.DefinePlugin({
      '__static': `"${path.join(__dirname, '../static').replace(/\\/g, '\\\\')}"`
    })
  )
  aboutConfig.plugins.push(
    new webpack.DefinePlugin({
      '__static': `"${path.join(__dirname, '../static').replace(/\\/g, '\\\\')}"`
    })
  )
}

/**
 * Adjust rendererConfig and aboutConfig for e2e testing settings
 */
if (process.env.TEST_ENV === 'e2e') {
  rendererConfig.mode = 'production'
  aboutConfig.mode = 'production'
  // Because the target is 'web'. Ref: https://github.com/webpack/webpack/issues/6715
  aboutConfig.performance = { hints: false }
  rendererConfig.plugins.push(
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': '"production"',
      'process.env.TEST_ENV': '"e2e"'
    }),
    new webpack.LoaderOptionsPlugin({
      minimize: true
    })
  )
  aboutConfig.plugins.push(
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': '"production"',
      'process.env.TEST_ENV': '"e2e"'
    }),
    new webpack.LoaderOptionsPlugin({
      minimize: true
    })
  )
} else {
  /**
   * Adjust rendererConfig and aboutConfig for production settings
   */
  if (process.env.NODE_ENV === 'production') {
    rendererConfig.mode = 'production'
    aboutConfig.mode = 'production'
    // Because the target is 'web'. Ref: https://github.com/webpack/webpack/issues/6715
    aboutConfig.performance = { hints: false }
    rendererConfig.devtool = false
    aboutConfig.devtool = false

    rendererConfig.plugins.push(
      new webpack.LoaderOptionsPlugin({
        minimize: true
      })
    )
    rendererConfig.plugins.push(
      new CspHtmlWebpackPlugin({
        'default-src': "'none'",
        'object-src': "'self'",
        'connect-src': ["'self'"],
        'script-src': ["'self'", "'sha256-FpY4/j63W31nSIwd1kfSbeyxSB9PKOPZ75NLii2nHJc='"],
        'style-src': ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
        'font-src': ["'self'", "https://fonts.gstatic.com", "data:"],
        'img-src': ["'self'", "https:", "http:", "data:"]
      })
    )
    aboutConfig.plugins.push(
      new webpack.LoaderOptionsPlugin({
        minimize: true
      })
    )
    aboutConfig.plugins.push(
      new CspHtmlWebpackPlugin({
        'default-src': "'none'",
        'object-src': "'none'",
        'connect-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'font-src': ["'self'", "data:"],
        'img-src': ["'self'", "https:", "http:", "data:"]
      })
    )
  }
}

module.exports = [
  Object.assign({} , rendererConfig),
  Object.assign({} , aboutConfig)
]
