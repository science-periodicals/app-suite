var DOMParser = require('xmldom').DOMParser,
  xml2js = require('xml2js'),
  util = require('util');

var xml =
  '<xml>' +
  '<article-title>Le monde.fr <strong>stronger faster better</strong> daft punk</article-title>' +
  '</xml>';

var doc = new DOMParser().parseFromString(xml, 'text/xml');
console.log(doc.getElementsByTagName('article-title')[0].nodeValue);

var desc = '';
Array.prototype.forEach.call(
  doc.getElementsByTagName('article-title')[0].childNodes,
  function($el) {
    if ($el.tagName !== 'strong' || $el.tagName !== 'sup') {
      if ($el.nodeType === 3) {
        desc += $el.nodeValue;
      } else if ($el.nodeType === 1) {
        Array.prototype.forEach.call($el.childNodes, function($subEl) {
          if ($el.nodeType === 3) {
            desc += $el.nodeValue;
          }
        });
      }
    }
  }
);

var parser = new xml2js.Parser();
parser.parseString(xml, function(err, body) {
  //  console.log(util.inspect(body, {depth:null}));
});
