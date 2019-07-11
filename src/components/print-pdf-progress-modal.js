import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';
import { getId } from '@scipe/jsonld';
import Iconoclass from '@scipe/iconoclass';
import { Modal, Span, Spinner, Card } from '@scipe/ui';

class PrintPdfProgressModal extends React.Component {
  static propTypes = {
    // redux
    isPrintProgessModalOpen: PropTypes.bool
  };

  constructor(props) {
    super(props);
    this.state = {
      fetchEncodingStatus: {},
      fetchableEncodings: []
    };
  }

  receiveMessage = e => {
    // we receive messages from the print iframe
    if (e.origin === window.location.origin) {
      this.setState({
        fetchEncodingStatus: e.data.fetchEncodingStatus,
        fetchableEncodings: e.data.fetchableEncodings
      });
    }
  };

  componentDidMount() {
    window.addEventListener('message', this.receiveMessage);
  }

  componentWillUnmount() {
    window.removeEventListener('message', this.receiveMessage);
  }

  componentDidUpdate(prevProps) {
    // Reset state on close
    if (
      prevProps.isPrintProgessModalOpen === true &&
      this.props.isPrintProgessModalOpen === false
    ) {
      this.setState({
        fetchEncodingStatus: {},
        fetchableEncodings: []
      });
    }
  }

  render() {
    const { isPrintProgessModalOpen } = this.props;
    const { fetchableEncodings, fetchEncodingStatus } = this.state;

    return (
      <div className="print-pdf-progress-modal">
        {isPrintProgessModalOpen && (
          <Modal>
            <Card>
              <div className="print-pdf-progress-modal__content">
                <header className="print-pdf-progress-modal__header">
                  <h2 className="print-pdf-progress-modal__title">
                    Preparing PDF
                    <Iconoclass iconName="info" />
                  </h2>
                </header>
                <div className="print-pdf-progress-modal__body">
                  <p>A PDF is being generated. This may take a few minutes…</p>

                  <ul className="print-pdf-progress-modal__progress-list">
                    <li className="print-pdf-progress-modal__progress-list-item">
                      <span>Retrieving content</span>
                      {fetchableEncodings && fetchableEncodings.length ? (
                        <Iconoclass iconName="check" iconSize={16} />
                      ) : (
                        <Spinner progressMode={'bounce'} size={16} />
                      )}
                    </li>
                    {fetchableEncodings &&
                      fetchableEncodings.map(encoding => (
                        <li
                          key={getId(encoding)}
                          className="print-pdf-progress-modal__progress-list-item"
                        >
                          <span>
                            Preparing{' '}
                            <Span>{encoding.name || getId(encoding)}</Span>
                          </span>

                          {!fetchEncodingStatus[getId(encoding)] ||
                          fetchEncodingStatus[getId(encoding)].active ? (
                            <Spinner progressMode={'bounce'} size={16} />
                          ) : (
                            <Iconoclass iconName="check" iconSize={16} />
                          )}
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </Card>
          </Modal>
        )}
      </div>
    );
  }
}

export default connect(
  createSelector(
    state => state.isPrintProgessModalOpen,
    isPrintProgessModalOpen => {
      return { isPrintProgessModalOpen };
    }
  )
)(PrintPdfProgressModal);
