import { Plus, X } from 'lucide-react';
import { useState } from 'react';

import { Input } from '@/components/ui/input';

type Hotel = {
  id: string;
  name: string;
  location: string;
  checkIn: string;
  checkOut: string;
};

const createEmptyHotel = (): Hotel => ({
  id: crypto.randomUUID(),
  name: '',
  location: '',
  checkIn: '',
  checkOut: '',
});

const DumpHotelInfo = () => {
  const [hotels, setHotels] = useState<Hotel[]>([createEmptyHotel()]);

  const handleAdd = () => {
    setHotels((prev) => [...prev, createEmptyHotel()]);
  };

  const handleRemove = (id: string) => {
    setHotels((prev) => prev.filter((hotel) => hotel.id !== id));
  };

  return (
    <div className="flex flex-col gap-3">
      {hotels.map((hotel, index) => (
        <div key={hotel.id} className="rounded-xl border border-gray-200 p-4">
          {/* 상단: 뱃지 + 삭제 버튼 */}
          <div className="flex items-center justify-between mb-3">
            <span className="inline-block rounded-md bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">
              숙소 {index + 1}
            </span>
            {hotels.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemove(hotel.id)}
                className="flex items-center gap-0.5 text-xs text-red-500 hover:text-red-600"
              >
                <X size={14} />
                삭제
              </button>
            )}
          </div>

          {/* 2x2 input grid */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">숙소명</label>
              <Input
                className="h-9 text-sm bg-white"
                placeholder="예: 신주쿠 프린스 호텔"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">위치</label>
              <Input
                className="h-9 text-sm bg-white"
                placeholder="예: 신주쿠역 도보 5분"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">체크인</label>
              <Input
                className="h-9 text-sm bg-white"
                placeholder="예: 5월 10일 15:00"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                체크아웃
              </label>
              <Input
                className="h-9 text-sm bg-white"
                placeholder="예: 5월 12일 11:00"
              />
            </div>
          </div>
        </div>
      ))}

      {/* 숙소 추가 버튼 */}
      <button
        type="button"
        onClick={handleAdd}
        className="flex items-center justify-center gap-1 rounded-xl border border-dashed border-gray-300 py-3 text-sm text-gray-500 hover:bg-gray-50"
      >
        <Plus size={16} />
        숙소 추가
      </button>
    </div>
  );
};

export default DumpHotelInfo;
