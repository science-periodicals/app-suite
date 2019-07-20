import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import romanize from 'romanize';
import { embed, getId } from '@scipe/jsonld';
import Iconoclass from '@scipe/iconoclass';
import { Value, RdfaRoleContactPoints, bemify } from '@scipe/ui';
import { createGraphDataSelector } from '../../selectors/graph-selectors';
import Counter from '../../utils/counter';
import MetaMargin from '../meta-margin/meta-margin';
import MetaMarginContent from '../meta-margin/meta-margin-content';
import MetaMarginMixedData from '../meta-margin/meta-margin-mixed-data';
import ScrollLink from '../scroll-link';

class RdfaArticleNotes extends React.Component {
  static propTypes = {
    graphId: PropTypes.string.isRequired,
    graph: PropTypes.object,
    mainEntity: PropTypes.object,
    overwriteNodeMap: PropTypes.object,
    isMobile: PropTypes.bool,
    isPrinting: PropTypes.bool,
    isPrintable: PropTypes.bool,
    counter: PropTypes.instanceOf(Counter).isRequired,
    blindingData: PropTypes.object.isRequired,

    // Redux
    footnotes: PropTypes.arrayOf(PropTypes.object),
    endnotes: PropTypes.arrayOf(PropTypes.object)
  };

  render() {
    const {
      graphId,
      graph,
      overwriteNodeMap,
      mainEntity,
      footnotes,
      endnotes,
      blindingData,
      isMobile,
      isPrinting,
      isPrintable,
      counter
    } = this.props;

    if (!footnotes.length && !endnotes.length) {
      return null;
    }

    const isBlinded = !blindingData.visibleRoleNames.has('author');

    const bem = bemify('rdfa-article-notes');

    // TODO RDFa
    return (
      <section className={bem``}>
        {/* !! the `notes` id is used for the ToC */}
        <MetaMargin
          url={counter.increment({ level: 3 }).getUrl()}
          margin={true}
          graph={graph}
          mainEntity={mainEntity}
          resource={mainEntity}
          isMobile={isMobile}
          isPrinting={isPrinting}
          isPrintable={isPrintable}
          fillDeadSpace={isPrinting}
        >
          <h2 id="notes" className={bem`__section-title`}>
            Notes
          </h2>
        </MetaMargin>
        <ul className={bem`__notes-list`}>
          {footnotes.map(footnote => (
            <li key={getId(footnote)} className={bem`__notes-list__item`}>
              <MetaMargin
                url={counter.increment({ level: 3 }).getUrl()}
                margin={true}
                graph={graph}
                mainEntity={mainEntity}
                resource={mainEntity}
                isMobile={isMobile}
                isPrinting={isPrinting}
                isPrintable={isPrintable}
                fillDeadSpace={isPrinting}
                updateDomBasedOn={footnote}
              >
                <ScrollLink
                  to={{
                    hash: `#fn${
                      'noteIdentifier' in footnote
                        ? footnote.noteIdentifier
                        : footnote.roleContactPointNoteIdentifier
                    }.0`
                  }}
                  className={bem`__counter`}
                >
                  {'noteIdentifier' in footnote
                    ? footnote.noteIdentifier
                    : footnote.roleContactPointNoteIdentifier}
                </ScrollLink>
                {footnote['@type'] === 'ContributeAction' ? (
                  <Value tagName="span" className={bem`__description`}>
                    {footnote.description}
                  </Value>
                ) : footnote['@type'] === 'ContributorRole' ? (
                  isBlinded ? (
                    <span className={bem`__anonymized-note`}>
                      <Iconoclass
                        iconName="anonymous"
                        className={bem`__anonymized-note__icon`}
                        size={isPrinting ? '12px' : '16px'}
                      />{' '}
                      This footnote is not displayed to preserve author
                      anonymity.
                    </span>
                  ) : (
                    <Fragment>
                      <h5 className={bem`__contact-points-title`}>
                        Contact Information
                      </h5>
                      <RdfaRoleContactPoints
                        object={footnote}
                        isPrinting={isPrinting}
                      />
                    </Fragment>
                  )
                ) : (
                  <Value>{footnote.text}</Value>
                )}
                <MetaMarginContent>
                  {domValues => (
                    <MetaMarginMixedData
                      graphId={getId(graph) || graphId}
                      overwriteNodeMap={overwriteNodeMap}
                      domValues={domValues}
                    />
                  )}
                </MetaMarginContent>
              </MetaMargin>
            </li>
          ))}
        </ul>

        <ul className={bem`__notes-list`}>
          {endnotes.map(endnote => (
            <li key={getId(endnote)} className={bem`__notes-list__item`}>
              <MetaMargin
                url={counter.increment({ level: 3 }).getUrl()}
                margin={true}
                graph={graph}
                mainEntity={mainEntity}
                resource={mainEntity}
                isMobile={isMobile}
                isPrinting={isPrinting}
                isPrintable={isPrintable}
                fillDeadSpace={isPrinting}
                updateDomBasedOn={endnote}
              >
                <ScrollLink
                  to={{ hash: `#en${endnote.noteIdentifier}.0` }}
                  className={bem`__counter`}
                >
                  {romanize(endnote.noteIdentifier)}
                </ScrollLink>
                <Value>{endnote.text}</Value>

                <MetaMarginContent>
                  {domValues => (
                    <MetaMarginMixedData
                      graphId={getId(graph) || graphId}
                      overwriteNodeMap={overwriteNodeMap}
                      domValues={domValues}
                    />
                  )}
                </MetaMarginContent>
              </MetaMargin>
            </li>
          ))}
        </ul>
      </section>
    );
  }
}

export default connect(
  createSelector(
    (state, props) => props.overwriteNodeMap,
    createGraphDataSelector(),
    (overwriteNodeMap, { graph, nodeMap } = {}) => {
      nodeMap = overwriteNodeMap || nodeMap;

      // Footnotes and endnotes
      // any node with a `noteIdentifier` or `roleContactPointNoteIdentifier`
      const notes = Object.values(nodeMap).filter(
        node =>
          node.noteIdentifier != null ||
          node.roleContactPointNoteIdentifier != null
      );

      const footnotes = notes
        .filter(
          note =>
            note['@type'] === 'ContributeAction' ||
            note['@type'] === 'ContributorRole' ||
            note['@type'] === 'Footnote'
        )
        .sort((a, b) => {
          const aId =
            a.roleContactPointNoteIdentifier != null
              ? a.roleContactPointNoteIdentifier
              : a.noteIdentifier;

          const bId =
            b.roleContactPointNoteIdentifier != null
              ? b.roleContactPointNoteIdentifier
              : b.noteIdentifier;

          return aId - bId;
        })
        .map(note => {
          if (note['@type'] === 'Footnote') {
            return note;
          }

          return embed(note, nodeMap);
        });

      const endnotes = notes
        .filter(note => note['@type'] === 'Endnote')
        .sort((a, b) => {
          return a.noteIdentifier - b.noteIdentifier;
        });

      return { footnotes, endnotes };
    }
  )
)(RdfaArticleNotes);
