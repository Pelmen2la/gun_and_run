var path = require('path'),
    webpack = require('webpack'),
    phaserModule = path.join(__dirname, '/node_modules/phaser/'),
    phaser = path.join(phaserModule, 'build/custom/phaser-split.js'),
    pixi = path.join(phaserModule, 'build/custom/pixi.js'),
    p2 = path.join(phaserModule, 'build/custom/p2.js'),
    UglifyJSPlugin = require('uglifyjs-webpack-plugin');

process.traceDeprecation = true;
module.exports = {
    entry: {
        app: './static/js/app.js'
    },
    output: { path: __dirname + '/static/dist/js/', filename: '[name].js'},
    module: {
        loaders: [
            { test: /pixi.js/, loader: 'script-loader' },
            { test: /p2.js/, loader: 'script-loader' },
            { test: /phaser-split.js/, loader: 'script-loader' },
            {
                test: /.jsx?$/,
                loader: 'babel-loader',
                exclude: /node_modules/,
                query: {
                    presets: ['es2015']
                }
            },
            {
                test: /\.(scss|css)$/,
                use: [
                    {
                        loader: 'style-loader'
                    },
                    {
                        loader: 'css-loader',
                        options: {
                            sourceMap: true,
                            importLoaders: 1
                        }
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            sourceMap: 'inline'
                        }
                    }
                ]
            },
        ]
    },
    plugins: process.env.arg == 'prod' ? [
        new UglifyJSPlugin()
    ] : [],
    resolve: {
        alias: {
            'phaser': phaser,
            'p2': p2,
            'pixi.js': pixi
        }
    }
};