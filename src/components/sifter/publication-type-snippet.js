import React from 'react';
import PropTypes from 'prop-types';
import pluralize from 'pluralize';
import { getId, unprefix, textify } from '@scipe/jsonld';
import { Card, Span, Value } from '@scipe/ui';

export default class PublicationTypeSnippet extends React.Component {
  static propTypes = {
    canWrite: PropTypes.bool,
    journal: PropTypes.object,
    publicationType: PropTypes.shape({
      name: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
      alternateName: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
      description: PropTypes.oneOfType([PropTypes.string, PropTypes.object])
    }),
    query: PropTypes.object,
    sticking: PropTypes.bool,
    displayMode: PropTypes.string
  };

  static defaultProps = {
    publicationType: {},
    query: {},
    displayMode: 'unsticky'
  };

  render() {
    const { publicationType, sticking, displayMode } = this.props;

    let displayName;
    if (publicationType.name || publicationType.alternateName) {
      const name = textify(
        publicationType.name || publicationType.alternateName
      );
      displayName = pluralize(name);
    } else {
      displayName = unprefix(getId(publicationType));
    }

    return (
      <Card
        className={`publication-type-snippet ${
          sticking ? 'publication-type-snippet--sticking' : ''
        } publication-type-snippet--${displayMode}
        `}
      >
        <Value tagName="header" className="publication-type-snippet__header">
          {displayName}
        </Value>

        {publicationType.description && (
          <div className="publication-type-snippet__description">
            <Span>{publicationType.description}</Span>
          </div>
        )}
      </Card>
    );
  }
}
