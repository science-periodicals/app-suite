import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { withRouter } from 'react-router-dom';
import noop from 'lodash/noop';
import { QRCode } from 'react-qr-svg';
import { getId, textify, arrayify } from '@scipe/jsonld';
import { schema } from '@scipe/librarian';
import { BemTags, PrintableColorText } from '@scipe/ui';
import Permalink from '../permalink';
import MetaMarginContent from './meta-margin-content';

const metaMarginContentType = <MetaMarginContent />.type;

class MetaMargin extends React.Component {
  static propTypes = {
    className: PropTypes.string,
    graph: PropTypes.object,
    mainEntity: PropTypes.object, // (used for ShareMenu text)
    resource: PropTypes.object, // the resource containing the meta margin children (used for ShareMenu text)
    margin: PropTypes.bool,
    children: PropTypes.any.isRequired,
    disabled: PropTypes.bool,
    isMobile: PropTypes.bool.isRequired,
    isPrinting: PropTypes.bool.isRequired,
    isPrintable: PropTypes.bool,
    isBlinded: PropTypes.bool,
    ignoreEntity: PropTypes.func, // f($entity) and returns `true` or `false` to decide if the $entity is _ignored_ (`true` means ignore) by metamargin
    url: PropTypes.object,
    updateDomBasedOn: PropTypes.any, // optimization: used to provide a hint: when specified we only call getDomValue if the value of 'updateDomBasedOn' changed

    fillDeadSpace: PropTypes.bool,
    permalink: PropTypes.bool,
    bigQR: PropTypes.bool,
    inline: PropTypes.bool,

    // react router
    location: PropTypes.object
  };

  static defaultProps = {
    url: {},
    graph: {},
    mainEntity: {},
    resource: {},
    margin: false,
    displayChildren: true,
    printChildren: true,
    ignoreEntity: noop,

    fillDeadSpace: false,
    permalink: true,
    bigQR: false,
    inline: false
  };

  constructor(props) {
    super(props);
    this.state = {
      domValues: [],
      permalinkHover: false
    };
    this.getDomValues = this.getDomValues.bind(this);
    this.handlePermalinkMouseOver = this.handlePermalinkMouseOver.bind(this);
    this.handlePermalinkMouseOut = this.handlePermalinkMouseOut.bind(this);
  }

  componentDidMount() {
    this.getDomValues();
  }

  componentDidUpdate(prevProps, prevState) {
    // we try to call getDomValues as few as possible as it is expensive...
    // Note: we can't rely on shouldComponentUpdate as this component takes children
    // Note: we can't rely on PureComponent upstream as the highlight state currently depends on the location
    if (
      ['isPrinting', 'isMobile', 'isPrintable'].some(
        p => prevProps[p] !== this.props[p]
      )
    ) {
      // always recompute in this case
      return this.getDomValues();
    }

    // children always change, if updateDomBasedOn is set, we use that instead of children
    if (this.props.updateDomBasedOn && prevProps.updateDomBasedOn) {
      if (this.props.updateDomBasedOn !== prevProps.updateDomBasedOn) {
        this.getDomValues();
      }
    } else if (this.props.children !== prevProps.children) {
      // should always be true
      this.getDomValues();
    }
  }

  getDomValues() {
    const {
      margin,
      isMobile,
      isPrinting,
      isPrintable,
      isBlinded,
      ignoreEntity,
      children
    } = this.props;

    // Note: we only render DOM values in metamargin for print (and not mobile)
    if (
      isMobile ||
      !isPrinting ||
      (isPrinting && !isPrintable) || // in print mode we only get the dom values when it's printable (all resource have been loaded)
      !checkIfNeedDomValues(children) ||
      !margin
    ) {
      return;
    }

    if (this.$content) {
      // we build a selector targeting everything of interest
      // we make it 1 big selector to have access to the proper order
      let index = 0;
      const domValues = Array.from(
        this.$content.querySelectorAll(
          [
            // citations
            'a[property="schema:citation"]',
            // part
            'a[property="schema:hasPart"]',
            // ORCID
            'a[href^="http://orcid.org"], a[href^="https://orcid.org"], a[href^="http://www.orcid.org"], a[href^="https://www.orcid.org"]',
            // abbreviations
            'abbr[title]',
            // all other external links
            'a[href^="http"]'
          ].join(', ')
        )
      )
        .filter($entity => {
          if (!$entity) return false;
          if (ignoreEntity($entity)) return false;

          // ignore links where the `textContent` has the same value as the `href`
          if (
            $entity.localName === 'a' &&
            $entity.hasAttribute('href') &&
            $entity.getAttribute('href') === ($entity.textContent || '').trim()
          ) {
            return false;
          }

          if (
            $entity.getAttribute('property') === 'schema:citation' ||
            $entity.getAttribute('property') === 'schema:hasPart'
          ) {
            // for citation and parts, only return the one with a defined @id
            return !!(
              $entity.getAttribute('resource') || $entity.getAttribute('href')
            );
          }
          return true;
        })
        .map(($entity, i) => {
          let type,
            id,
            displayTag = true;

          if (
            $entity.localName === 'a' &&
            $entity.getAttribute('property') === 'schema:citation'
          ) {
            type = 'link-citation';
          } else if (
            $entity.localName === 'a' &&
            $entity.getAttribute('property') === 'schema:hasPart'
          ) {
            type = 'link-part';
          } else if ($entity.localName === 'abbr') {
            type = 'abbr';
            // TODO cleanup + decide what to do for <a><abbr></abbr></a> or <abbr><a></a></abbr>
            if (
              $entity
                .getAttribute('title')
                .includes('Digital Object Identifier')
            ) {
              type = 'abbr-doi';
            }
            if (
              $entity
                .getAttribute('title')
                .includes('International Standard Book Number')
            ) {
              type = 'abbr-isbn';
            }
          } else if (
            $entity.localName === 'a' &&
            $entity.getAttribute('href').includes('orcid.org')
          ) {
            type = 'link-orcid';
            displayTag = !isBlinded;
          } else if (
            $entity.localName === 'a' &&
            $entity.getAttribute('href').includes('/ISBN')
          ) {
            type = 'link-isbn';
          } else if (
            $entity.localName === 'a' &&
            $entity.getAttribute('href').includes('doi.org')
          ) {
            type = 'link-doi';
          } else if ($entity.localName === 'a') {
            if ($entity.getAttribute('href').includes($entity.textContent)) {
              // TODO this would check if the linked text is a url
              // could then decide not to be redundant if we want...
              // console.log('--link is visible inline');
            }
            type = 'link-external';
          }

          if ($entity.getAttribute('property')) {
            id =
              $entity.getAttribute('resource') || $entity.getAttribute('href');
          }

          const classNames = [
            `meta-margin__link-source`,
            `meta-margin__link-source--${type}`
          ];

          if (displayTag) {
            classNames.push(`meta-margin__link-source-tag`);
          } else {
            classNames.push('meta-margin__link-source--hidden');
            return;
          }

          $entity.className = classNames.join(' ');

          return {
            '@id': id,
            $value: $entity,
            order: index++,
            className: classNames.join(' '),
            type
          };
        })
        .filter(Boolean);

      this.setState({ domValues });
    }
  }

  handlePermalinkMouseOver() {
    if (!this.state.permalinkHover) this.setState({ permalinkHover: true });
  }

  handlePermalinkMouseOut() {
    if (this.state.permalinkHover) this.setState({ permalinkHover: false });
  }

  renderPrintLocator(bigQR) {
    const { url } = this.props;

    const splt = url.pathname
      .replace(/^\//, '')
      .replace(/\/$/, '')
      .split('/');
    const lastPathnamePart = splt[splt.length - 1];

    return (
      <div className="meta-margin__print-locator">
        <div className="meta-margin__print-locator__hash">
          {/* this is covered by the section-block div on section dividers */}
          {url.hash}
        </div>
        <div className="meta-margin__print-locator__section-block">
          <div className="meta-margin__print-locator__bg">
            <svg
              width="100%"
              height="100%"
              className="meta-margin__print-locator__bg-svg"
            >
              <rect
                className="meta-margin__print-locator__bg-svg-rect"
                x="0"
                y="0"
                width="100%"
                height="100%"
                style={{ fill: 'currentColor' }}
              />
            </svg>
          </div>
          <div className="meta-margin__print-locator__layout">
            {bigQR ? (
              <PrintableColorText wrapText={true}>
                {url.origin + url.pathname + url.hash}
              </PrintableColorText>
            ) : (
              <PrintableColorText wrapText={false}>
                {lastPathnamePart + url.hash}
              </PrintableColorText>
            )}
          </div>
        </div>
      </div>
    );
  }

  render() {
    const {
      className,
      mainEntity,
      resource,
      margin,
      children,
      isMobile,
      isPrinting,
      isPrintable,
      url,
      location,

      fillDeadSpace,
      permalink,
      bigQR,
      inline
    } = this.props;

    if (isPrinting && !isPrintable) {
      // Note: we do need to render the children as they may contain image tags etc. that needs to be loaded
      return children;
    }

    const { permalinkHover, domValues } = this.state;

    const bem = BemTags('@sa');

    const displayMargin = isMobile
      ? false
      : margin != null
      ? margin
      : isPrinting;

    const isArticle = schema.is(mainEntity, 'Article');

    let name, description, text; // social text to share

    if (isArticle) {
      if (
        getId(mainEntity) == getId(resource) ||
        (!resource.alternateName || !mainEntity.name)
      ) {
        name = textify(mainEntity.name);
      } else {
        text = `${textify(resource.alternateName)} in ${textify(
          mainEntity.name
        )}`;
      }
      description = textify(
        resource.description ||
          (arrayify(resource.detailedDescription)[0] &&
            arrayify(resource.detailedDescription)[0].text)
      );
    } else {
      name = textify(resource.name);
      description = textify(resource.description);
    }

    let highlight = location.hash === url.hash || permalinkHover;

    // TODO cleanup `isPreview` inference use context or redux or pass down preview prop everywhere...
    const isPreview = location.pathname.endsWith('preview');

    return (
      <div
        id={
          (url.hash || '').slice(1) /* !! Note: this id is used for scrolling */
        }
        className={
          bem`${classNames('meta-margin', {
            '--no-margin': !displayMargin,
            '--void-empty-white-space': fillDeadSpace,
            '--inline': inline,
            '--highlight': highlight
          })}` + ` ${className ? className : ''}`
        }
      >
        <div className={bem`__highlight`} />
        <div
          className="meta-margin__children"
          ref={el => {
            this.$content = el;
          }}
        >
          {React.Children.map(children, child => {
            if (child.type !== metaMarginContentType) {
              //return child;
              return child;
            } else {
              return null;
            }
          })}
        </div>

        {displayMargin && (
          <div className="meta-margin__margin">
            {permalink && (
              <div
                className={classNames('meta-margin__permalink', {
                  'meta-margin__permalink--hovered': permalinkHover,
                  'meta-margin__permalink--big': bigQR
                })}
              >
                {isPrinting ? (
                  this.renderPrintLocator(bigQR)
                ) : (
                  <div
                    className="meta-margin__locator"
                    onMouseOver={this.handlePermalinkMouseOver}
                    onMouseOut={this.handlePermalinkMouseOut}
                  >
                    <span className="meta-margin__locator__purl">
                      {`${url.origin}${url.pathname}`}
                    </span>
                    <Permalink
                      href={url.href}
                      icon={
                        <span className="meta-margin__locator__counter">
                          {isPrinting ? url.hash : (url.hash || '').slice(1)}
                        </span>
                      }
                      title={''}
                      social={!isPreview}
                      text={text}
                      name={name}
                      description={description}
                    />
                  </div>
                )}
                <div
                  aria-hidden={true}
                  className={`meta-margin__permalink__qrcode ${
                    bigQR ? 'meta-margin__permalink__qrcode--big' : ''
                  }`}
                >
                  {isPrinting && isPrintable ? (
                    <QRCode
                      value={url.href}
                      style={{
                        width: `${bigQR ? '50px' : '25px'}`
                      }}
                      bgColor={'#ffffff'}
                      fgColor={'#000'}
                      level={bigQR ? 'Q' : 'L'}
                    />
                  ) : (
                    <div style={{ width: '25px' }} />
                  )}
                </div>
              </div>
            )}

            <div className="meta-margin__margin__content">
              {React.Children.map(children, child => {
                if (child.type === metaMarginContentType) {
                  if (typeof child.props.children === 'function') {
                    return React.cloneElement(child, {
                      children: child.props.children.bind(this, domValues)
                    });
                  }
                  return child;
                } else {
                  return null;
                }
              })}
              <div className="meta-margin__overflow-divider" />
            </div>
          </div>
        )}

        {!displayMargin && isMobile && permalink && (
          <div className="meta-margin__mobile-margin">
            <Permalink
              href={url.href}
              icon={
                <span className="meta-margin__locator__counter">
                  {isPrinting ? url.hash : (url.hash || '').slice(1)}
                </span>
              }
              title={''}
              social={!isPreview}
              text={text}
              name={name}
              description={description}
            />
          </div>
        )}
      </div>
    );
  }
}

export default withRouter(MetaMargin);

function checkIfNeedDomValues(children) {
  let extract = false;

  React.Children.forEach(children, child => {
    if (
      child.type === metaMarginContentType &&
      typeof child.props.children === 'function'
    ) {
      extract = true;
    }
  });

  return extract;
}

export const StyleMetaMarginList = ({ children, tagName, id, className }) => {
  const bem = BemTags('meta-margin');
  const El = tagName || 'ul';
  return (
    <El id={id} className={classNames(bem`__list`, className)}>
      {children}
    </El>
  );
};

StyleMetaMarginList.propTypes = {
  children: PropTypes.any,
  tagName: PropTypes.string,
  id: PropTypes.string,
  className: PropTypes.string
};

export const StyleMetaMarginListItem = ({
  children,
  tagName,
  icon,
  className
}) => {
  const bem = BemTags('meta-margin');
  const El = tagName || 'li';
  return (
    <El
      className={classNames(
        bem`__list-item ${icon ? '--icon' : ''}`,
        className
      )}
    >
      {children}
    </El>
  );
};

StyleMetaMarginListItem.propTypes = {
  children: PropTypes.any,
  tagName: PropTypes.string,
  icon: PropTypes.bool,
  className: PropTypes.string
};

export const StyleMetaMarginInlineList = ({ children, tagName, icon }) => {
  const bem = BemTags('meta-margin');
  const El = tagName || 'ul';
  return (
    <El className={bem`__inline-list ${icon ? '--icon' : '--tet'}`}>
      {children}
    </El>
  );
};

StyleMetaMarginInlineList.propTypes = {
  children: PropTypes.any,
  tagName: PropTypes.string,
  icon: PropTypes.bool
};
