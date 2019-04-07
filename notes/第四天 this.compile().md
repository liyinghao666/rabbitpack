```js
	compile(callback) {
		//构建params对象，包含下面三个字段
         //normalModuleFactory: this.createNormalModuleFactory(),
		//contextModuleFactory: this.createContextModuleFactory(),
		//compilationDependencies: new Set()
        // 这个params后面或许会成为分析流程的关键
        const params = this.newCompilationParams();
        //依次触发beforeCompile compile
		this.hooks.beforeCompile.callAsync(params, err => {
			if (err) return callback(err);

			this.hooks.compile.call(params);
			// 触发compile之后 构建compilation对象
            // 在newCompilation函数中 进行了构造对象以及一些其他的事情：
			// newCompilation(params) {
            	//创建对象
			// 	const compilation = this.createCompilation();
            	//复制部分字段
			// 	compilation.fileTimestamps = this.fileTimestamps;
			// 	compilation.contextTimestamps = this.contextTimestamps;
			// 	compilation.name = this.name;
			// 	compilation.records = this.records;
			// 	compilation.compilationDependencies = params.compilationDependencies;
            	//触发钩子
			// 	this.hooks.thisCompilation.call(compilation, params);
			// 	this.hooks.compilation.call(compilation, params);
			// 	return compilation;
			// }

			const compilation = this.newCompilation(params);
			// 构建之后 触发make钩子
			this.hooks.make.callAsync(compilation, err => {
				if (err) return callback(err);
				// make之后 驱使compilation做事情 装箱
				compilation.finish();
				compilation.seal(err => {
					if (err) return callback(err);
					// 装箱之后 触发afterCompile钩子
					this.hooks.afterCompile.callAsync(compilation, err => {
						if (err) return callback(err);
						// 执行回调函数
						return callback(null, compilation);
					});
				});
			});
		});
	}

```

compilation真正起作用就是在make钩子触发之后 执行了finish函数和seal函数 整个webpack流程就完成了。后面我们会看一看compilation的内容