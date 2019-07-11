import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import classNames from 'classnames';
import { getId, prefix, arrayify } from '@scipe/jsonld';
import {
  FlexPacker,
  RdfaCaption,
  RdfaCaptionMetadata,
  Label,
  ResourceDownloadMenu
} from '@scipe/ui';
import { schema } from '@scipe/librarian';
import ImageObject from '../image-object';
import AudioObject from '../audio-object';
import VideoObject from '../video-object';
import FormulaObject from '../formula-object';
import SoftwareSourceCodeObject from '../software-source-code-object';
import TableObject from '../table-object';
import DataDownload from '../data-download';
import TextBoxObject from '../text-box-object';
import { NoRenderingNotice } from '../notice';

import MetaMargin from '../meta-margin/meta-margin';
import MetaMarginContent from '../meta-margin/meta-margin-content';
import MetaMarginMixedData from '../meta-margin/meta-margin-mixed-data';

const ConnectedTableObject = connect(makeMapStateToProps)(TableObject);

class DatasetObject extends React.PureComponent {
  static propTypes = {
    resource: PropTypes.object,
    isPrinting: PropTypes.bool,
    content: PropTypes.shape({
      workbook: PropTypes.arrayOf(
        PropTypes.shape({
          name: PropTypes.string,
          html: PropTypes.string
        })
      ),
      html: PropTypes.string
    })
  };

  render() {
    const { resource, content, isPrinting } = this.props;

    if (content) {
      if (content.workbook) {
        return (
          <ul className="rdfa-figure__list">
            {content.workbook.map((sheet, i) => (
              <li key={sheet.name} className="rdfa-figure__list-item">
                <header>
                  <Label>{sheet.name}</Label>
                </header>
                <TableObject content={sheet} isPrinting={isPrinting} />
              </li>
            ))}
          </ul>
        );
      } else {
        return <TableObject content={content} isPrinting={isPrinting} />;
      }
    } else {
      return <DataDownload resource={resource} isPrinting={isPrinting} />;
    }
  }
}

const ConnectedDatasetObject = connect(makeMapStateToProps)(DatasetObject);

export default class RdfaFigure extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    url: PropTypes.object.isRequired,
    graphId: PropTypes.string.isRequired,
    stageId: PropTypes.string,
    graph: PropTypes.object,
    mainEntity: PropTypes.object,
    object: PropTypes.object.isRequired,
    overwriteNodeMap: PropTypes.object,
    predicate: PropTypes.string,
    isPrinting: PropTypes.bool.isRequired,
    isPrintable: PropTypes.bool,
    isMobile: PropTypes.bool.isRequired,
    blindingData: PropTypes.object.isRequired
  };

  renderBody() {
    // Note we don't RDFa the encodings as we do the RDFa in the list of encoding for download
    const { graphId, object, isPrinting } = this.props;

    let body;
    if (schema.is(object, 'Image')) {
      if (object.hasPart) {
        body = (
          <FlexPacker className="rdfa-figure__flex-packer">
            {arrayify(object.hasPart).map(part => (
              <figure
                key={getId(part)}
                property="schema:hasPart"
                typeof={prefix(part['@type'])}
                resource={getId(part)}
              >
                {!!part.alternateName && (
                  <figcaption>
                    <Label property="schema:alternateName">
                      {part.alternateName}
                    </Label>
                  </figcaption>
                )}

                <ImageObject
                  graphId={graphId}
                  resource={part}
                  isPrinting={isPrinting}
                />
              </figure>
            ))}
          </FlexPacker>
        );
      } else {
        body = (
          <ImageObject
            graphId={graphId}
            resource={object}
            isPrinting={isPrinting}
          />
        );
      }
    } else if (schema.is(object, 'Audio')) {
      body = <AudioObject resource={object} isPrinting={isPrinting} />;
    } else if (schema.is(object, 'Video')) {
      body = <VideoObject resource={object} isPrinting={isPrinting} />;
    } else if (schema.is(object, 'Table')) {
      body = <ConnectedTableObject resource={object} isPrinting={isPrinting} />;
    } else if (schema.is(object, 'SoftwareSourceCode')) {
      body = (
        <SoftwareSourceCodeObject resource={object} isPrinting={isPrinting} />
      );
    } else if (schema.is(object, 'Formula')) {
      body = <FormulaObject resource={object} isPrinting={isPrinting} />;
    } else if (schema.is(object, 'Dataset')) {
      body = (
        <ConnectedDatasetObject resource={object} isPrinting={isPrinting} />
      );
    } else if (schema.is(object, 'TextBox')) {
      body = <TextBoxObject resource={object} isPrinting={isPrinting} />;
    } else {
      body = <NoRenderingNotice />;
    }
    return body;
  }

  render() {
    const {
      id,
      className,
      url,
      predicate,
      object,
      graph,
      stageId,
      mainEntity,
      overwriteNodeMap,
      isPrinting,
      isPrintable,
      isMobile,
      blindingData
    } = this.props;

    const isBlinded = !blindingData.visibleRoleNames.has('author');

    const isTextBox = schema.is(object, 'TextBox');
    const isMultiPartFigure =
      schema.is(object, 'Image') && arrayify(object.hasPart).length;

    const captionedParts = arrayify(object.hasPart).filter(part => part =>
      part.alternateName || part.caption
    );

    return (
      <div id={id} className="rdfa-figure-container">
        <MetaMargin
          margin={true}
          url={url}
          graph={graph}
          mainEntity={mainEntity}
          resource={object}
          fillDeadSpace={isPrinting}
          isPrinting={isPrinting}
          isPrintable={isPrintable}
          isMobile={isMobile}
          updateDomBasedOn={object}
          isBlinded={isBlinded}
        >
          <div className="rdfa-figure-container__bar">
            <Label
              className="rdfa-figure-container__label"
              property="schema:alternateName"
            >
              {object.alternateName || 'Unnamed resource'}
            </Label>

            <ResourceDownloadMenu resource={object} />
          </div>
        </MetaMargin>

        <MetaMargin
          margin={true}
          graph={graph}
          mainEntity={mainEntity}
          resource={object}
          fillDeadSpace={isPrinting}
          isPrinting={isPrinting}
          isPrintable={isPrintable}
          isMobile={isMobile}
          isBlinded={isBlinded}
          updateDomBasedOn={object}
          permalink={false}
        >
          {isTextBox ? (
            <aside
              className={classNames(className, 'rdfa-figure')}
              property={predicate}
              resource={getId(object)}
              typeof={prefix(object['@type'])}
            >
              <header>
                <RdfaCaption object={object} graphId={getId(graph)} />
                {isMobile && (
                  <RdfaCaptionMetadata
                    object={object}
                    mainEntity={mainEntity}
                    graphId={getId(graph)}
                    isBlinded={isBlinded}
                    blindingData={blindingData}
                  />
                )}
              </header>

              {this.renderBody()}
            </aside>
          ) : (
            <figure
              id={id}
              className={classNames(className, 'rdfa-figure', {
                'rdfa-figure--multi-part-figure': isMultiPartFigure
              })}
              property={predicate}
              resource={getId(object)}
              typeof={prefix(object['@type'])}
            >
              {isMultiPartFigure ? (
                <figcaption>
                  <div className="rdfa-figure__multipart-caption">
                    <div className="rdfa-figure__main-caption">
                      {/* The main part with metadata only on mobile (otherwise there are in the metamargin */}
                      <RdfaCaption
                        object={object}
                        graphId={getId(graph)}
                        displayParts={false}
                      />
                      {isMobile && (
                        <RdfaCaptionMetadata
                          object={object}
                          mainEntity={mainEntity}
                          graphId={getId(graph)}
                          isBlinded={isBlinded}
                          blindingData={blindingData}
                          displayParts={false}
                        />
                      )}
                    </div>
                    {/* The parts (always with metadata) */}
                    {captionedParts.length > 0 && (
                      <ul className="sa__clear-list-styles rdfa-figure__sub-caption-list">
                        {captionedParts.map(part => (
                          <li
                            key={getId(part)}
                            className="rdfa-figure__sub-caption-list-item"
                          >
                            <RdfaCaption
                              object={part}
                              graphId={getId(graph)}
                              displayLabel={true}
                              displayParts={false}
                            />
                            <RdfaCaptionMetadata
                              object={part}
                              mainEntity={mainEntity}
                              graphId={getId(graph)}
                              isBlinded={isBlinded}
                              blindingData={blindingData}
                              displayParts={false}
                              theme="inline"
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </figcaption>
              ) : (
                <figcaption>
                  <RdfaCaption object={object} graphId={getId(graph)} />
                  {isMobile && (
                    <RdfaCaptionMetadata
                      object={object}
                      mainEntity={mainEntity}
                      graphId={getId(graph)}
                      isBlinded={isBlinded}
                      blindingData={blindingData}
                    />
                  )}
                </figcaption>
              )}

              {this.renderBody()}
            </figure>
          )}

          <MetaMarginContent>
            {domValues => (
              <div>
                <RdfaCaptionMetadata
                  object={object}
                  mainEntity={mainEntity}
                  graphId={getId(graph)}
                  isBlinded={isBlinded}
                  blindingData={blindingData}
                  displayParts={false}
                />
                <MetaMarginMixedData
                  graphId={getId(graph)}
                  stageId={stageId}
                  domValues={domValues}
                  overwriteNodeMap={overwriteNodeMap}
                />
              </div>
            )}
          </MetaMarginContent>
        </MetaMargin>
      </div>
    );
  }
}

function makeSelector() {
  return createSelector(
    (state, props) => {
      let encodings;
      if (props.resource) {
        encodings = arrayify(
          props.resource.encoding || props.resource.distribution
        );

        for (let encoding of encodings) {
          const encodingId = getId(encoding);
          if (
            encodingId in state.contentMap &&
            (state.contentMap[encodingId].html ||
              state.contentMap[encodingId].workbook)
          ) {
            return state.contentMap[encodingId];
          }
        }
      }
    },
    content => {
      return { content };
    }
  );
}

function makeMapStateToProps() {
  const s = makeSelector();
  return (state, props) => {
    return s(state, props);
  };
}
