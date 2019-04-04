当用户传入webpack的参数是两个，那么这段代码就会生效

```js
	if (callback) {
        // callback是一个函数
		if (typeof callback !== "function") {
			throw new Error("Invalid argument: callback");
		}
        // 触发条件是 用户传入的第一个参数options中有相关的说明
		if (
			options.watch === true ||
			(Array.isArray(options) && options.some(o => o.watch))
		) {
			const watchOptions = Array.isArray(options)
				? options.map(o => o.watchOptions || {})
				: options.watchOptions || {};
            // 定制watch型compiler
			return compiler.watch(watchOptions, callback);
		}
        // 假如用户没有显式声明watch 则使用普通的compiler
		compiler.run(callback);
	}
	return compiler;
```

当用户传入的options是一个数组，下面这段代码就会生效

```js
	if (Array.isArray(options)) {
		compiler = new MultiCompiler(options.map(options => webpack(options)));
	}
```

webpack调用MultiCompiler来处理多个compiler实例



**从上面的代码中，我们看到了webpack对compiler的三种处理：**

* **第一种 在正常情况下 用户仅指定第一个参数options，那么webpack会拿这个参数构造一个或多个compiler对象 返回给用户 如果options是含有多个配置对象的对象数组  则会用MultiCompiler来处理**

* **第二种 用户传入了一个回调函数 但没有指明watch模式 那么webpack在返回compiler之前会调用compiler的run方法 把用户定义的callback传进去。我们可以猜想，run应该相当于一个dispatch方法**
* **第三种 用户同时指定了watch相关选项 那么webpack将返回给用户一个compiler.watch(watchOptions, callback)**

所以，在我们进入下一步的compiler源码分析之前，就产生了下面几个问题：

* MultiCompiler如何处理多个compiler？
* compiler的run方法如何运作？
* 调用compiler.watch后，发生了什么？

以及 最最最重要的 ：compiler是什么？webpack在compiler中搞了些什么事情？

后面我们将会以上面的三个问题为切入点

明天见！