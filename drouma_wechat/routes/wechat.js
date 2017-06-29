var express = require('express');
var router = express.Router();
var moment = require('moment');

var wechat = require('wechat');
//多肉报价
var dr_priceservice = appRequire('service/drprice');

var config = {
    token: '',
    appid: '',
    appsecret: '',
    encodingAESKey: ''
};

router.use(express.query());

router.use('/', wechat(config, function (req, res, next) {
    console.log(req.weixin);
    var message = req.weixin;
    var replyMessage = "发送 '报价' 获取今日最新多肉品种的报价信息\n发送 '报价 要查询的多肉名称' 获取该品种的今日报价信息\n举个例子:\n 报价 静夜 ";
    //文本  
    if (message.MsgType === 'text') {
        if (message.Content != "" && message.Content.indexOf('报价') > -1) {
            var queryData = {};

            var msgArray = message.Content.split(' ');

            if (msgArray.length > 1) {
                var queryName = msgArray[1];
                queryData.dr_name = queryName;
            }

            dr_priceservice.getTodayAllPrice(queryData, function (err, result) {
                if (err) {
                    res.reply('当前正忙，请稍候再试!');
                }

                if (result != undefined) {
                    var message = [];
                    if (result.length == 0) {
                        message.push("未查询到该品种的相关报价信息,多肉妈会及时补充\n");
                    } else {
                        if (queryData.dr_name == undefined) {
                            message.push("前20个品种报价信息:\n");
                        }
                        result.forEach(function (element) {
                            message.push("品种:" + element.dr_name + ",价格:" + element.dr_price + " 元,规格:" + element.dr_size + ",报价日期:" + moment(element.dr_updatetime).format("YYYY-MM-DD") + "\n");
                        }, this);

                        message.push("\n以上查询结果仅提供参考");
                        message.push("\n了解多肉知识戳->http://www.drouma.com");
                    }

                    res.reply(message.join("\n"));
                    // res.reply('当前查询到' + result.length + "条报价信息");
                }
            });
        } else {
            res.reply(replyMessage);
        }
    } else {
        res.reply('多肉妈,正在学习怎么识字...你可以发送"报价"获取更有意思的内容!');
    }
}));

module.exports = router;