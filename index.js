const got = require('got');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const grailUrl= 'https://www.canyon.com/en-us/gravel-bikes/all-road/grail/grail-7/2837.html';

got(grailUrl).then(response => {
  const $ = (new JSDOM(response.body)).window.document;
  const $sizes = Array.from($.querySelectorAll('.productConfiguration__sizeType'));
  const $xsElement = $sizes.find(size => {
      const text = size.innerHTML.replace(/\n| /g, "")
      return text === "XS";
  });
  const $xsBox = $xsElement.closest(".productConfiguration__optionListItem");
  const xsComingSoon = $xsBox.querySelector(".productConfiguration__availabilityMessage").innerHTML;
  const inStock = xsComingSoon?.indexOf("Coming soon") === -1;
  console.log("in stock:", inStock)

}).catch(err => {
  console.log(err);
});