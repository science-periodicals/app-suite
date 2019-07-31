import React, { Suspense } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import { getId } from '@scipe/jsonld';
import config from '../utils/config';
import Loading from './loading';
import { Modal, Card, ControlPanel, PaperButton } from '@scipe/ui';

const DemoModalContent = React.lazy(() =>
  import(/* webpackChunkName: "DemoModalContent" */ './demo-modal-content')
);

class DemoModal extends React.Component {
  static propTypes = {
    // react-router
    location: PropTypes.object.isRequired,
    // redux
    userId: PropTypes.string
  };

  constructor(props) {
    super(props);
    this.state = {
      isOpen: true
    };
  }

  handleClose = e => {
    this.setState({ isOpen: false });
  };

  render() {
    const {
      userId,
      location: { pathname }
    } = this.props;
    const { isOpen } = this.state;
    if (!isOpen) {
      return null;
    }

    // early returns
    switch (userId) {
      // editor demos
      case 'user:engelbart-demo':
        if (
          pathname !== '/settings/journal/demo/journal' &&
          pathname !== '/' &&
          pathname !== '/demo/editor-assesses-reviewed-submission/submission' &&
          pathname !== '/demo/editor-endorses-apc-discount-action/submission' &&
          pathname !== '/demo/editor-assesses-revised-submission/submission' &&
          pathname !== '/demo/editor-publishes-submission/submission' &&
          pathname !== '/rfas' &&
          pathname !== '/ceballos2017a-demo'
        ) {
          return null;
        }
        break;

      // producer demos
      case 'user:taylor-demo':
        if (
          pathname !== '/settings/organization/demo-org/services' &&
          !(!config.isJournalSubdomain && pathname === '/') &&
          pathname !==
            '/demo/typesetter-assesses-document-to-typeset/submission' &&
          pathname !== '/demo/typesetter-typesets-document/submission'
        ) {
          return null;
        }
        break;

      // reviewer demos
      case 'user:licklider-demo':
        if (
          pathname !== '/settings/profile/bio' &&
          !(!config.isJournalSubdomain && pathname === '/') &&
          pathname !== '/demo/reviewer-accepts-invitation/submission' &&
          pathname !== '/demo/reviewer-reviews-submission/submission' &&
          pathname !== '/demo/reviewer-reviews-revised-submission/submission' &&
          pathname !== '/about/licklider-demo'
        ) {
          return null;
        }
        break;

      // author demos
      case 'user:hamilton-demo':
        if (
          pathname !== '/demo/author-prepares-submission/submission' &&
          pathname !== '/demo/author-makes-declarations/submission' &&
          !(!config.isJournalSubdomain && pathname === '/') &&
          pathname !== '/demo/author-prepares-revision/submission' &&
          pathname !== '/demo/author-requests-apc-discount/submission' &&
          pathname !==
            '/demo/author-confirms-contribution-and-identity/submission' &&
          pathname !== '/payne2016a-demo'
        ) {
          return null;
        }
        break;

      default:
        return null;
    }

    return (
      <Modal>
        <Card className="demo-modal sa__ui-user-type">
          <h2>Welcome</h2>

          <div className="demo-modal__content">
            <Suspense fallback={<Loading />}>
              <DemoModalContent
                userId={userId}
                pathname={pathname}
                isJournalSubdomain={config.isJournalSubdomain}
              />
            </Suspense>
          </div>

          <ControlPanel>
            <PaperButton onClick={this.handleClose}>Start</PaperButton>
          </ControlPanel>
        </Card>
      </Modal>
    );
  }
}

export default withRouter(
  connect(
    createSelector(
      state => getId(state.user),
      userId => {
        return { userId };
      }
    )
  )(DemoModal)
);
