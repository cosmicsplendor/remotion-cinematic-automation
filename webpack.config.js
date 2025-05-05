
const path = require('path');

module.exports = {
  // This tells webpack to use this config as an override
  // instead of replacing the entire config
  module: {
    rules: [
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
      },
    ],
  },
  resolve: {
    alias: {
      // Add aliases for your directories
      '@public': path.resolve(__dirname, 'public'),
      '@assets': path.resolve(__dirname, 'public/assets'),
    },
  },
};