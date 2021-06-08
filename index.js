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

const grailUrl =
  'https://www.canyon.com/en-us/gravel-bikes/all-road/grail/grail-7/2837.html';

const getCanyon = async () => {
  await got(grailUrl)
    .then(async (response) => {
      const $ = new JSDOM(response.body).window.document;

      // Find the XS in stock box
      const $sizes = Array.from(
        $.querySelectorAll('.productConfiguration__sizeType')
      );
      const $xsElement = $sizes.find((size) => {
        const text = size.innerHTML.replace(/\n| /g, '');
        return text === 'XS';
      });
      const $xsBox = $xsElement.closest(
        '.productConfiguration__optionListItem'
      );
      const xsComingSoon = $xsBox.querySelector(
        '.productConfiguration__availabilityMessage'
      ).innerHTML;
      const inStock = xsComingSoon?.indexOf('Coming soon') === -1;

      // log to file
      const log = '\n' + new Date().toString() + ` - in stock: ${inStock}`;
      fs.appendFile(
        '/Users/caitlin.wolters/Repositories/get-canyon/log.txt',
        log,
        function (err) {
          if (err) throw err;
        }
      );

      // if it's in stock, notify me
      if (inStock) {
        notifier.notify({
          title: 'Canyon Grail 7',
          message: `in stock: ${inStock}`,
          sound: 'Hero',
          wait: true,
          timeout: 10,
          open: grailUrl
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
            subject: 'Canyon in stock!', // Subject line
            text: 'Canyon Grail 7 is in stock!', // plain text body
            html: '<b>Canyon Grail 7 is in stock!</b>' // html body
          })
          .catch((error) => {
            console.log('error sending mail', error);
          });
      }

      console.log(log);
    })
    .catch((err) => {
      console.log(err);
    });
};

setInterval(getCanyon, 300000);
