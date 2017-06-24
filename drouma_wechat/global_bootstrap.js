/**
*   加载一个全局路径引用组件，避免dot hell
*   @module global
*   @param {string} path -组件的相对路径
*/
global.appRequire = function(path) {
    return require(require('path').resolve(__dirname, path));
};