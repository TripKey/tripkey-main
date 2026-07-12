import './DestinationDropdown.css';

import { useState, useEffect } from 'react';

import { RECOMMENDED_DESTINATIONS } from '../../dev-fixtures/allowed-destinations';
import type { Destination } from '../../types/onboarding';
import { searchDestinations } from '../../utils/onboarding-api';
import { useOnboardingStore } from '../../utils/onboarding-store';

const DestinationDropdown = ({ placeholder }: { placeholder?: string }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Destination[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const setForm = useOnboardingStore((s) => s.actions.setForm);
  const destinations = useOnboardingStore((s) => s.form.destinations);

  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const data = await searchDestinations(query);
        setResults(data.results);
      } catch {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (destination: Destination) => {
    setForm({ destinations: [destination.name] });
    setQuery('');
    setShowHint(false);
  };

  const handleBlur = () => {
    // 드롭다운 항목 클릭 시 onMouseDown preventDefault 로 blur가 미뤄지므로,
    // 여기까지 도달했다는 건 사용자가 선택 없이 input 밖을 눌렀다는 뜻.
    setIsFocused(false);
    if (query.trim().length > 0 && destinations.length === 0) {
      setShowHint(true);
    }
  };

  const handleChange = (value: string) => {
    setQuery(value);
    if (showHint) setShowHint(false);
  };

  return (
    <>
      <input
        type="text"
        placeholder={placeholder ?? '도시 추가...'}
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        onFocus={() => setIsFocused(true)}
      />
      {results.length > 0 ? (
        <ul className="destination-dropdown">
          {results.map((item) => (
            <li
              key={item.place_id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(item)}
            >
              <span>{item.name}</span>
              <span className="destination-dropdown__country">
                {item.country}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        isFocused &&
        query.trim().length === 0 && (
          <ul className="destination-dropdown">
            {RECOMMENDED_DESTINATIONS.filter(
              (c) => !destinations.includes(c.name)
            ) // 이미 선택한 건 제외
              .map((c) => (
                <li
                  key={c.name}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() =>
                    handleSelect({
                      name: c.name,
                      country: c.country,
                      place_id: c.name,
                    })
                  }
                >
                  <span>{c.name}</span>
                  <span className="destination-dropdown__country">
                    {c.country}
                  </span>
                </li>
              ))}
          </ul>
        )
      )}
      {showHint && (
        <p className="destination-dropdown__hint" role="status">
          검색 결과에서 도시를 클릭해 선택해 주세요.
        </p>
      )}
    </>
  );
};

export default DestinationDropdown;
