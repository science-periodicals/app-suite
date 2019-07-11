import React from 'react';

import PropTypes from 'prop-types';

import capitalize from '../utils/capitalize';
import { SCHEMA_ORG_TO_ROLE_NAME } from '../constants/roles';

function ContributorList({ roleName, contributors }) {
  return (
    <div className="contributor-list">
      <h3 className="contributor-list__title">
        {`${capitalize(SCHEMA_ORG_TO_ROLE_NAME[roleName])}s`}
      </h3>
      <ol>
        {contributors.map((contributor, i) =>
          <li key={i}>
            {`${contributor.name} — ${contributor.title}`}
          </li>
        )}
      </ol>
    </div>
  );
}

let { array, string } = PropTypes;
ContributorList.propTypes = {
  contributors: array.isRequired,
  roleName: string.isRequired
};

export default ContributorList;
