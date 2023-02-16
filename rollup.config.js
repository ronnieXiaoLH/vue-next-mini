import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'

export default [
  {
    input: 'packages/vue/src/index.ts',
    output: [
      // 导出 iife 模式的包
      {
        // 开启 sourceMap
        sourcemap: true,
        // 导出文件地址
        file: './packages/vue/dist/vue.js',
        // 生成包的格式
        format: 'iife',
        // 变量名
        name: 'Vue'
      }
    ],
    // 插件
    plugins: [
      typescript({
        sourceMap: true
      }),
      resolve(),
      commonjs()
    ]
  }
]
