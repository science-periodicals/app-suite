import isClient from 'is-client';

const { hostname, protocol } = isClient()
  ? window.location
  : { hostname: 'localhost', protocol: 'https:' };

const isDevMode =
  process.env.NODE_ENV !== 'production' ||
  !!process.env.SA_DEMO ||
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname === '[::1]' ||
  (hostname || '').split('.').some(part => part === 'nightly') ||
  protocol !== 'https:';

const config = Object.assign(
  {
    stripeKey: isDevMode
      ? 'pk_test_yaQ6pQqZVHznV0B2CFGfmSXJ'
      : 'pk_live_qu2aZ2tBPqWwhql81jcEZfsz'
  },
  isClient()
    ? window.__CONFIG__
    : {
        isJournalSubdomain: true
      }
);

export default config;
