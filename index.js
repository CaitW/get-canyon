const fs = require('fs');
const got = require('got');
const jsdom = require('jsdom');
const NotificationCenter = require('node-notifier').NotificationCenter;
const credentials = require('./credentials');
const nodemailer = require('nodemailer');

var notifier = new NotificationCenter({
  withFallback: false, // Use Growl Fallback if <= 10.8
  customPath: undefined // Relative/Absolute path to binary if you want to use your own fork of terminal-notifier
});
const { JSDOM } = jsdom;
const grailURL =
  'https://www.canyon.com/en-us/gravel-bikes/all-road/grail/grail-7/2837.html';
const grail1byURL =
  'https://www.canyon.com/en-us/gravel-bikes/all-road/grail/al/grail-7-1by/2838.html';
const frequencyInMinutes = 5;

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

const writeToLog = (model, inStock) => {
  const log = '\n' + new Date().toString() + ` - ${model} in stock: ${inStock}`;
  fs.appendFile(
    '/Users/caitlin.wolters/Repositories/get-canyon/log.txt',
    log,
    function (err) {
      if (err) throw err;
    }
  );
  return log;
};

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
      user: credentials.outgoingEmail, // generated ethereal user
      pass: credentials.password // generated ethereal password
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

const getCanyon = (url, modelName) => {
  got(url)
    .then(async (response) => {
      const $ = new JSDOM(response.body).window.document;
      const inStock = getInStock($);

      // log to file + save log line
      const log = writeToLog(modelName, inStock);

      // if it's in stock, notify me
      if (inStock) {
        notifyMe(modelName, url);
      }

      console.log(log);
    })
    .catch((err) => {
      console.log(err);
    });
};

setInterval(() => {
  getCanyon(grailURL, 'Grail 7');
  getCanyon(grail1byURL, 'Grail 7 1by');
}, frequencyInMinutes * 60 * 1000);
