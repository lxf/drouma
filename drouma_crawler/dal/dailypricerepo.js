/**
 * @Author: snail
 * @Date: 2017-06-14 18:48:18
 * @Last Modified by: snail
 * @Last Modified time: 2017-06-14 18:48:18
 * @Function:
 */
var db_drouma = require('../db/db_drouma'),
    order = require('../model/dr_dailypricemodel');

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