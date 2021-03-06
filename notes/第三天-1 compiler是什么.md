还记得我们的问题吗？

- MultiCompiler如何处理多个compiler？
- compiler的run方法如何运作？
- 调用compiler.watch后，发生了什么？

先来概括compiler的文件内容：

```js
class Compiler extends Tapable {  // Tapable是一套基于钩子机制的流程方案 后面会详细说明    
    constructor(context) {
        super();
        this.hooks = {
            // 定义了24个钩子 类型各有不同 有下面四种
            // new SyncBailHook(["compilation"])
            // new AsyncSeriesHook(["stats"])
            // new SyncHook(["compilation", "params"])
            // new AsyncParallelHook(["compilation"])
            shouldEmit: new SyncBailHook(["compilation"]),
            done: new AsyncSeriesHook(["stats"]),
        }
        // 下面这些是什么？从内容上看，是在Compiler钩子上挂载了插件，作用是当传入options符合要求，就将options的async字段变为true
        this._pluginCompat.tap("Compiler", options => {
			switch (options.name) {
				case "additional-pass":
				case "before-run":
				case "run":
				case "emit":
				case "after-emit":
				case "before-compile":
				case "make":
				case "after-compile":
				case "watch-run":
					options.async = true;
					break;
			}
		});
        // 下面定义了一系列属性字段 其中有些涉及其他模块 我会在后面做补充
		this.name = undefined;
		this.parentCompilation = undefined;
		this.outputPath = "";
		this.outputFileSystem = null;
		this.inputFileSystem = null;
		this.recordsInputPath = null;
		this.recordsOutputPath = null;
		this.records = {};
		this.removedFiles = new Set();
		this.fileTimestamps = new Map();
		this.contextTimestamps = new Map();
        // 这个resolveFactory代替了之前版本的resolve.loader resolve.normal resolve.content
        // 此处省略了一些兼容性处理的代码
		this.resolverFactory = new ResolverFactory();
		this.options = /** @type {WebpackOptions} */ ({});
		this.context = context;
		this.requestShortener = new RequestShortener(context);
		this.running = false;
		this.watchMode = false;
		this._assetEmittingSourceCache = new WeakMap();
		this._assetEmittingWrittenFiles = new Map();
        // 下面是12个方法
        watch() {
            /****/
        }
        run() {
            /****/
        }
        runAsChild() {
            /****/
        }
        purgeInputFileSystem() {
            /****/
        }
        emitAssets() {
            /****/
        }
        emitRecords() {
            /****/
        }
        readRecords() {
            /****/
        }
        createChildCompiler() {
            /****/
        }
        isChild() {
            /****/
        }
        createCompilation() {
            /****/
        }
        newCompilation() {
            /****/
        }
        createNormalModuleFactory() {
            /****/
        }
        createContextModuleFactory() {
            /****/
        }
        compile() {
            /****/
        }
}
class SizeOnlySource extends Source {
	// 这是一个容错对象
}
```

至于我们之前提到的run方法，其实它并没有返回任何值，只是在生成的compiler对象内部做了一些改动，并在最后调用compiler的compile方法：

```js
	// function run()
	run(callback) {
        // 假如之前已经调用过这个方法 就报错
		if (this.running) return callback(new ConcurrentCompilationError());
		const finalCallback = (err, stats) => {
            // 终局
			this.running = false;
			if (err) {
				this.hooks.failed.call(err);
			}
            // 这里真正调用用户传入的callback函数
			if (callback !== undefined) return callback(err, stats);
		};
		// 标记run的开始时间
		const startTime = Date.now();
		this.running = true;
		// 这个函数字面上看是编译完成时调用
		const onCompiled = (err, compilation) => {
			if (err) return finalCallback(err);
			// 划重点 Tapable相关 什么时候返回false？
			if (this.hooks.shouldEmit.call(compilation) === false) {
				const stats = new Stats(compilation);
				stats.startTime = startTime;
				stats.endTime = Date.now();
				this.hooks.done.callAsync(stats, err => {
					if (err) return finalCallback(err);
					return finalCallback(null, stats);
				});
				return;
			}
			// 释放编译资源
			this.emitAssets(compilation, err => {
				if (err) return finalCallback(err);

				if (compilation.hooks.needAdditionalPass.call()) {
					compilation.needAdditionalPass = true;

					const stats = new Stats(compilation);
					stats.startTime = startTime;
					stats.endTime = Date.now();
					this.hooks.done.callAsync(stats, err => {
						if (err) return finalCallback(err);

						this.hooks.additionalPass.callAsync(err => {
							if (err) return finalCallback(err);
							this.compile(onCompiled);
						});
					});
					return;
				}
				// 释放编译记录
				this.emitRecords(err => {
					if (err) return finalCallback(err);

					const stats = new Stats(compilation);
					stats.startTime = startTime;
					stats.endTime = Date.now();
					this.hooks.done.callAsync(stats, err => {
						if (err) return finalCallback(err);
						return finalCallback(null, stats);
					});
				});
			});
		};
		// 依次触发 beforeRun 和 run 生命周期
		this.hooks.beforeRun.callAsync(this, err => {
			if (err) return finalCallback(err);
			this.hooks.run.callAsync(this, err => {
				if (err) return finalCallback(err);
				this.readRecords(err => {
					if (err) return finalCallback(err);
					// 开启编译之门
					this.compile(onCompiled);
				});
			});
		});
	}

```

最终，流程总会指向this.compile()函数。