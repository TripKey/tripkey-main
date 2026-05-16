import './DestinationDropdown.css';

import { useState, useEffect } from 'react';

import type { Destination } from '../../types/onboarding';
import { searchDestinations } from '../../utils/onboarding-api';
import { useOnboardingStore } from '../../utils/onboarding-store';

const DestinationDropdown = ({ placeholder }: { placeholder?: string }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Destination[]>([]);

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
    if (destinations.includes(destination.name)) return;
    setForm({ destinations: [...destinations, destination.name] });
    setQuery('');
  };

  const handleBlur = () => {
    setTimeout(() => {
      const current = useOnboardingStore.getState().form.destinations;
      if (query.trim().length > 0 && current.length === 0) {
        window.alert('검색 결과에서 도시를 클릭해 선택해 주세요.');
      }
    }, 150);
  };

  return (
    <>
      <input
        type="text"
        placeholder={placeholder ?? '도시 추가...'}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={handleBlur}
      />
      {results.length > 0 && (
        <ul className="destination-dropdown">
          {results.map((item) => (
            <li key={item.place_id} onClick={() => handleSelect(item)}>
              <span>{item.name}</span>
              <span className="destination-dropdown__country">
                {item.country}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
};

export default DestinationDropdown;
