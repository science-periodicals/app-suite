require('@babel/register');
const { getTestScenarios } = require('@scipe/stories');

const scenariosData = getTestScenarios();

module.exports = {
  id: 'backstop-app-suite',
  viewports: [
    // half 27" iMac
    {
      label: 'desktop',
      width: 1440,
      height: 2000
    }
    // // iPad air
    // {
    //   label: 'tablet',
    //   width: 1024,
    //   height: 1366
    // },
    // // iPhone 7
    // {
    //   label: 'mobile',
    //   width: 411,
    //   height: 823
    // }
  ],
  readyEvent: 'TEST_DATA_LOAD', // the `load` event is fired, this help a bit with SSR as it is a necessary (but not sufficient) condition to have the page loaded
  readySelector: '[data-test-ready="true"]',
  onBeforeScript: 'puppet/onBefore.js',
  onReadyScript: 'puppet/onReady.js',
  fullPageFixMaxScreenshotPartHeight: 5000, // see https://docs.browserless.io/blog/2018/02/22/large-images.html
  scenarios: scenariosData
    //.slice(0, 5)
    //.filter(s => s.id === 'review-ctx9-2.1')
    .map(data => {
      return customize({
        label: `${data.id}-${data.login || 'public'}`,
        delay: 10000,
        url: `http://127.0.0.1:3000${data.url}`,
        username: data.login,
        selectors: ['document'],
        hideSelectors: ['[data-test-now="true"]', '[data-test-progress="true"]']
      });
    }),
  paths: {
    bitmaps_reference: 'backstop_data/bitmaps_reference',
    bitmaps_test: 'backstop_data/bitmaps_test',
    engine_scripts: 'backstop_data/engine_scripts',
    html_report: 'backstop_data/html_report',
    ci_report: 'backstop_data/ci_report'
  },
  report: ['CI'], // ['browser'],
  engine: 'puppeteer',
  engineOptions: {
    args: [
      // make it work in CircleCI
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage' // see https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md#tips
    ]
  },
  asyncCaptureLimit: 6,
  asyncCompareLimit: 1,
  debug: true,
  debugWindow: false
};

function customize(scenario) {
  // TODO ?
  let extra;
  switch (scenario.label) {
    default:
      break;
  }

  return Object.assign({}, scenario, extra);
}
