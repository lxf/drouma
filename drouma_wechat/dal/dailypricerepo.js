/**
 * @Author: snail
 * @Date: 2017-06-14 18:48:18
 * @Last Modified by: snail
 * @Last Modified time: 2017-06-14 18:48:18
 * @Function:
 */
var db_drouma = require('../db/db_drouma'),
    priceModel = require('../model/dr_dailypricemodel');

exports.insertPost = function (data, callback) {
    var insertSql = "insert into dr_dailyprice set ";
    var sql = "";

    if (data != undefined) {
        for (var key in data) {
            if (data[key] != '') {
                if (sql.length == 0) {
                    if (!isNaN(data[key])) {
                        sql += " " + key + " = " + data[key] + " ";
                    } else {
                        sql += " " + key + " = '" + data[key] + "' ";
                    }
                } else {
                    if (!isNaN(data[key])) {
                        sql += ", " + key + " = " + data[key] + " ";
                    } else {
                        sql += ", " + key + " = '" + data[key] + "' ";
                    }
                }
            }
        }
    }

    insertSql += sql + ' ;';

    db_drouma.mysqlPool.getConnection(function (err, connection) {
        if (err) {
            callback(false, '数据库连接失败！');
            return;
        }

        connection.query("set names utf8;"); //重新设置一下编码类型 

        connection.query(insertSql, function (err, result) {
            connection.release();

            if (err) {
                throw err;
            }

            return callback(true, result);
        });
    });
};

//获取今天的报价信息
exports.getTodayAllPrice = function (data, callback) {
    //and dr_updatetime=CURDATE()
    var sql = "select dr_name,dr_price,dr_updatetime from dr_dailyprice where dr_isenable=1";

    for (var key in data) {
        sql += " and " + key + " like '%" + data[key] + "%' ";
    }

    sql += " limit 0,20";

    //链接数据库的操作

    db_drouma.mysqlPool.getConnection(function (err, connection) {
        if (err) {
            callback(true);
            return;
        }

        connection.query(sql, function (err, results) {
            connection.release();
            if (err) {
                callback(true);
                return;
            }

            return callback(false, results);
        });
    });
};