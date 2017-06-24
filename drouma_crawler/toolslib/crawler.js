/// 依赖模块
var fs = require('fs');
var request = require("request");
var cheerio = require("cheerio");
var mkdirp = require('mkdirp');
var iconv = require('iconv-lite');
var async = require('async');
var path = require('path');
var URL = require('url');
var moment = require('moment');

//工具库
var color = require('./color.js');

//业务处理
var drRepo = require('../dal/dailypricerepo');

var config; /// 所选配置文件
var rooturl;
var rootsite;
var hostname;
var log;

//存储抓取的数据
var data = [];

start('duorou_com');

function start(filename) {
    var configname = '';

    if (filename == undefined) {
        configname = 'duorou_com';
    } else {
        configname = filename;
    }

    fs.readFile('../config/' + configname, function (err, data) {
        if (err) {
            console.log(err)
            log('读取配置文件失败', 'red');
            return;
        }

        config = JSON.parse(data);
        rooturl = config.isPagination ? function (i) {
            return config.url.replace('%%', i);
        } : config.url;

        rootsite = config.url.match(/[^\.]+[^/]+/)[0];
        hostname = URL.parse(rootsite).hostname;

        new Crawler().crawl();
    });
}

var Crawler = function () {
    this.from = config.from || 1;
    this.to = config.to || 1;
};

/// 开始处理的入口
Crawler.prototype.crawl = function () {
    var that = this;
    var urlLevels = []; /// 收集每个层级的url
    that.log('程序正在执行中...');

    // 通过config.selector的长度来确定抓取的层级
    async.eachSeries(config.selector, function (item, callback) {
            var index = config.selector.indexOf(item);
            /// 最后一层级
            if (index === config.selector.length - 1) {
                if (config.type) {
                    if (that[config.type]) {
                        that[config.type](urlLevels[index - 1]);
                    } else {
                        that.log('参数type值无效，参数为text|image', 'redBG');
                    }
                } else {
                    that.log('您没有配置参数type，参数为text|image', 'redBG');
                }
            }
            /// 第一层级
            else if (index === 0) {
                urlLevels[0] = [];
                if (config.isPagination) {
                    var i = config.from;
                    async.whilst(function () {
                        return i <= config.to;
                    }, function (_callback) {
                        that.log('地址:' + rooturl(i), 'red');
                        that.request(rooturl(i), function (status, $) {
                            if (status) {
                                that.log(item.$, 'red');
                                var $$ = eval(item.$);
                                $$.each(function () {
                                    var nextUrl = $(this).attr(item.attr);
                                    if (config.notNeedHostPrefix) {
                                        nextUrl = nextUrl;
                                    } else {
                                        nextUrl = rootsite + "/" + nextUrl.replace(/^\/+/, '/');
                                    }
                                    //判断是否需要加上host前缀
                                    urlLevels[0].push(nextUrl);
                                });
                                that.log('第' + i + '页分析完成', 'red');
                            } else {
                                that.log(rooturl(i) + '请求失败', 'red');
                            }
                            setTimeout(function () {
                                ++i;
                                _callback(null);
                            }, parseInt(Math.random() * 2000));
                        });
                    }, function (err) {
                        if (err) {
                            that.log(err, 'red');
                        } else {
                            var show_txt = '';
                            if (config.type === 'image') {
                                show_txt = '套图片';
                            } else if (config.type === 'text') {
                                show_txt = '篇文章';
                            }
                            that.log('分页处理完成，共收集到了' + urlLevels[0].length + show_txt, 'green');
                        }
                        callback(null);
                    });
                } else {
                    that.request(rooturl, function (status, $) {
                        if (status) {
                            eval(item.$).each(function () {
                                urlLevels[0].push($(this).attr(item.attr));
                            });
                        } else {
                            that.log(rooturl + '请求失败', 'red');
                        }
                        callback(null);
                    });
                }
            }
            /// 中间层级
            else {
                urlLevels[index] = [];
                async.eachSeries(urlLevels[index - 1], function (_item, _callback) {
                    that.request(_item, function (status, $) {
                        if (status) {
                            //中间层级也需要分页的情况
                            if (item.isPagination) {
                                var firPage = 1;
                                if (eval(item.nextPage).length == 0) {
                                    eval(item.$).each(function () {
                                        urlLevels[index].push($(this).attr(item.attr));
                                    });
                                } else {
                                    eval(item.nextPage).each(function () {
                                        if (firPage++ == 1) {
                                            urlLevels[index].push($(this).attr(item.attr));
                                        }

                                        var nextPage = _item + $(this).attr(item.attr);
                                        if ($(this).text() != item.nextPageTitle && $(this).text() != item.endPageTitle) {
                                            that.log('分页的url:' + nextPage, 'red');
                                            urlLevels[index].push(nextPage);
                                        }
                                    });
                                }
                            } else {
                                eval(item.$).each(function () {
                                    urlLevels[index].push($(this).attr(item.attr));
                                });
                            }
                            that.log('urlLevels[' + index + ']的长度:' + urlLevels[index].length, 'red');
                        } else {
                            that.log(item + '请求失败', 'red');
                        }
                        _callback(null);
                    });
                }, function () {
                    callback(null);
                });
            }
        },
        function (err) {
            if (err) {
                that.log(err, 'red');
            } else {
                that.log('层级地址完成', 'green');
            }
        }
    );
};

/// 处理text
/// urls:{Array}
Crawler.prototype.text = function (urls) {
    var that = this;
    var i = 0;
    var count = urls.length;
    var content = '';
    that.log('总条数:' + count, 'green');
    mkdirp(config.saveDir + '/' + hostname, function (err) {
        if (err) {
            that.log('创建目录失败', 'red');
            process.exit(0);
        } else {
            async.whilst(function () {
                return i < urls.length;
            }, function (callback) {
                var uri = urls[i];
                that.log('当前请求:' + uri, 'cyanBG');
                that.request(uri, function (status, $) {
                    if (status) {
                        var title = that.title($("title").text()).trim() + i + "页";
                        var filepath = path.join(config.saveDir, hostname, title + '.txt');
                        var last = config.selector[config.selector.length - 1];

                        if (config.contentModel == 'text') {
                            content = eval(last.$).text();

                            //存储到文件
                            fs.writeFile(filepath, content, {
                                flag: 'wx'
                            }, function (_err) {
                                if (_err) {
                                    if (_err.code === 'EEXIST') {
                                        that.log('文件' + filepath + '已存在', 'yellow');
                                    } else {
                                        that.log('保存文件' + filepath + '失败', 'red');
                                    }
                                } else {
                                    that.log(i + '/' + count + ' 文件' + filepath + '保存成功', 'green');
                                }

                                setTimeout(callback, parseInt(Math.random() * 500));
                            });

                        } else {
                            eval(last.$).each(function (i, element) {
                                try {
                                    //品种名称
                                    var dr_name = $(element).find('a').text().replace("(多肉植物)", "");
                                    //价格
                                    var dr_price = parseInt($(element).find('span').text().replace("￥", ""));

                                    console.log('品种:' + dr_name + ",今日价格:" + dr_price);

                                    var drObj = {
                                        'name': dr_name,
                                        'price': dr_price
                                    }

                                    data.push(drObj);

                                } catch (e) {}
                            });

                            setTimeout(callback, parseInt(Math.random() * 1000));
                        }

                    } else {
                        setTimeout(callback, parseInt(Math.random() * 500));
                    }
                });
                ++i;
            }, function (err) {
                if (err) {
                    that.log(err, "red");
                } else {
                    //持久化到DB
                    async.each(data, function (item, callback) {
                        var dr_dailymodel = {
                            dr_category: 1,
                            dr_name: item.name,
                            dr_price: item.price,
                            dr_size: 1,
                            dr_updatetime: moment().format("YYYY-MM-DD"),
                            dr_isenable: 1
                        }

                        drRepo.insertPost(dr_dailymodel, function (success, message) {
                            if (success) {
                                that.log('插入db成功', 'yellow');
                            } else {
                                that.log('持久化到DB异常', 'red');
                            }
                            callback(null, item.name);
                        });
                    }, function (err) {
                        that.log('执行完毕~', "green");
                    });
                }
            });
        }
    });
};

/// 获取页面
/// url:{String} 页面地址
/// callback:{Function} 获取页面完成后的回调callback(boolen,$)
Crawler.prototype.request = function (url, callback) {
    var that = this;
    var opts = {
        url: url,
        encoding: null /// 设置为null时，得到的body为buffer类型
    };

    config.headers && (opts.headers = config.headers);

    request(opts, function (err, res, body) {
        var $ = null;
        if (!err && res.statusCode == 200) {
            that.log('状态' + res.statusCode + '， ' + url + '请求成功', 'green');

            $ = cheerio.load(iconv.decode(body, config.charset || 'utf8'));
        } else {
            !err && that.log('状态' + res.statusCode + '， ' + url + '请求失败', 'red');
        }
        callback(!!$, $);
    });
};

/// 处理标题(title)
Crawler.prototype.title = function (str) {
    var title = str.replace(/[\\/:\*\?"<>\|\n\r]/g, '').trim();
    if (/-/.test(title)) {
        title = title.match(/(.+)\-[^\-]+$/)[1].trim();
    }

    return title;
};

/// 输出信息
Crawler.prototype.log = log = function (info, c) {
    var that = this;
    if (config.mode === 'web') {
        process.send(JSON.stringify({
            color: c || '',
            info: info
        })); /// 发送数据给主进程
    } else if (config.mode === 'console') {
        console.log(color(c), info);
    }
};

String.prototype.format = function () {
    var formatted = this;
    var length = arguments.length;
    for (var i = 0; i < length; i++) {
        var regexp = new RegExp('\\{' + i + '\\}', 'gi');
        var value = arguments[i];
        if (value === null || value === undefined)
            value = '';
        formatted = formatted.replace(regexp, value);
    }
    return formatted;
};