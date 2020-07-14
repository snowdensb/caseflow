import React from 'react';
import PropTypes from 'prop-types';
import TextField from '../../components/TextField';
import Checkbox from '../../components/Checkbox';
import Button from '../../components/Button';
import Alert from '../../components/Alert';
import { dateFormatString } from '../../util/DateUtil';
import StringUtil from '../../util/StringUtil';
import { enabledSpecialIssues } from '../../constants/SpecialIssueEnabler';
import Table from '../../components/Table';
import TabWindow from '../../components/TabWindow';
import LoadingContainer from '../../components/LoadingContainer';
import { connect } from 'react-redux';
import * as Constants from '../../establishClaim/constants';
import moment from 'moment';
import { LOGO_COLORS } from '../../constants/AppConstants';
import COPY from '../../../COPY';

export class EstablishClaimDecision extends React.Component {
  constructor(props) {
    super(props);
    let endProductButtonText;

    if (this.hasMultipleDecisions()) {
      endProductButtonText = 'Route claim for Decision 1';
    } else {
      endProductButtonText = 'Route claim';
    }
    this.state = {
      endProductButtonText,
      allIssuesDisabled: props.specialIssues.noSpecialIssues
    };
  }

  specialIssuesChange = (checked, event) => {
    const specialIssueId = event.target.id;

    if (specialIssueId === 'noSpecialIssues') {
      this.setState({ allIssuesDisabled: checked });
      if (checked) {
        // dispatch a clearing of all Special Issues
        this.props.clearSpecialIssues();
      }
    }

    // dispatch the update for the box checked
    this.props.handleSpecialIssueFieldChange(specialIssueId, checked);
  }

  onTabSelected = (tabNumber) => {
    this.setState({
      endProductButtonText: `Route claim for Decision ${tabNumber + 1}`
    });
  };

  hasMultipleDecisions() {
    return this.props.task.appeal.decisions.length > 1;
  }

  validate = () => {
    const {
      specialIssuesRevamp,
      specialIssues,
      handleSubmit,
      showSpecialIssueError
    } = this.props;

    if (specialIssuesRevamp && Object.values(specialIssues).every((isChecked) => !isChecked)) {
      showSpecialIssueError();

      return;
    }

    return handleSubmit();
  }

  render() {
    let {
      loading,
      decisionType,
      handleToggleCancelTaskModal,
      pdfLink,
      pdfjsLink,
      specialIssues,
      task,
      specialIssuesError
    } = this.props;

    const { allIssuesDisabled } = this.state;
    let issueColumns = [
      {
        header: 'Program',
        valueName: 'program_description'
      },
      {
        header: 'VACOLS Issues',
        valueFunction: (issue, index) => {
          return issue.description.map(
            (descriptor) => (
              <div key={`${descriptor}-${index}`}>{descriptor}</div>
            ),
            null
          );
        }
      },
      {
        header: 'Disposition',
        valueFunction: (issue) => StringUtil.titleCase(issue.disposition)
      }
    ];

    let decisionDateStart = moment(task.appeal.serialized_decision_date).
      add(-3, 'days').
      format(dateFormatString);

    let decisionDateEnd = moment(task.appeal.serialized_decision_date).
      add(3, 'days').
      format(dateFormatString);

    // Sort in reverse chronological order
    let decisions = task.appeal.decisions.sort(
      (decision1, decision2) =>
        new Date(decision2.received_at) - new Date(decision1.received_at)
    );

    let tabs = decisions.map((decision, index) => {
      let tab = {};

      tab.disable = false;

      tab.label =
        `Decision ${index + 1} ` +
        `(${moment(decision.received_at).format(dateFormatString)})`;

      /* This link is here for 508 compliance, and shouldn't be visible to sighted
        users. We need to allow non-sighted users to preview the Decision. Adobe Acrobat
        is the accessibility standard and is used across gov't, so we'll recommend it
        for now. The usa-sr-only class will place an element off screen without
        affecting its placement in tab order, thus making it invisible onscreen
        but read out by screen readers. */

      tab.page = (
        <div>
          <a
            className="usa-sr-only"
            id="sr-download-link"
            href={`${pdfLink}&decision_number=${index}`}
            download
            target="_blank"
            rel="noopener noreferrer"
          >
            The PDF viewer in your browser may not be accessible. Click to
            download the Decision PDF so you can preview it in a reader with
            accessibility features such as Adobe Acrobat.
          </a>
          <a className="usa-sr-only" href="#establish-claim-buttons">
            If you are using a screen reader and have downloaded and verified
            the Decision PDF, click this link to skip past the browser PDF
            viewer to the establish-claim buttons.
          </a>
          <div>
            <LoadingContainer color={LOGO_COLORS.DISPATCH.ACCENT}>
              <iframe
                aria-label="The PDF embedded here is not accessible. Please use the above
                 link to download the PDF and view it in a PDF reader. Then use the
                 buttons below to go back and make edits or upload and certify
                 the document."
                className="cf-iframe-with-loading"
                title="Form8 PDF"
                src={`${pdfjsLink}&decision_number=${index}`}
              />
            </LoadingContainer>
          </div>
        </div>
      );

      return tab;
    });

    return (
      <div>
        <div
          id="review-decision-heading"
          className="cf-app-segment cf-app-segment--alt"
        >
          <h1>Review Decision</h1>
          Review the final decision from VBMS below to determine the next step.
          {this.hasMultipleDecisions() && (
            <Alert title="Multiple Decision Documents" type="warning">
              We found more than one decision document for the dispatch date
              range {decisionDateStart} - {decisionDateEnd}. Please review the
              decisions in the tabs below and select the document that best fits
              the decision criteria for this case.
            </Alert>
          )}
        </div>
        {this.hasMultipleDecisions() && (
          <div className="cf-app-segment cf-app-segment--alt">
            <h3>VACOLS Decision Criteria</h3>
            <Table
              columns={issueColumns}
              rowObjects={task.appeal.issues}
              summary="VACOLS decision criteria issues"
            />
          </div>
        )}
        {/* This link is here for 508 compliance, and shouldn't be visible to sighted
         users. We need to allow non-sighted users to preview the Decision. Adobe Acrobat
         is the accessibility standard and is used across gov't, so we'll recommend it
         for now. The usa-sr-only class will place an element off screen without
         affecting its placement in tab order, thus making it invisible onscreen
         but read out by screen readers. */}
        <div className="cf-app-segment cf-app-segment--alt">
          {this.hasMultipleDecisions() && (
            <div>
              <h2>Select a Decision Document</h2>
              <p>
                Use the tabs to review the decision documents below and select
                the decision that best fits the VACOLS Decision Criteria.
              </p>
              <TabWindow tabs={tabs} onChange={this.onTabSelected} />
            </div>
          )}
          {!this.hasMultipleDecisions() && tabs.length > 0 && tabs[0].page}

          <div className="usa-width-one-half">
            <TextField
              label="Decision type"
              name="decisionType"
              readOnly
              value={decisionType}
            />
          </div>

          <fieldset className="fieldset">
            <legend>
              <label>
                <b>Select Special Issues</b>
              </label>
            </legend>
            {specialIssuesError &&
              <Alert
                title={COPY.SPECIAL_ISSUES_NONE_CHOSEN_TITLE}
                message={COPY.SPECIAL_ISSUES_NONE_CHOSEN_DETAIL}
                type="error"
              />
            }
            <div className="cf-multiple-columns">
              {enabledSpecialIssues(this.props.specialIssuesRevamp).map((issue, index) => {
                return (
                  <Checkbox
                    id={issue.specialIssue}
                    label={issue.node || issue.display}
                    name={issue.specialIssue}
                    onChange={this.specialIssuesChange}
                    key={index}
                    value={specialIssues[issue.specialIssue]}
                    disabled={Boolean(issue.specialIssue !== 'noSpecialIssues' && allIssuesDisabled)}
                  />
                );
              })}
            </div>
          </fieldset>
        </div>
        <div className="cf-app-segment" id="establish-claim-buttons">
          <div className="cf-push-right">
            <Button
              name="Cancel"
              onClick={handleToggleCancelTaskModal}
              classNames={['cf-btn-link']}
            />
            <Button
              app="dispatch"
              name={this.state.endProductButtonText}
              onClick={this.validate}
              loading={loading}
            />
          </div>
        </div>
      </div>
    );
  }
}

EstablishClaimDecision.propTypes = {
  clearSpecialIssues: PropTypes.func,
  decisionType: PropTypes.string.isRequired,
  handleSpecialIssueFieldChange: PropTypes.func,
  handleSubmit: PropTypes.func.isRequired,
  handleToggleCancelTaskModal: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  pdfLink: PropTypes.string.isRequired,
  pdfjsLink: PropTypes.string.isRequired,
  showSpecialIssueError: PropTypes.func,
  specialIssues: PropTypes.object.isRequired,
  specialIssuesChange: PropTypes.func,
  specialIssuesError: PropTypes.bool,
  specialIssuesRevamp: PropTypes.bool,
  task: PropTypes.object.isRequired
};

const mapStateToProps = (state) => ({
  specialIssues: state.specialIssues,
  specialIssuesError: state.establishClaim.error
});

const mapDispatchToProps = (dispatch) => ({
  clearSpecialIssues: () => dispatch({ type: Constants.CLEAR_SPECIAL_ISSUES }),
  handleToggleCancelTaskModal: () => {
    dispatch({ type: Constants.TOGGLE_CANCEL_TASK_MODAL });
  },
  handleSpecialIssueFieldChange: (specialIssue, value) => {
    dispatch({ type: Constants.CLEAR_SPECIAL_ISSUE_ERROR });
    dispatch({
      type: Constants.CHANGE_SPECIAL_ISSUE,
      payload: {
        specialIssue,
        value
      }
    });
  },
  showSpecialIssueError: () => dispatch({ type: Constants.SHOW_SPECIAL_ISSUE_ERROR })
});

const ConnectedEstablishClaimDecision = connect(
  mapStateToProps,
  mapDispatchToProps
)(EstablishClaimDecision);

export default ConnectedEstablishClaimDecision;
