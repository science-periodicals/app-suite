import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import Iconoclass from '@scipe/iconoclass';
import { getId } from '@scipe/jsonld';
import MetaMarginCitation from './meta-margin-citation';
import MetaMarginFigure from './meta-margin-figure';
import { StyleMetaMarginList } from './meta-margin';

const reOrcid = /^http(s)?:\/\/(www\.)?orcid.org\//i;

export default class MetaMarginMixedData extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    graphId: PropTypes.string.isRequired,
    stageId: PropTypes.string,
    overwriteNodeMap: PropTypes.object,
    domValues: PropTypes.arrayOf(
      PropTypes.shape({
        '@id': PropTypes.string,
        $value: PropTypes.any,
        order: PropTypes.number,
        className: PropTypes.string,
        type: PropTypes.oneOf([
          'link-citation',
          'link-part',
          'link-orcid',
          'link-external',
          'abbr'
        ])
      })
    )
  };

  render() {
    const {
      id,
      className,
      graphId,
      stageId,
      domValues,
      overwriteNodeMap
    } = this.props;

    /* avoid uncessary css padding if the list is empty */
    if (!domValues || domValues.length == 0) return null;

    return (
      <StyleMetaMarginList
        tagName="ol"
        id={id}
        className={classNames('meta-margin-mixed-data', className)}
      >
        {domValues.map((value, i) => {
          if (value.type === 'link-part') {
            return (
              <li
                key={i}
                className={
                  'meta-margin__link-target-tag meta-margin__link-target-tag--link-part'
                }
              >
                <MetaMarginFigure
                  graphId={graphId}
                  stageId={stageId}
                  overwriteNodeMap={overwriteNodeMap}
                  value={value}
                />
              </li>
            );
          } else if (value.type === 'link-orcid') {
            return (
              <li
                key={i}
                className={
                  'meta-margin__link-target-tag meta-margin__link-target-tag--link-orcid'
                }
              >
                <Iconoclass iconName="orcid" size="12px" />
                <a href={value.$value.getAttribute('href')} title="ORCID">
                  {value.$value.getAttribute('href').replace(reOrcid, '')}
                </a>
              </li>
            );
          } else if (value.type === 'link-citation' && getId(value)) {
            return (
              <li
                key={i}
                className={
                  'meta-margin__link-target-tag meta-margin__link-target-tag--link-citation'
                }
              >
                <MetaMarginCitation
                  graphId={graphId}
                  stageId={stageId}
                  overwriteNodeMap={overwriteNodeMap}
                  value={value}
                />
              </li>
            );
          } else if (value.type === 'link-external') {
            return (
              <li
                key={i}
                className={
                  'meta-margin__link-target-tag meta-margin__link-target-tag--link-external'
                }
              >
                <a href={value.$value.getAttribute('href')}>
                  {value.$value.getAttribute('href')}
                </a>
              </li>
            );
          }
        })}
      </StyleMetaMarginList>
    );
  }
}
