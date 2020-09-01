import React from 'react';
import { createStore } from 'redux';
import { Provider } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';

import reducer from '../../../app/queue/reducers';
import { defaultHearing, hearingDateOptions } from '../../data/hearings';
import { amaAppeal, openHearingAppeal, defaultAssignHearing } from '../../data/appeals';
import { roLocations, roList } from '../../data/regional-offices';

const appealsData = {
  [amaAppeal.externalId]: amaAppeal,
  [openHearingAppeal.externalId]: openHearingAppeal,
};

export const initialState = {
  components: {
    dropdowns: {
      regionalOffices: { options: roList },
      [`hearingLocationsFor${amaAppeal.externalId}At${defaultHearing.regionalOfficeKey}`]: { options: roLocations },
      [`hearingDatesFor${defaultHearing.regionalOfficeKey}`]: { options: hearingDateOptions }
    },
    forms: {
      assignHearing: defaultAssignHearing
    }
  },
  queue: {
    appeals: appealsData,
    appealDetails: appealsData
  }
};

export const queueWrapper = ({ children, ...props }) => (
  <Provider store={createStore(reducer, {
    ...initialState,
    ...props,
    components: {
      ...initialState.components,
      ...props?.components,
      dropdowns: {
        ...initialState.components.dropdowns,
        ...props?.components?.dropdowns,
      },
      forms: {
        ...initialState.components.forms,
        ...props?.components?.forms,
      }
    },
    queue: {
      ...initialState.queue,
      ...props?.queue
    },
  })}>
    <Router>
      {children}
    </Router>
  </Provider>
);

