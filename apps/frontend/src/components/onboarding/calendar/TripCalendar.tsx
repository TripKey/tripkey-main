import './TripCalendar.css';
import { useState } from 'react';

import { ExactCalendar } from './ExactCalendar';
import FlexCalendar from './FlexCalendar';

const TripCalendar = () => {
  const [tab, setTab] = useState<'exact' | 'flexible'>('exact');

  return (
    <div>
      <div className="trip-calendar__tabs">
        <button
          type="button"
          className={`trip-calendar__tab${tab === 'exact' ? ' trip-calendar__tab--active' : ''}`}
          onClick={() => setTab('exact')}
        >
          정확한 날짜
        </button>
        <button
          type="button"
          className={`trip-calendar__tab${tab === 'flexible' ? ' trip-calendar__tab--active' : ''}`}
          onClick={() => setTab('flexible')}
        >
          유연한 날짜
        </button>
      </div>
      {tab === 'exact' ? <ExactCalendar /> : <FlexCalendar />}
    </div>
  );
};

export default TripCalendar;
