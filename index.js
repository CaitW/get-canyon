// file system reading / writing
const fs = require('fs');
// request library
const got = require('got');
// HTML parsing / traversing library
const jsdom = require('jsdom');
// Library to create Mac notifications
const NotificationCenter = require('node-notifier').NotificationCenter;
// External credentials file
const credentials = require('./credentials');
// Library that sends emails
const nodemailer = require('nodemailer');
// Library that makes terminal output pretty
const chalk = require('chalk');

// Initialize NotificationCenter object, which creates Mac notifications
const notifier = new NotificationCenter({
  withFallback: false,
  customPath: undefined
});
const { JSDOM } = jsdom;

// URLs for bikes
const grailURL =
  'https://www.canyon.com/en-us/gravel-bikes/all-road/grail/grail-7/2837.html';
const grail1byURL =
  'https://www.canyon.com/en-us/gravel-bikes/all-road/grail/al/grail-7-1by/2838.html';

// How often I want it to check for my bike in minutes
const frequencyInMinutes = 5;

/**
 * checks whether an XS bike is in stock on a given HTML page
 * @param {*} $ - the DOM of the page
 * @returns boolean indicating whether XS bike is in stock
 */
const getInStock = ($) => {
  // Find the XS in stock box
  const $sizes = Array.from(
    $.querySelectorAll('.productConfiguration__sizeType')
  );
  const $xsElement = $sizes.find((size) => {
    const text = size.innerHTML.replace(/\n| /g, '');
    return text === 'XS';
  });
  const $xsBox = $xsElement.closest('.productConfiguration__optionListItem');
  const xsComingSoon = $xsBox.querySelector(
    '.productConfiguration__availabilityMessage'
  ).innerHTML;
  return xsComingSoon?.indexOf('Coming soon') === -1;
};

// Log status to console + log status to logfile
const writeToLog = (model, inStock) => {
  const log = '\n' + new Date().toString() + ` - ${model} in stock: ${inStock}`;
  fs.appendFile(
    '/Users/caitlin.wolters/Repositories/get-canyon/log.txt',
    log,
    function (err) {
      if (err) throw err;
    }
  );

  // Write to terminal in pretty colors:
  const inStockLog = inStock ? chalk.green(inStock) : chalk.red(inStock);
  console.log(
    chalk.dim(new Date().toString()),
    chalk.blue(model),
    chalk.dim(' - '),
    inStockLog
  );
};

// Code to send me an email + pop up a notification on my mac if the bike is in stock
const notifyMe = async (model, url) => {
  notifier.notify({
    title: 'Canyon Grail',
    message: `in stock: ${model}`,
    sound: 'Hero',
    wait: true,
    timeout: 10,
    open: url
  });

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: credentials.outgoingEmail,
      pass: credentials.password
    }
  });

  // send mail with defined transport object
  await transporter
    .sendMail({
      from: `"Caitlin" <${credentials.outgoingEmail}>`, // sender address
      to: credentials.personalEmail, // list of receivers
      subject: `Canyon ${model} in stock!`, // Subject line
      text: `Canyon ${model} is in stock!`, // plain text body
      html: `<b>Canyon ${model} is in stock!</b>` // html body
    })
    .catch((error) => {
      console.log('error sending mail', error);
    });
};

/**
 * Main function. Includes code to:
 *  1. Fetch a given URL
 *  2. On URL response, parse it using JSDOM
 *  3. Send the parsed JSDOM object to my getInStock function
 *  4. Log output to a file
 *  5. If it's in stock, send me an email / notify me on my mac
 * @param {*} url
 * @param {*} modelName
 */
const getCanyon = (url, modelName) => {
  got(url)
    .then(async (response) => {
      const $ = new JSDOM(response.body).window.document;
      const inStock = getInStock($);

      // log to file
      writeToLog(modelName, inStock);

      // if it's in stock, notify me
      if (inStock) {
        notifyMe(modelName, url);
      }
    })
    .catch((err) => {
      console.log(err);
    });
};

setInterval(() => {
  getCanyon(grailURL, 'Grail 7');
  getCanyon(grail1byURL, 'Grail 7 1by');
}, frequencyInMinutes * 60 * 1000);
