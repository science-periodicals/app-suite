import React from 'react';
import PropTypes from 'prop-types';
import { getId } from '@scipe/jsonld';
import Iconoclass from '@scipe/iconoclass';
import Counter from '../utils/counter';
import {
  Div,
  Span,
  getIconNameFromSchema,
  API_LABELS,
  RdfaCaptionMetadata
} from '@scipe/ui';
import MetaMargin from './meta-margin/meta-margin';
import MetaMarginContent from './meta-margin/meta-margin-content';

export default class OnlineResources extends React.Component {
  static propTypes = {
    graph: PropTypes.object,
    mainEntity: PropTypes.object,
    isPrinting: PropTypes.bool.isRequired,
    isPrintable: PropTypes.bool,
    isMobile: PropTypes.bool,
    blindingData: PropTypes.object.isRequired,

    counter: PropTypes.instanceOf(Counter).isRequired,
    hasSupportingInformation: PropTypes.bool,
    onlineResources: PropTypes.arrayOf(PropTypes.object),
    supportingResources: PropTypes.arrayOf(PropTypes.object) // Note: we can have supportingResources.length === 0 _and_ hasSupportingInformation = true => there is a SI section without resources in it
  };

  static defaultProps = {
    hasSupportingInformation: false,
    mainEntityBodyResources: []
  };

  render() {
    const {
      hasSupportingInformation,
      onlineResources,
      supportingResources,
      blindingData,
      isPrinting,
      mainEntity,
      graph,
      isPrintable,
      isMobile,
      counter
    } = this.props;

    if (
      !hasSupportingInformation &&
      !supportingResources.length &&
      !onlineResources.length
    ) {
      return null;
    }

    const isBlinded = !blindingData.visibleRoleNames.has('author');

    return (
      <div className="online-resources">
        <header className="online-resources__header">Online Resources</header>

        <ul className="online-resources__list">
          {onlineResources.concat(supportingResources).map(resource => {
            const url = resource.isSupportingResource
              ? counter
                  .increment({
                    level: 3,
                    key: `online-resource-${getId(resource)}`
                  })
                  .getUrl()
              : counter.getUrl(`rdfa-figure-${getId(resource)}`);

            return (
              <li key={getId(resource)} className="online-resources__list-item">
                <MetaMargin
                  margin={true}
                  fillDeadSpace={isPrinting}
                  graph={graph}
                  mainEntity={mainEntity}
                  resource={resource}
                  isPrinting={isPrinting}
                  isPrintable={isPrintable}
                  isMobile={isMobile}
                  isBlinded={isBlinded}
                  url={url}
                  updateDomBasedOn={resource}
                >
                  <div className="online-resources__title">
                    <Iconoclass
                      iconName={getIconNameFromSchema(resource)}
                      size="1.2em"
                    />
                    <Span className="online-resources__name">
                      {resource.alternateName ||
                        API_LABELS[resource['@type']] ||
                        resource['@type']}
                    </Span>
                  </div>
                  {!!resource.caption && (
                    <Div className="online-resources__caption">
                      {resource.caption}
                    </Div>
                  )}

                  <MetaMarginContent>
                    <RdfaCaptionMetadata
                      object={resource}
                      mainEntity={mainEntity}
                      graphId={getId(graph)}
                      isBlinded={isBlinded}
                      blindingData={blindingData}
                      theme="print-list"
                      isPrinting={isPrinting}
                    />
                  </MetaMarginContent>
                </MetaMargin>
              </li>
            );
          })}

          {/* Side case where there are no supporting resources (figure etc.) _but_ there is a SI section */}
          {!!(hasSupportingInformation && !supportingResources.length) && (
            <li className="online-resources__list-item">
              <span className="online-resources__title">
                <Iconoclass iconName="link" size="1.2em" />
                Supporting information
              </span>
            </li>
          )}
        </ul>
      </div>
    );
  }
}
