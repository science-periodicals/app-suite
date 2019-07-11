import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { getId } from '@scipe/jsonld';
import { RdfaCaption, RdfaCaptionMetadata, Label } from '@scipe/ui';
import FormulaObject from './formula-object';
import TextBoxObject from './text-box-object';
import SoftwareSourceCodeObject from './software-source-code-object';

import MetaMargin from './meta-margin/meta-margin';
import MetaMarginContent from './meta-margin/meta-margin-content';

// For now this is only used to print equations and text box inline

export default class PrintableInlineResource extends React.Component {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    url: PropTypes.object.isRequired,
    graphId: PropTypes.string.isRequired,
    stageId: PropTypes.string,
    graph: PropTypes.object,
    mainEntity: PropTypes.object,
    object: PropTypes.shape({
      '@type': PropTypes.oneOf(['Formula', 'TextBox', 'SoftwareSourceCode'])
        .isRequired
    }).isRequired,
    isPrinting: PropTypes.bool.isRequired,
    isPrintable: PropTypes.bool,
    isMobile: PropTypes.bool,
    blindingData: PropTypes.object.isRequired
  };

  static defaultProps = {
    isPrinting: true
  };

  render() {
    const {
      id,
      className,
      url,
      object,
      graph,
      mainEntity,
      isPrinting,
      isPrintable,
      isMobile,
      blindingData
    } = this.props;

    const isBlinded = !blindingData.visibleRoleNames.has('author');

    return (
      <div
        id={id}
        className={classNames(className, 'printable-inline-resource')}
      >
        <MetaMargin
          margin={true}
          fillDeadSpace={isPrinting}
          graph={graph}
          mainEntity={mainEntity}
          resource={object}
          isPrinting={isPrinting}
          isPrintable={isPrintable}
          isMobile={isMobile}
          isBlinded={isBlinded}
          url={url}
          updateDomBasedOn={object}
        >
          {object['@type'] === 'TextBox' ? (
            <aside className="printable-inline-resource__aside">
              <header className="printable-inline-resource__aside-info">
                <Label className="printable-inline-resource__aside-label">
                  {object.alternateName || 'Unnamed resource'}
                </Label>
                <RdfaCaption object={object} graphId={getId(graph)} />
              </header>

              <TextBoxObject
                resource={object}
                isPrinting={isPrinting}
                preventPrintRescaling={true}
              />
            </aside>
          ) : (
            <figure className="printable-inline-resource__figure">
              <figcaption className="printable-inline-resource__figure-info">
                <Label className="printable-inline-resource__figure-label">
                  {object.alternateName || 'Unnamed resource'}
                </Label>
                <RdfaCaption
                  className="printable-inline-resource__figure-caption"
                  object={object}
                  graphId={getId(graph)}
                />
              </figcaption>

              {object['@type'] === 'Formula' ? (
                <FormulaObject
                  resource={object}
                  isPrinting={isPrinting}
                  preventPrintRescaling={true}
                />
              ) : (
                <SoftwareSourceCodeObject
                  resource={object}
                  isPrinting={isPrinting}
                  preventPrintRescaling={true}
                />
              )}
            </figure>
          )}

          <MetaMarginContent>
            <RdfaCaptionMetadata
              object={object}
              mainEntity={mainEntity}
              graphId={getId(graph)}
              isBlinded={isBlinded}
              blindingData={blindingData}
              theme="print-list"
              isPrinting={true}
            />
          </MetaMarginContent>
        </MetaMargin>
      </div>
    );
  }
}
