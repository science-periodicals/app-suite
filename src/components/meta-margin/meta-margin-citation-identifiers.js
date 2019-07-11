import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { arrayify, getId } from '@scipe/jsonld';
import isUrl from 'is-url';
import { BemTags, Tooltip } from '@scipe/ui';
import Iconoclass from '@scipe/iconoclass';
import { StyleMetaMarginListItem, StyleMetaMarginList } from './meta-margin';

const bem = BemTags('@sa', '@meta-margin');

/**
 * Custom renderer for meta margin content for the items of the citation list
 */
export default class MetaMarginCitationIdentifiers extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    citation: PropTypes.object,
    isPrinting: PropTypes.bool,
    section: PropTypes.string
  };

  static defaultProps = {
    isPrinting: false
  };

  render() {
    const { id, className, citation, isPrinting, section } = this.props;

    const doi = arrayify(citation.doi).find(doi => doi);
    const isbn = arrayify(citation.isbn).find(isbn => isbn);
    const url = arrayify(citation.url)
      .concat(citation.sameAs)
      .concat(getId(citation))
      .find(uri => isUrl(uri));

    return (
      <div
        className={classNames(
          bem`meta-margin-citation-identifiers ${
            section ? '--' + section : ''
          }`,
          className
        )}
      >
        <StyleMetaMarginList id={id}>
          {!!url && (
            <StyleMetaMarginListItem icon={true}>
              <Iconoclass
                iconName="link"
                size={
                  isPrinting
                    ? section == 'back-matter'
                      ? '8px'
                      : '12px'
                    : '16px'
                }
              />
              {/*<abbr
                  className={bem`label --url`}
                  title="Uniform Resource Locator"
                >
                  URL
                </abbr>*/}
              <a href={url}>{url}</a>
            </StyleMetaMarginListItem>
          )}

          {!!doi && (
            <StyleMetaMarginListItem icon={true}>
              <Iconoclass
                iconName="doi"
                size={
                  isPrinting
                    ? section == 'back-matter'
                      ? '8px'
                      : '12px'
                    : '16px'
                }
              />

              <a href={`http://doi.org/${doi}`}>{citation.doi}</a>
            </StyleMetaMarginListItem>
          )}

          {!!isbn && (
            <StyleMetaMarginListItem icon={true}>
              <Tooltip
                tagName="div"
                displayText="ISBN (International Standard Book Number)"
              >
                <Iconoclass
                  iconName="isbn"
                  size={
                    isPrinting
                      ? section == 'back-matter'
                        ? '8px'
                        : '12px'
                      : '16px'
                  }
                />

                <a href={`https://www.worldcat.org/ISBN/${isbn}`}>
                  {arrayify(citation.isbn)[0]}
                </a>
              </Tooltip>
            </StyleMetaMarginListItem>
          )}
        </StyleMetaMarginList>
      </div>
    );
  }
}
