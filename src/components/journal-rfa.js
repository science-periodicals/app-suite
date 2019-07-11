import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { Helmet } from 'react-helmet-async';
import { helmetify } from '@scipe/librarian';
import { fetchRfa } from '../actions/rfa-action-creators';
import RfaSnippet from './rfa-snippet';

class JournalRfa extends React.Component {
  static propTypes = {
    match: PropTypes.shape({
      params: PropTypes.shape({
        rfaId: PropTypes.string.isRequired
      })
    }).isRequired,
    user: PropTypes.object,
    journal: PropTypes.object,

    // redux
    rfaId: PropTypes.string.isRequired,
    rfa: PropTypes.object,
    fetchRfa: PropTypes.func.isRequired,
    isActive: PropTypes.bool.isRequired
  };

  componentDidMount() {
    const { rfaId, fetchRfa } = this.props;
    fetchRfa(rfaId);
  }

  componentDidUpdate(prevProps, prevState) {
    const { rfaId, fetchRfa } = this.props;
    if (prevProps.rfaId !== rfaId) {
      fetchRfa(rfaId);
    }
  }

  render() {
    const { user, journal, rfa, isActive } = this.props;
    if (!rfa) {
      return null;
    }

    if (isActive) {
      return null;
    }

    const helmet = helmetify(rfa, {
      defaultImg: '/favicon/alt-submark-favicon/android-chrome-512x512.png'
    });

    return (
      <div className="journal-rfa">
        <Helmet>
          {helmet.title && <title>{helmet.title}</title>}
          {helmet.meta.map(attrMap => (
            <meta key={attrMap.name || attrMap.content} {...attrMap} />
          ))}
        </Helmet>

        <RfaSnippet
          user={user}
          journal={journal}
          reset={true}
          defaultIsExpanded={true}
          rfa={rfa}
        />
      </div>
    );
  }
}

export default connect(
  createSelector(
    (state, props) => `action:${props.match.params.rfaId}`,
    state => state.droplets,
    state => state.fetchRfaStatus,
    (rfaId, droplets, status) => {
      return {
        rfaId,
        rfa: droplets[rfaId],
        isActive: status.isActive,
        error: status.error
      };
    }
  ),
  { fetchRfa }
)(JournalRfa);
