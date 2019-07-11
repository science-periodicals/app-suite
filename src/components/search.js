import React from 'react';
import PropTypes from 'prop-types';
import querystring from 'querystring';
import { arrayify, getNodeMap } from '@scipe/jsonld';
import { xhr } from '@scipe/librarian';

export default class Search extends React.Component {
  static propTypes = {
    index: PropTypes.oneOf([
      'service',
      'action',
      'journal',
      'service',
      'type',
      'graph',
      'release',
      'event'
    ]),
    query: PropTypes.string,
    hydrate: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.arrayOf(PropTypes.string)
    ]),
    children: PropTypes.func.isRequired
  };

  static defaultProps = {
    query: '*:*'
  };

  constructor(props) {
    super(props);
    this.state = {
      items: [],
      droplets: {},
      nextUrl: null,
      error: null,
      isActive: null,
      numberOfItems: 0
    };
  }

  componentDidMount() {
    this._isMounted = true;
    this.fetch();
  }

  componentDidUpdate(prevProps) {
    if (this.props.query !== prevProps.query) {
      this.setState(
        {
          items: [],
          droplets: {},
          nextUrl: null,
          error: null,
          isActive: null,
          numberOfItems: 0
        },
        () => {
          if (this.xhr && this.xhr.abort) {
            this.xhr.abort();
          }
          this.fetch();
        }
      );
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
    if (this.xhr && this.xhr.abort) {
      this.xhr.abort();
    }
  }

  fetch({ append = false } = {}) {
    const { index, query, hydrate } = this.props;

    const qs = {
      q: query,
      includeDocs: true
    };
    if (hydrate) {
      qs.hydrate = JSON.stringify(arrayify(hydrate));
    }

    this.xhr = xhr({
      url: `/${index}?${querystring.stringify(qs)}`,
      method: 'GET',
      json: true
    });

    this.setState({
      isActive: true
    });

    this.xhr
      .then(({ body }) => {
        if (this._isMounted) {
          const mainEntity = body.mainEntity || body;

          const items = append
            ? items.concat(
                mainEntity.itemListElement.map(
                  itemListElement => itemListElement.item
                )
              )
            : mainEntity.itemListElement.map(
                itemListElement => itemListElement.item
              );

          const lastItemListElement =
            mainEntity.itemListElement[mainEntity.itemListElement.length - 1];

          const nextUrl =
            (lastItemListElement && lastItemListElement.nextItem) || null;

          const droplets = append
            ? Object.assign(
                {},
                this.state.droplets,
                getNodeMap(arrayify(body['@graph']))
              )
            : getNodeMap(arrayify(body['@graph']));

          this.setState({
            error: null,
            nextUrl,
            items,
            droplets,
            numberOfItems: mainEntity.numberOfItems,
            isActive: false
          });
        }
      })
      .catch(err => {
        if (this._isMounted) {
          this.setState({
            error: err,
            isActive: false
          });
        }
      });
  }

  handleMore = e => {
    this.fetch({ append: true });
  };

  render() {
    const { children } = this.props;
    const {
      error,
      isActive,
      items,
      droplets,
      nextUrl,
      numberOfItems
    } = this.state;

    const hasMore = !!(nextUrl && items.length < numberOfItems);

    return children({
      items,
      droplets,
      error,
      isActive,
      onMore: this.handleMore,
      hasMore
    });
  }
}
