/**
 * @Author: snail
 * @Date:   2017-06-24
 * @Last Modified by:
 * @Last Modified time:
 * @Function : 多肉品种报价
 */
var priceDAL = appRequire('dal/dailypricerepo');

var DR_Price = function () {}

//报价查询
DR_Price.prototype.getTodayAllPrice = function (data, callback) {
    for (var key in data) {
        if (data[key] === undefined) {
            return;
        }
    }

    priceDAL.getTodayAllPrice(data, function (err, result) {
        if (err) {
            return callback(true);
        }

        return callback(false, result);
    });
}

module.exports = new DR_Price();