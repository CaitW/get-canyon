const fs = require('fs');
const got = require('got');
const jsdom = require('jsdom');
const NotificationCenter = require('node-notifier').NotificationCenter;
var cron = require('node-cron');

var notifier = new NotificationCenter({
  withFallback: false, // Use Growl Fallback if <= 10.8
  customPath: undefined // Relative/Absolute path to binary if you want to use your own fork of terminal-notifier
});
const { JSDOM } = jsdom;

const grailUrl =
  'https://www.canyon.com/en-us/gravel-bikes/all-road/grail/grail-7/2837.html';

const getCanyon = () => {
  got(grailUrl)
    .then((response) => {
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
          timeout: 5000,
          open: grailUrl
        });
      }

      console.log('in stock:', inStock);
    })
    .catch((err) => {
      console.log(err);
    });
};

setInterval(getCanyon, 300000);
