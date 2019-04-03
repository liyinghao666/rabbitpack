// 导出rabbitpack 通过new运算符构建出rabbitcompiler对象
// 函数可以使用this

module.exports = function rabbitpack(config) {
  let rabbitcompiler = null;
  // 初始化选项
  if (typeof(config) !== 'object')
    return;
  this.options = Object.assign({
    entry: [],
    output: [],
    module: {},
    plugins: [],
    mode: null
  }, config);
  // 初始化compiler上下文

  // 开始构建

}