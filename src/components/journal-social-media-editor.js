import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';
import { arrayify, getId } from '@scipe/jsonld';
import { PaperInput, withOnSubmit } from '@scipe/ui';
import { updateJournal } from '../actions/journal-action-creators';
import { RE_TWITTER, RE_FACEBOOK } from '../constants';

const ControledPaperInput = withOnSubmit(PaperInput);

export default connect(
  null,
  { updateJournal }
)(
  class JournalSocialMediaEditor extends React.Component {
    static propTypes = {
      className: PropTypes.string,
      disabled: PropTypes.bool.isRequired,
      readOnly: PropTypes.bool,
      periodical: PropTypes.object,
      updateJournal: PropTypes.func.isRequired
    };

    static defaultProps = {
      periodical: {}
    };

    handleSubmit = e => {
      const { periodical } = this.props;

      if (e.target.validity.valid) {
        let value = e.target.value;
        switch (e.target.name) {
          case 'twitter':
            value = arrayify(periodical.sameAs)
              .filter(uri => !RE_TWITTER.test(uri))
              .concat(
                `https://twitter.com/${(value || '')
                  .replace(RE_TWITTER, '')
                  .replace(/^(\/)?@/, '')}`
              );
            break;
          case 'facebook':
            value = arrayify(periodical.sameAs)
              .filter(uri => !RE_FACEBOOK.test(uri))
              .concat(value);
            break;

          default:
            break;
        }

        this.props.updateJournal(getId(periodical), value, {
          '@type': 'TargetRole',
          targetCollection: getId(periodical),
          hasSelector: {
            '@type': 'NodeSelector',
            selectedProperty:
              e.target.name === 'twitter' || e.target.name === 'facebook'
                ? 'sameAs'
                : e.target.name
          }
        });
      }
    };

    render() {
      const { className, readOnly, disabled, periodical } = this.props;

      const facebookUrl =
        arrayify(periodical.sameAs).find(uri => RE_FACEBOOK.test(uri)) || '';
      const twitterUrl =
        arrayify(periodical.sameAs).find(uri => RE_TWITTER.test(uri)) || '';
      const twitterHandle = twitterUrl.split('/')[3] || '';

      return (
        <div className={classNames(className, 'journal-contact-editor')}>
          <ControledPaperInput
            name="twitter"
            label="Twitter handle"
            value={twitterHandle}
            disabled={disabled}
            readOnly={readOnly}
            pattern="^@?(\w){1,15}$"
            type="text"
            onSubmit={this.handleSubmit}
          />
          <ControledPaperInput
            name="facebook"
            label="Facebook URL"
            value={facebookUrl}
            disabled={disabled}
            readOnly={readOnly}
            type="url"
            pattern="^http(s)?:\/\/(www\.)?facebook.com\/.*"
            onSubmit={this.handleSubmit}
          />
        </div>
      );
    }
  }
);
