const Promise = require("bluebird");
const bhttp = require("bhttp");
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const {
    convertArrayToCSV
} = require('convert-array-to-csv');
var program = require('commander');

program
  .version('0.1.0')
  .option('-o, --output <path>', 'csv output path');

var rowPromises = [
    GetRowsFromPage("https://dividenddetective.com/big_dividend_list.htm", "#xr_mvp_5 > div > div:nth-child(36) > .xr_tl"),
    GetRowsFromPage("https://dividenddetective.com/big_dividend_list2.htm", "#xr_mvp_15 > div > div:nth-child(41) > .xr_tl"),
    GetRowsFromPage("https://dividenddetective.com/big_dividend_list3.htm", "#xr_mvp_1 > div > div:nth-child(38) > .xr_tl"),
    GetRowsFromPage("https://dividenddetective.com/big_dividend_list4.htm", "#xr_mvp_3 > div > div:nth-child(35) > .xr_tl")
];

const header = ['Ticker', 'Company Name', 'Annual Div', 'Div Yield'];

Promise.reduce(rowPromises,
    function (accumulator, rows, index, length) {
        accumulator.push(rows);
        return accumulator;
    },
    []
).then(function (rows) {
    const csvFromArrayOfArrays = convertArrayToCSV(rows.flat(), {
        header,
        separator: ','
    });

    var file_name = './dividenddetective-output-' + getFormattedTime() +'.csv'

    var outputDirectory = program.output || "./";

    fs.writeFile(path.join(outputDirectory, file_name), csvFromArrayOfArrays, function(err) {
        if(err) {
            return console.log(err);
        }
        console.log("CSV successfully saved.");
    }); 
});

function GetRowsFromPage(url, selector) {
    return Promise.try(function () {
        return bhttp.get(url);
    }).then(function (response) {
        return cheerio.load(response.body.toString());
    }).then(function ($) {
        var allFields = $(selector);
        var rows = [];
        for (var i = 0; i < allFields.length; i += 4) {
            var row = [];
            for (var j = 0; j < 4; j++) {
                var currentField = allFields.eq([i + j]).text();
                row.push(currentField);
            }
            rows.push(row);
        }
        return rows;
    });
}

function getFormattedTime() {
    var today = new Date();
    var y = today.getFullYear();
    // JavaScript months are 0-based.
    var m = today.getMonth() + 1;
    var d = today.getDate();
    var h = today.getHours();
    var mi = today.getMinutes();
    var s = today.getSeconds();
    return y + "-" + m + "-" + d + "-" + h + "-" + mi + "-" + s;
}