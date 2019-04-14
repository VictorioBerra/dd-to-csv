#!/usr/bin/env node

const Promise = require('bluebird');
const bhttp = require('bhttp');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const winston = require('winston');
const {
    convertArrayToCSV
} = require('convert-array-to-csv');
var program = require('commander');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'main' },
    transports: [
        new winston.transports.Console()
    ]
});

program
    .version('0.1.0')
    .option('-o, --output <path>', 'csv output path');

const rowPromises = [
    GetRowsFromPage('https://dividenddetective.com/big_dividend_list.htm', '#xr_mvp_5 > div > div:nth-child(36) > .xr_tl'),
    GetRowsFromPage('https://dividenddetective.com/big_dividend_list2.htm', '#xr_mvp_15 > div > div:nth-child(41) > .xr_tl'),
    GetRowsFromPage('https://dividenddetective.com/big_dividend_list3.htm', '#xr_mvp_1 > div > div:nth-child(38) > .xr_tl'),
    GetRowsFromPage('https://dividenddetective.com/big_dividend_list4.htm', '#xr_mvp_3 > div > div:nth-child(35) > .xr_tl')
];

const header = ['Ticker', 'Company Name', 'Annual Div', 'Div Yield'];

Promise.reduce(rowPromises,
    function (accumulator, rows) {
        accumulator.push(rows);
        return accumulator;
    },
    []
).then(function (rows) {
    const csvFromArrayOfArrays = convertArrayToCSV(rows.flat(), {
        header,
        separator: ','
    });

    let file_name = './dividenddetective-output-' + getFormattedTime() + '.csv';
    let outputDirectory = program.output || './';
    let pathToFile = path.join(outputDirectory, file_name);

    fs.writeFile(pathToFile, csvFromArrayOfArrays, function (err) {
        if (err) {
            logger.error('Failed to write file.');
            logger.error(err);
        }
        logger.info(`CSV successfully saved ${rows.flat().length} total rows to ${pathToFile}`);

    });
});

function GetRowsFromPage(url, selector) {
    return Promise.try(function () {
        return bhttp.get(url);
    }).then(function (response) {
        return cheerio.load(response.body.toString());
    }).then(function ($) {
        let allFields = $(selector);
        let rows = [];
        for (var i = 0; i < allFields.length; i += 4) {
            let row = [];
            for (var j = 0; j < 4; j++) {
                let currentField = allFields.eq([i + j]).text();
                row.push(currentField);
            }
            rows.push(row);
        }
        logger.info(`Fetched ${rows.length} rows from ${url}`);
        return rows;
    });
}

function getFormattedTime() {
    const today = new Date();
    const y = today.getFullYear();
    // JavaScript months are 0-based.
    const m = today.getMonth() + 1;
    const d = today.getDate();
    const h = today.getHours();
    const mi = today.getMinutes();
    const s = today.getSeconds();
    return y + '-' + m + '-' + d + '-' + h + '-' + mi + '-' + s;
}