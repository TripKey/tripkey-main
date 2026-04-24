import ToggleSwitch from '../common/ToggleSwitch';

type TravelerCountProps = {
  title: string;
  count: number;
};

const TravelerCount = ({ title, count }: TravelerCountProps) => {
  return (
    <section>
      <section>
        <h2>{title}</h2>

        <div>
          <button type="button">-</button>
          <input type="number" name="travelers-count" value={count} readOnly />
          <span>명</span>
          <button type="button">+</button>
        </div>

        <p>{count}명이 함께 여행을 떠납니다.</p>
      </section>
      <section>
        <h3>예약 현황</h3>

        <div>
          <label>
            <span>항공편 예약 완료</span>
            <ToggleSwitch />
          </label>

          <label>
            <span>숙소 예약 완료</span>
            <ToggleSwitch />
          </label>
        </div>
      </section>
    </section>
  );
};
export default TravelerCount;
