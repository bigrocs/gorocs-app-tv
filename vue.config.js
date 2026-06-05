/*
 * @Description: Vue CLI配置
 */
module.exports = {
  configureWebpack: {
    resolve: {
      extensions: ['.ts', '.js', '.json', '.vue'],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'babel-loader',
            },
          ],
        },
      ],
    },
    // 忽略 mqtt.js 的可选原生依赖警告(app-plus环境不需要)
    externals: process.env.UNI_PLATFORM === 'app-plus' ? {} : {},
  },
  chainWebpack: (config) => {
    // 屏蔽 bufferutil 和 utf-8-validate 的 Module not found 警告
    config.resolve.set('alias', {
      ...config.resolve.alias.entries(),
      bufferutil: false,
      'utf-8-validate': false,
    })
  },
}
