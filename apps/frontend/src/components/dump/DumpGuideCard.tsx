import { ChevronDown, Home, Plane } from 'lucide-react';
import { useState } from 'react';

import './DumpGuideCard.css';

const DumpGuideCard = () => {
  const [openFlight, setOpenFlight] = useState(false);
  const [openReservation, setOpenReservation] = useState(false);

  return (
    <div className="dump-guide-card">
      <h2 className="dump-guide-title">보조 정보 (선택)</h2>

      <div className="dump-guide-list">
        <button
          type="button"
          className="dump-guide-item"
          onClick={() => setOpenFlight((prev) => !prev)}
        >
          <span className="dump-guide-item__icon dump-guide-item__icon--flight">
            <Plane size={16} />
          </span>
          <span className="dump-guide-item__label">
            항공편 정보{' '}
            <span className="dump-guide-item__optional">(선택)</span>
          </span>
          <ChevronDown
            className="dump-guide-item__chevron"
            data-open={openFlight}
            size={18}
          />
        </button>
        {openFlight && (
          <div className="dump-guide-item__content">
            {/* 항공편 정보 입력 영역 */}
          </div>
        )}

        <button
          type="button"
          className="dump-guide-item"
          onClick={() => setOpenReservation((prev) => !prev)}
        >
          <span className="dump-guide-item__icon dump-guide-item__icon--reservation">
            <Home size={16} />
          </span>
          <span className="dump-guide-item__label">
            숙박 정보 <span className="dump-guide-item__optional">(선택)</span>
          </span>
          <ChevronDown
            className="dump-guide-item__chevron"
            data-open={openReservation}
            size={18}
          />
        </button>
        {openReservation && (
          <div className="dump-guide-item__content">
            {/* 숙박 정보 입력 영역 */}
          </div>
        )}
      </div>
    </div>
  );
};

export default DumpGuideCard;
