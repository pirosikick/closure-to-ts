goog.addDependency('../../app/a.js', ['app.a'], ['app.b'], {});
goog.addDependency('../../app/b.js', ['app.b'], [], {});
goog.addDependency('../../app/b/c.js', ['app.b.c'], [], {});
goog.addDependency('../../hoge/d.js', ['hoge.d'], [], {});