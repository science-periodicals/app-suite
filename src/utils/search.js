import omit from 'lodash/omit';
import { getId, unprefix } from '@scipe/jsonld';
import { escapeLucene, getTextQuery } from '@scipe/librarian';
import { RANGE_FACETS } from '../constants';

export function parseQuery(facets, query = {}) {
  const parsed = {};

  if (query.search) {
    parsed.search = query.search;
  }

  facets.forEach(facet => {
    if (facet in query) {
      try {
        parsed[facet] = JSON.parse(query[facet]);
      } catch (e) {
        parsed[facet] = [];
      }
    } else {
      parsed[facet] = [];
    }
  });

  return parsed;
}

export function getFacetQueries(facets, query) {
  const filters = parseQuery(facets, query);

  return facets
    .filter(facet => filters[facet] && filters[facet].length)
    .map(facet => {
      return filters[facet]
        .map(
          // handle range queries
          value =>
            `${facet}:${
              value.startsWith('[') ? value : `"${escapeLucene(value)}"`
            }`
        )
        .join(' AND ');
    })
    .join(' AND ');
}

export function getIssueQuery(journal, query, facetMap = {}, facets = []) {
  const filters = parseQuery(facets, query);

  const searchQuery = getTextQuery(
    filters.search,
    ['name', 'alternateName', 'text', 'description', 'issueNumber'],
    { tokenize: false }
  );

  const issueQuery = `journalId:"${getId(journal)}"`;

  const facetQueries = getFacetQueries(facets, query);

  let q = `(${issueQuery})`;
  if (searchQuery) {
    q += ` AND (${searchQuery})`;
  }
  if (facetQueries) {
    q += ` AND (${facetQueries})`;
  }

  return q;
}

export function getSifterQuery(
  homepage,
  query,
  facetMap = {},
  facets = [],
  {
    issueId // if specified restrict search to that issue
  } = {}
) {
  const filters = parseQuery(facets, query);

  const searchQuery = getTextQuery(
    filters.search,
    [
      'name',
      'description',
      'text',
      'entityName',
      'entityAlternateName',
      'entityDescription',
      'entityAboutName',
      'entityAboutDescription',
      'creatorName',
      'entityAuthorName',
      'entityContributorName',
      'entityEditorName',
      'entityProducerName',
      'entitySponsorName',
      'entitySponsorDescription',
      'entityDetailedDescriptionText'
    ],
    { tokenize: false }
  );

  const releaseQuery = `(status:published AND journalId:"${getId(homepage)}"${
    issueId ? ` AND issueId:"${getId(issueId)}"` : ''
  }) NOT version:null`;

  const facetQueries = getFacetQueries(facets, query);

  let q = `(${releaseQuery})`;
  if (searchQuery) {
    q += ` AND ((${searchQuery}) OR @id:"graph:${escapeLucene(
      filters.search.trim()
    )}" OR slug:"${escapeLucene(filters.search.trim())}")`;
  }
  if (facetQueries) {
    q += ` AND (${facetQueries})`;
  }

  return q;
}

/**
 * get articles for the explorer
 */
export function getArticlesQuery(
  user,
  query,
  facetMap = {},
  facets = [],
  {
    issueId // if specified restrict search to that issue
  } = {}
) {
  const filters = parseQuery(facets, query);

  const searchQuery = getTextQuery(
    filters.search,
    [
      'name',
      'description',
      'text',
      'entityName',
      'entityAlternateName',
      'entityDescription',
      'entityAboutName',
      'entityAboutDescription',
      'creatorName',
      'entityAuthorName',
      'entityContributorName',
      'entityEditorName',
      'entityProducerName',
      'entitySponsorName',
      'entitySponsorDescription',
      'entityDetailedDescriptionText'
    ],
    { tokenize: false }
  );

  const articleQuery = `status:published NOT version:null`;

  const facetQueries = getFacetQueries(facets, query);

  let q = `(${articleQuery})`;
  if (searchQuery) {
    q += ` AND ((${searchQuery}) OR @id:"graph:${escapeLucene(
      filters.search.trim()
    )}" OR slug:"${escapeLucene(filters.search.trim())}")`;
  }
  if (facetQueries) {
    q += ` AND (${facetQueries})`;
  }

  return q;
}

/**
 * Used to search the journals in the explorer
 */
export function getJournalsQuery(user, query, facetMap = {}, facets = []) {
  let journalQuery = 'availability:public';
  if (getId(user)) {
    const userId = getId(user);
    journalQuery +=
      ` OR ( ` +
      `authorId:"${userId}"` +
      `OR editorId:"${userId}"` +
      `OR reviewerId:"${userId}"` +
      `OR producerId:"${userId}"` +
      ` )`;
  }

  const filters = parseQuery(facets, query);

  const searchQuery = getTextQuery(
    filters.search,
    [
      'name',
      'alternateName',
      'description',
      'text',
      'creatorName',
      'authorName',
      'contributorName',
      'editorName',
      'producerName',
      'issn',
      'keywords'
    ],
    { tokenize: false }
  );

  const facetQueries = getFacetQueries(facets, query);

  let q = `(${journalQuery})`;
  if (searchQuery) {
    q += ` AND ((${searchQuery}) OR @id:"journalId:${escapeLucene(
      filters.search.trim()
    )}" OR url:"${escapeLucene(filters.search.trim())}")`;
  }
  if (facetQueries) {
    q += ` AND (${facetQueries})`;
  }

  return q;
}

/**
 * Used to search the RFAs (Request for Articles) in the explorer
 */
export function getRfasQuery(
  user,
  query,
  facetMap = {},
  facets = [],
  journal // // if journal is specified we restict the search to that journal
) {
  let rfasQuery =
    '@type:"RequestArticleAction" AND actionStatus:"ActiveActionStatus"';

  if (getId(journal)) {
    rfasQuery += ` AND objectId:"${getId(journal)}"`;
  }

  const filters = parseQuery(facets, query);

  const searchQuery = getTextQuery(filters.search, ['name', 'description'], {
    tokenize: false
  });

  const facetQueries = getFacetQueries(facets, query);

  let q = `(${rfasQuery})`;
  if (searchQuery) {
    q += ` AND ((${searchQuery}) OR @id:"action:${escapeLucene(
      filters.search.trim()
    )}")`;
  }
  if (facetQueries) {
    q += ` AND (${facetQueries})`;
  }

  return q;
}

/**
 * Get the list of project for dashboard
 */
export function getGraphQuery(user, query, facetMap = {}, facets = []) {
  const filters = parseQuery(facets, query);
  const userId = getId(user);

  const graphQuery =
    'version:null' +
    ` AND ( ` +
    `authorId:"${userId}"` +
    `OR contributorId:"${userId}"` +
    `OR editorId:"${userId}"` +
    `OR reviewerId:"${userId}"` +
    `OR producerId:"${userId}"` +
    `OR entityAuthorId:"${userId}"` +
    `OR entityContributorId:"${userId}"` +
    ` )`;

  const searchQuery = getTextQuery(
    filters.search,
    [
      'name',
      'text',
      'description',
      'aboutName',
      'tagName',
      'aboutDescription',
      'creatorName',
      'authorName',
      'contributorName',
      'editorName',
      'producerName',
      'sponsorName',
      'sponsorDescription',
      'entityName',
      'entityAlternateName',
      'entityDecription',
      'entityDetailedDescriptionText'
    ],
    { tokenize: false }
  );

  const facetQueries = getFacetQueries(facets, query);

  let q = `(${graphQuery})`;
  if (searchQuery) {
    q += ` AND ((${searchQuery}) OR @id:"graph:${escapeLucene(
      filters.search.trim()
    )}" OR slug:"${escapeLucene(filters.search.trim())}")`;
  }
  if (facetQueries) {
    q += ` AND (${facetQueries})`;
  }
  q = `(${q}) NOT journalId:"tmp:null"`;

  return q;
}

/**
 * Adds some properties to the count object present in `facetMap`
 * and return an object with facets and keys and a list of counts as values
 * - `checked`  indicating if a propertyId of a facet is checked
 * - `duplicate` indicating if a name corresponds to several propertyId
 */
export function getFacetUiMap(facets, facetMap, query) {
  const pQuery = parseQuery(facets, query);

  return facets.reduce((data, facet) => {
    let countMap = facetMap[facet] || {};
    const checkedIds = new Set(pQuery[facet]);

    // AdditionalTypeId facet name is prefixed by the journalId
    if (facet === 'additionalTypeId') {
      const journalIds = new Set(
        Object.keys(countMap)
          .map(propertyId => {
            const count = countMap[propertyId];
            if (count && count.name) {
              const [journalId] = count.name.split('/');
              return journalId;
            }
          })
          .filter(Boolean)
      );

      // enhance the names
      countMap = Object.keys(countMap).reduce((nextCountMap, propertyId) => {
        if (countMap[propertyId] && countMap[propertyId].name) {
          const [journalId, typeName] = countMap[propertyId].name.split('/');

          nextCountMap[propertyId] = Object.assign({}, countMap[propertyId], {
            name:
              journalIds.size === 1
                ? typeName
                : `${unprefix(journalId)} / ${typeName}`
          });
        }
        return nextCountMap;
      }, {});
    }

    let facetUiValues = Object.keys(countMap).map(propertyId => {
      const count = countMap[propertyId];
      return Object.assign({}, count, {
        checked: checkedIds.has(getQueryStringValue(count))
      });
    });

    // flag duplicate
    const counts = facetUiValues.reduce((counts, value) => {
      if (value.name && value.name in counts) {
        counts[value.name]++;
      } else {
        counts[value.name] = 1;
      }
      return counts;
    }, {});

    facetUiValues.forEach(value => {
      value.duplicate = counts[value.name] > 1;
    });

    // sort by count
    if (!RANGE_FACETS.has(facet)) {
      facetUiValues = facetUiValues.sort((a, b) => b.value - a.value);
    }

    data[facet] = facetUiValues;
    return data;
  }, {});
}

/**
 * Get the next query string parameter
 */
export function getNextQuery(
  query,
  facet,
  value, // searchValue (if `facet` is `search` or propertyId otherwise)
  facetUiMapValues // not required if `facet` is `search`. List of counts objects enriched with a `checked` property (as obtained by getFacetUiMap)
) {
  let nextQuery;
  if (facet === 'search') {
    // value is a string (text search value)
    if (value) {
      nextQuery = Object.assign({}, omit(query, ['bookmark']), {
        search: value
      });
    } else {
      nextQuery = omit(query, ['bookmark', 'search']);
    }
  } else {
    // `value` is a propertyId

    // toggle:
    let nextQueryStringValues;

    if (
      facetUiMapValues.some(facetUiValue => {
        return facetUiValue.checked && facetUiValue.propertyId === value;
      })
    ) {
      // uncheck
      nextQueryStringValues = facetUiMapValues
        .filter(
          facetUiValue =>
            facetUiValue.checked && facetUiValue.propertyId !== value
        )
        .map(getQueryStringValue);
    } else {
      // check
      const nextQueryStringValue = getQueryStringValue(
        facetUiMapValues.find(
          facetUiMapValue => facetUiMapValue.propertyId === value
        )
      );

      nextQueryStringValues = facetUiMapValues
        .filter(facetUiValue => facetUiValue.checked)
        .map(getQueryStringValue)
        .concat(nextQueryStringValue);
    }

    nextQuery = Object.assign({}, omit(query, ['bookmark']), {
      [facet]: JSON.stringify(nextQueryStringValues)
    });

    if (!nextQueryStringValues.length) {
      delete nextQuery[facet];
    }
  }

  return nextQuery;
}

function getQueryStringValue(
  { propertyId, minValue, maxValue } = {} // typically comes from a count object (obtained from a facetMap or a facetUiMap)
) {
  return minValue != null && maxValue != null
    ? `[${minValue} TO ${maxValue}]`
    : propertyId;
}

export function getLoadingFacets(facets, query, nextQuery) {
  const prevFilters = parseQuery(facets, query);
  const filters = parseQuery(facets, nextQuery);

  return facets.reduce((loadingFacets, facet) => {
    if (filters[facet].length && !prevFilters[facet].length) {
      loadingFacets[facet] = new Set(filters[facet]);
    } else if (prevFilters[facet].length && !filters[facet].length) {
      loadingFacets[facet] = new Set(prevFilters[facet]);
    } else if (prevFilters[facet].length && filters[facet].length) {
      const prev = new Set(prevFilters[facet]);
      const curr = new Set(filters[facet]);
      const removed = prevFilters[facet].filter(x => !curr.has(x));
      const added = filters[facet].filter(x => !prev.has(x));
      loadingFacets[facet] = new Set(removed.concat(added));
    }
    return loadingFacets;
  }, {});
}

export function getDashboardRanges() {
  // Note: we set hours, minutes, seconds and ms to 0 so that the value doesn't shift as we toggle the facets
  const d = new Date();
  const now = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);

  const DAY = 1000 * 60 * 60 * 24;

  return {
    expectedDatePublishedOrRejected: {
      overdue: `[${new Date('0000').getTime() + 1} TO ${now.getTime()}]`,
      'due in 0 - 1 day': `[${now.getTime()} TO ${now.getTime() + DAY}]`,
      'due in 1 - 7 days': `[${now.getTime() + DAY} TO ${now.getTime() +
        7 * DAY}]`,
      'due in 7 days or more': `[${now.getTime() + 7 * DAY} TO ${
        Number.MAX_SAFE_INTEGER
      }]`
    },
    datePublishedOrRejected: {
      'in the past 0 - 1 day': `[${now.getTime() - DAY} TO ${now.getTime() +
        DAY -
        1}]`,
      'in the past 1 - 7 days': `[${now.getTime() -
        7 * DAY} TO ${now.getTime() - DAY}]`,
      'more than 7 days ago': `[${new Date('0000').getTime() +
        1} TO ${now.getTime() - 7 * DAY}]`
    }
  };
}
