import React from 'react';
import PropTypes from 'prop-types';
import { isEmpty } from 'lodash';

import { formatDateStr } from 'app/util/DateUtil';
import IssueList from 'app/queue/components/IssueList';
import EditableField from 'app/components/EditableField';
import LoadingMessage from 'app/components/LoadingMessage';

// TODO: Replace this with the actual components refactored in a later part of the stack
import { getClaimTypeDetailInfo } from 'app/reader/utils';

/**
 * Document Information Component for the Document Screen
 * @param {Object} props -- Contains details about the document and functions to modify
 */
export const DocumentInformation = ({
  appeal,
  currentDocument,
  saveDescription,
  changeDescription,
  resetDescription,
  error,
}) => (
  <div className="cf-sidebar-document-information">
    <p className="cf-pdf-meta-title cf-pdf-cutoff">
      <strong>Document Type: </strong>
      <span title={currentDocument.type} className="cf-document-type">
        {currentDocument.type}
      </span>
    </p>
    <EditableField
      className="cf-pdf-meta-title"
      value={currentDocument.pendingDescription || currentDocument.description || ''}
      onSave={saveDescription}
      onChange={changeDescription}
      onCancel={resetDescription}
      maxLength={50}
      label="Document Description"
      strongLabel
      name="document_description"
      errorMessage={error?.visible ? error.message : null}
    />
    <p className="cf-pdf-meta-title">
      <strong>Receipt Date:</strong> {formatDateStr(currentDocument.receivedAt)}
    </p>
    <hr />
    {isEmpty(appeal) ? <LoadingMessage message="Loading details..." /> : (
      <div>
        <p className="cf-pdf-meta-title">
          <strong>Veteran ID:</strong> {appeal.vbms_id}
        </p>
        <div className="cf-pdf-meta-title">
          <strong>Type:</strong> {appeal.type} {getClaimTypeDetailInfo(appeal)}
        </div>
        <p className="cf-pdf-meta-title">
          <strong>Docket Number:</strong> {appeal.docket_number}
        </p>
        {appeal.regional_office && (
          <p className="cf-pdf-meta-title">
            <strong>Regional Office:</strong> {`${appeal.regional_office.key} - ${appeal.regional_office.city}`}
          </p>
        )}
        <div className="cf-pdf-meta-title">
          <strong>Issues: </strong>
          <IssueList
            appeal={{ ...appeal, isLegacyAppeal: appeal.docket_name === 'legacy' }}
            className="cf-pdf-meta-doc-info-issues"
            issuesOnly
          />
        </div>
      </div>
    )}
  </div>
);

DocumentInformation.propTypes = {
  saveDescription: PropTypes.func,
  changeDescription: PropTypes.func,
  resetDescription: PropTypes.func,
  error: PropTypes.object,
  appeal: PropTypes.object,
  currentDocument: PropTypes.object,
};
