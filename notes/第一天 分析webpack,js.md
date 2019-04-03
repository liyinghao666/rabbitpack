我们打开webpack.js文件，它的导出函数是webpack函数

```js
const webpack = (options, callback) => {
    // 对传入的options进行处理，如果有错 抛出错误信息
	const webpackOptionsValidationErrors = validateSchema(
		webpackOptionsSchema,
		options
	);
	if (webpackOptionsValidationErrors.length) {
		throw new WebpackOptionsValidationError(webpackOptionsValidationErrors);
	}
    
	let compiler;
    // 如果存在多组options 调用多重编译
	if (Array.isArray(options)) {
		compiler = new MultiCompiler(options.map(options => webpack(options)));
	} else if (typeof options === "object") {
        // 对options做一些处理并产生compiler对象
		options = new WebpackOptionsDefaulter().process(options);

		compiler = new Compiler(options.context);
		compiler.options = options;
        // 将默认node插件挂到钩子上面
		new NodeEnvironmentPlugin().apply(compiler);
        // 将用户自定义插件挂到钩子上面
		if (options.plugins && Array.isArray(options.plugins)) {
			for (const plugin of options.plugins) {
				if (typeof plugin === "function") {
					plugin.call(compiler, compiler);
				} else {
					plugin.apply(compiler);
				}
			}
		}
        // 直接触发enviroment和afterEnviroment生命周期
		compiler.hooks.environment.call();
		compiler.hooks.afterEnvironment.call();
        // 对compiler对象的参数做再处理
		compiler.options = new WebpackOptionsApply().process(options, compiler);
	} else {
		throw new Error("Invalid argument: options");
	}
	if (callback) {
        // 下面是对watch模式的一些处理，我们暂时不关注它
		if (typeof callback !== "function") {
			throw new Error("Invalid argument: callback");
		}
		if (
			options.watch === true ||
			(Array.isArray(options) && options.some(o => o.watch))
		) {
			const watchOptions = Array.isArray(options)
				? options.map(o => o.watchOptions || {})
				: options.watchOptions || {};
			return compiler.watch(watchOptions, callback);
		}
		compiler.run(callback);
	}
    // 最后返回compiler对象
	return compiler;
};
/****
 ....
***/
exports = module.exports = webpack;
// 此外 webpack 还定义了一系列按需加载的插件

// 在exports对象上绑定默认插件
const exportPlugins = (obj, mappings) => {
	for (const name of Object.keys(mappings)) {
		Object.defineProperty(obj, name, {
			configurable: false, //不可配置
			enumerable: true,    //可枚举
			get: mappings[name]  //get返回插件实例
		});
	}
};
// 以下是在exports的本体或者子对象上挂载插件的过程
exportPlugins(exports, {
	AutomaticPrefetchPlugin: () => require("./AutomaticPrefetchPlugin"),
	BannerPlugin: () => require("./BannerPlugin"),
	CachePlugin: () => require("./CachePlugin"),
	ContextExclusionPlugin: () => require("./ContextExclusionPlugin"),
	ContextReplacementPlugin: () => require("./ContextReplacementPlugin"),
	// ...
    // ...
    // ...
});
exportPlugins((exports.dependencies = {}), {
	DependencyReference: () => require("./dependencies/DependencyReference")
});
exportPlugins((exports.optimize = {}), {
	AggressiveMergingPlugin: () => require("./optimize/AggressiveMergingPlugin"),
	AggressiveSplittingPlugin: () =>
		require("./optimize/AggressiveSplittingPlugin"),
	// ...
    // ...
    // ...
});
exportPlugins((exports.web = {}), {
	FetchCompileWasmTemplatePlugin: () =>
		require("./web/FetchCompileWasmTemplatePlugin"),
	JsonpTemplatePlugin: () => require("./web/JsonpTemplatePlugin")
});
exportPlugins((exports.webworker = {}), {
	WebWorkerTemplatePlugin: () => require("./webworker/WebWorkerTemplatePlugin")
});
exportPlugins((exports.node = {}), {
	NodeTemplatePlugin: () => require("./node/NodeTemplatePlugin"),
	ReadFileCompileWasmTemplatePlugin: () =>
		require("./node/ReadFileCompileWasmTemplatePlugin")
});
exportPlugins((exports.debug = {}), {
	ProfilingPlugin: () => require("./debug/ProfilingPlugin")
});
exportPlugins((exports.util = {}), {
	createHash: () => require("./util/createHash")
});
// 对上个版本做兼容
// 或？
// 给下个版本做铺垫
const defineMissingPluginError = (namespace, pluginName, errorMessage) => {
	Object.defineProperty(namespace, pluginName, {
		configurable: false,
		enumerable: true,
		get() {
			throw new RemovedPluginError(errorMessage);
		}
	});
};
// TODO remove in webpack 5
defineMissingPluginError(
	exports.optimize,
	"UglifyJsPlugin",
	"webpack.optimize.UglifyJsPlugin has been removed, please use config.optimization.minimize instead."
);

// TODO remove in webpack 5
defineMissingPluginError(
	exports.optimize,
	"CommonsChunkPlugin",
	"webpack.optimize.CommonsChunkPlugin has been removed, please use config.optimization.splitChunks instead."
);


```

综合上面的分析 这个入口文件其实只是对导出的exports对象做了更改，用户在用下面的语句引入webpack模块后

```js
const webpack = require('webpack');
```

可以直接当作函数调用，也可以当作一个对象，使用它下面挂载的方法和对象。当用作函数时，用户一般传入一个config对象，webpack将解析对象并直接挂载自定义组件。

在上面的讨论中，我们忽略了两个问题：

* 如果用户传入了callback函数，webpack将怎样处理
* 如果用户传入的是一个options对象数组，webpack将怎样处理

明天见！