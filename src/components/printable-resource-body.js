import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { getId, arrayify } from '@scipe/jsonld';
import { schema } from '@scipe/librarian';
import { Label } from '@scipe/ui';
import {
  isRegularGrid,
  getRegularGridLayout,
  normalizeSizesForPrint
} from '../utils/image-layout';
import {
  getCanonicalImageObject,
  getEncodingSize
} from '../utils/image-object';
import ImageObject from './image-object';
import AudioObject from './audio-object';
import VideoObject from './video-object';
import FormulaObject from './formula-object';
import SoftwareSourceCodeObject from './software-source-code-object';
import TableObject from './table-object';
import DataDownload from './data-download';
import TextBoxObject from './text-box-object';
import { NoRenderingNotice } from './notice';

export default class PrintableResourceBody extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    graphId: PropTypes.string.isRequired,
    stageId: PropTypes.string,
    graph: PropTypes.object,
    resource: PropTypes.object.isRequired,
    availableHeight: PropTypes.number.isRequired, // in pixels
    availableWidth: PropTypes.number.isRequired, // in pixels
    preventPrintRescaling: PropTypes.bool
  };

  getGridRenderRows(nRows, nCols) {
    const { resource, graphId, preventPrintRescaling } = this.props;

    let renderRows = [];

    const parts = arrayify(resource.hasPart);

    let partIndex = 0;
    for (let r = 0; r < nRows; r++) {
      let row = [];
      for (let c = 0; c < nCols; c++) {
        let part = parts[partIndex];
        if (!part) {
          break; // there can be more columns than available parts
        }

        row.push(
          <figure
            key={getId(part)}
            className="printable-resource-body__multipart-image__figure"
          >
            {!!part.alternateName && (
              <figcaption>
                <Label>{part.alternateName}</Label>
              </figcaption>
            )}
            <ImageObject
              graphId={graphId}
              resource={part}
              isPrinting={true}
              preventPrintRescaling={preventPrintRescaling}
            />
          </figure>
        );
        partIndex++;
      }
      renderRows.push(row);
    }

    return renderRows;
  }

  renderMultiPartFigure() {
    const {
      resource,
      graphId,
      availableWidth,
      preventPrintRescaling
    } = this.props;

    const parts = arrayify(resource.hasPart);

    let renderRows = [];

    const imageSizes = normalizeSizesForPrint(
      parts.map(part => {
        return getEncodingSize(getCanonicalImageObject(part));
      })
    );

    // make sure we have all the info we need to render layouts
    if (
      imageSizes &&
      imageSizes.length > 0 &&
      parts.length <= 5 && // Note: if there are more than 5 parts we always render a grid &&
      isRegularGrid(imageSizes)
    ) {
      // see if a regular grid layout is possible.

      const { cols, rows } = getRegularGridLayout(
        imageSizes,
        availableWidth,
        100
      );

      renderRows = this.getGridRenderRows(rows, cols);
    } else {
      // some image data are missing size info so fall back to grid or stacked image layout based on number of parts.
      if (parts.length > 3) {
        const nRows = Math.ceil(Math.sqrt(parts.length));
        const nMinCols = Math.floor(Math.sqrt(parts.length));
        renderRows = this.getGridRenderRows(
          nRows,
          nRows * nMinCols >= parts.length ? nMinCols : nRows
        );
      } else {
        renderRows = parts.map(part => {
          return (
            <figure
              key={getId(part)}
              className="printable-resource-body__multipart-image__figure"
            >
              {!!part.alternateName && (
                <figcaption>
                  <Label>{part.alternateName}</Label>
                </figcaption>
              )}
              <ImageObject
                graphId={graphId}
                resource={part}
                isPrinting={true}
                preventPrintRescaling={preventPrintRescaling}
              />
            </figure>
          );
        });
      }
    }

    return (
      <div className="printable-resource-body__multipart-image">
        {renderRows.map((row, i) => {
          return (
            <div
              className="printable-resource-body__multipart-image__row"
              key={i}
            >
              {row}
            </div>
          );
        })}
      </div>
    );
  }

  render() {
    const {
      resource,
      graphId,
      availableWidth,
      availableHeight,
      preventPrintRescaling
    } = this.props;

    let body;

    // subtract printable-resource-body's padding from available height

    const availableBodyHeight = availableHeight - 2 * 24;
    // console.log('availableBodyHeight', availableBodyHeight);

    if (schema.is(resource, 'Image')) {
      if (resource.hasPart) {
        body = this.renderMultiPartFigure();
      } else {
        body = (
          <div className="printable-resource-body__image-container">
            <div className="printable-resource-body__image-container__image">
              <ImageObject
                graphId={graphId}
                resource={resource}
                isPrinting={true}
                preventPrintRescaling={preventPrintRescaling}
              />
            </div>
          </div>
        );
      }
    } else if (schema.is(resource, 'Audio')) {
      body = <AudioObject resource={resource} isPrinting={true} />;
    } else if (schema.is(resource, 'Video')) {
      body = <VideoObject resource={resource} isPrinting={true} />;
    } else if (schema.is(resource, 'Table')) {
      body = (
        <ConnectedTableObject
          resource={resource}
          isPrinting={true}
          availableWidth={availableWidth}
          availableHeight={availableBodyHeight}
          preventPrintRescaling={preventPrintRescaling}
        />
      );
    } else if (schema.is(resource, 'SoftwareSourceCode')) {
      body = (
        <div className="printable-resource-body__source-code-container">
          <SoftwareSourceCodeObject
            resource={resource}
            isPrinting={true}
            availableWidth={availableWidth}
            availableHeight={availableBodyHeight}
            preventPrintRescaling={preventPrintRescaling}
          />
        </div>
      );
    } else if (schema.is(resource, 'Formula')) {
      body = (
        <FormulaObject
          resource={resource}
          isPrinting={true}
          availableWidth={availableWidth}
          availableHeight={availableHeight}
          preventPrintRescaling={preventPrintRescaling}
        />
      );
    } else if (schema.is(resource, 'Dataset')) {
      body = (
        <ConnectedDatasetObject
          resource={resource}
          isPrinting={true}
          availableWidth={availableWidth}
          availableHeight={availableBodyHeight}
          preventPrintRescaling={preventPrintRescaling}
        />
      );
    } else if (schema.is(resource, 'TextBox')) {
      body = (
        <div className="printable-resource-body__text-box-container">
          <TextBoxObject
            resource={resource}
            isPrinting={true}
            availableWidth={availableWidth}
            availableHeight={availableBodyHeight}
            preventPrintRescaling={preventPrintRescaling}
          />
        </div>
      );
    } else {
      body = <NoRenderingNotice />;
    }

    return (
      <div
        className="printable-resource-body"
        style={{ width: `${availableWidth}px`, height: `${availableHeight}px` }}
      >
        {body}
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

var ConnectedTableObject = connect(makeMapStateToProps)(TableObject);

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
    }),
    preventPrintRescaling: PropTypes.bool,
    availableHeight: PropTypes.number.isRequired, // in pixels
    availableWidth: PropTypes.number.isRequired // in pixels
  };

  render() {
    const {
      resource,
      content,
      isPrinting,
      preventPrintRescaling,
      availableWidth,
      availableHeight
    } = this.props;

    // console.log('DatasetObject availableHeight', availableHeight);

    if (content) {
      if (content.workbook) {
        return (
          <ul className="printable-resource-body__list">
            {content.workbook.map((sheet, i) => (
              <li
                key={sheet.name}
                className="printable-resource-body__list-item"
              >
                <header>
                  <Label>{sheet.name}</Label>
                </header>
                <TableObject
                  content={sheet}
                  isPrinting={isPrinting}
                  preventPrintRescaling={preventPrintRescaling}
                  availableWidth={availableWidth}
                  availableHeight={availableHeight}
                />
              </li>
            ))}
          </ul>
        );
      } else {
        return (
          <TableObject
            content={content}
            isPrinting={isPrinting}
            preventPrintRescaling={preventPrintRescaling}
            availableWidth={availableWidth}
            availableHeight={availableHeight}
          />
        );
      }
    } else {
      return (
        <DataDownload
          resource={resource}
          isPrinting={isPrinting}
          preventPrintRescaling={preventPrintRescaling}
        />
      );
    }
  }
}

var ConnectedDatasetObject = connect(makeMapStateToProps)(DatasetObject);
