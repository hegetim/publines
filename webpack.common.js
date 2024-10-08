/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: CC0-1.0
 */

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: './src/index.tsx',
    plugins: [
        new HtmlWebpackPlugin({
            template: 'src/static/index.html',
            favicon: 'src/static/favicon.ico',
            chunks: ['main'],
        }),
        new MiniCssExtractPlugin(),
        new CopyPlugin({
            patterns: [
                { from: path.resolve(__dirname, 'src', 'static', 'imprint.csv'), to: path.resolve(__dirname, 'build') },
                { from: path.resolve(__dirname, 'src', 'static', 'gh.svg'), to: path.resolve(__dirname, 'build') },
            ]
        }),
    ],
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.css$/i,
                use: [MiniCssExtractPlugin.loader, 'css-loader'],
            },
            {
                test: /\.(png|svg|jpg|jpeg|gif|ico)$/i,
                type: 'asset/resource',
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/i,
                type: 'asset/resource',
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js', '.html', '.ico'],
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'build'),
        clean: true,
    },
};
