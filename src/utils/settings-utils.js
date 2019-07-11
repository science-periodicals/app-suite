import { getId, arrayify } from '@scipe/jsonld';
import { CONTACT_POINT_EDITORIAL_OFFICE } from '@scipe/librarian';

export function getJournalStaffBlockingErrors(journal) {
  const errors = [];

  // At minima a journal need 1 editor handing incoming submission
  if (
    !arrayify(journal.editor).some(role =>
      arrayify(role.roleContactPoint).some(
        cp => cp.contactType === CONTACT_POINT_EDITORIAL_OFFICE
      )
    )
  ) {
    errors.push({
      key: 'staff-1',
      message: 'At least 1 editor handling incoming submission is required'
    });
  }
  return errors.length ? errors : null;
}

export function getJournalWorkflowsBlockingErrors(workflowSpecifications = []) {
  const errors = [];

  if (
    !workflowSpecifications.length ||
    !arrayify(workflowSpecifications).some(
      workflowSpecification =>
        workflowSpecification.workflowSpecificationStatus ===
        'ActiveWorkflowSpecificationStatus'
    )
  ) {
    errors.push({
      key: 'workflow-1',
      message: 'At least 1 active editorial workflow is required'
    });
  }

  return errors.length ? errors : null;
}

export function getJournalPublicationTypesBlockingErrors(
  publicationTypes = [],
  workflowSpecifications = []
) {
  const errors = [];

  if (
    !publicationTypes.length ||
    !arrayify(publicationTypes).some(
      publicationType =>
        publicationType.publicationTypeStatus ===
          'ActivePublicationTypeStatus' &&
        arrayify(publicationType.eligibleWorkflow).some(workflow => {
          return arrayify(workflowSpecifications).some(
            _workflow =>
              getId(_workflow) === getId(workflow) &&
              _workflow.workflowSpecificationStatus ===
                'ActiveWorkflowSpecificationStatus'
          );
        })
    )
  ) {
    errors.push({
      key: 'type-1',
      message:
        'At least 1 active publication type with an active eligible worklow is required'
    });
  }

  return errors.length ? errors : null;
}

export function getJournalAccessTypesBlockingErrors(journal) {
  const errors = [];

  const canAccept = arrayify(journal.hasDigitalDocumentPermission).some(
    permission => permission.permissionType === 'CreateGraphPermission'
  );

  if (!canAccept) {
    errors.push({
      key: 'access-1',
      message: 'The accept incoming submission switch must be turned on'
    });
  }

  if (
    !arrayify(journal.hasDigitalDocumentPermission).some(
      permission =>
        permission.grantee &&
        permission.grantee.audienceType === 'public' &&
        (permission.permissionType === 'ReadPermission' ||
          permission.permissionType === 'WritePermission' ||
          permission.permissionType === 'AdminPermission')
    )
  ) {
    errors.push({
      key: 'access-2',
      message:
        'The enable public to access journal switch must be turned on' +
        (canAccept
          ? ' (otherwise only journal staff will be able to submit incoming submissions)'
          : '')
    });
  }

  return errors.length ? errors : null;
}
