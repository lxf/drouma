/**
 * @Author: snail
 * @Date:   2017-06-14 18:48:18
 * @Last Modified by:   snail
 * @Last Modified time: 2017-06-14 18:48:18
 */

var mysql = require('mysql');
 
var dbDroumaPool = mysql.createPool({
        // host: '127.0.0.1',
        // user: 'root',
        // password: '18621983356',
        host: '118.190.114.241',
        user: 'root',
        password: 'Lxf2543867',
        database: 'drouma_library',
        connectionLimit: 100,
        supportBigNumbers: true,
    });

exports.mysqlPool = dbDroumaPool;