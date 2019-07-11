import querystring from 'querystring';

/**
 * This is used to match the CSS counter with JS as there doesn't seem to be
 * an API to get the value of a CSS counter in JS
 */
export default class Counter {
  constructor({
    origin = 'https://purl.org',
    pathname = '/sa',
    counts = [0, 0, 0],
    hashLevel = 1,
    prefix = '',
    search = '', // '?querystring parameters'
    qs = {}, // an object to pass to querystring.stringify
    cache = {}
  } = {}) {
    this.origin = origin;
    this.pathname = pathname;
    this.defaultCounts = counts.slice(); // keep the original around for when we reset
    this.counts = counts;
    this.hashLevel = hashLevel;
    this.prefix = prefix;
    this.search = search
      ? search
      : Object.keys(qs).length
      ? `?${querystring.stringify(qs)}`
      : '';
    this.cache = cache;
  }

  clone() {
    return new Counter({
      origin: this.origin,
      pathname: this.pathname,
      counts: this.counts.slice(),
      search: this.search,
      prefix: this.prefix,
      hashLevel: this.hashLevel,
      cache: this.cache
    });
  }

  freeze(key) {
    if (key in this.cache) {
      return this.cache[key];
    }

    const clone = this.clone();
    this.cache[key] = clone;
    return this.cache[key];
  }

  increment({
    level, // starts at 1
    key, // used to prevent counter to be re-incremented on re-render
    value, // used to set to a specific value instead of adding `+ 1`
    debug = false
  } = {}) {
    if (key != null && key in this.cache) {
      if (debug) {
        console.log(key, this.cache[key], '(from cache)');
      }
      return this.cache[key];
    }

    if (level == null) {
      level = this.counts.length;
    }

    if (value != null) {
      this.counts[level - 1] = value;
    } else {
      this.counts[level - 1]++;
    }

    // If any level _before_ `level` is a negative value we set it to 0
    if (level > 1) {
      for (let i = 0; i < level; i++) {
        if (this.counts[i] < 0) {
          this.counts[i] = 0;
        }
      }
    }

    // reset to their initial value all levels greater than `level`
    for (let i = level; i < this.counts.length; i++) {
      this.counts[i] = this.defaultCounts[i];
    }

    if (key != null) {
      this.cache[key] = this.clone().set(this.counts.slice());
      if (debug) {
        console.log(key, this.cache[key], '(cached)');
      }
      return this.cache[key];
    }

    if (debug) {
      console.log(key, this, '(uncached)');
    }

    return this;
  }

  set(counts) {
    this.counts = counts;
    return this;
  }

  getHash(key) {
    const counts =
      key != null && key in this.cache ? this.cache[key].counts : this.counts;

    const prefix = counts.slice(0, this.hashLevel - 1).join('.');
    const suffix = counts.slice(this.hashLevel - 1).join('.');

    return `#${this.prefix}${prefix ? `${prefix}:${suffix}` : suffix}`;
  }

  getUrl(key) {
    const hash = this.getHash(key);

    // returns the same values (href, origin, pathname etc,) as native new URL() object
    return {
      href: `${this.origin}${this.pathname}${this.search}${hash}`,
      origin: this.origin,
      pathname: this.pathname,
      search: this.search,
      hash
    };
  }
}
