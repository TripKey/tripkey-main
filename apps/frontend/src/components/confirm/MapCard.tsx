// MapCard — SCR-05 확정 화면 지도 카드. 활성 Day 카드들을 지도에 표시.
// 좌표 마커는 4단계에서 연결 — 지금은 기본 지도 렌더만.

import { APIProvider, Map } from '@vis.gl/react-google-maps';

import { GOOGLE_MAPS_API_KEY } from '@/utils/constants';

// type MapCardProps = {
//   // 추후 마커용 — 좌표 plumbing(3단계) 후 채워짐
//   // markers?: { id: string; order: number; lat: number; lng: number }[];
// };

// 좌표가 하나도 없을 때 보여줄 기본 중심 (도쿄). destination 좌표가 생기면 교체.
const DEFAULT_CENTER = { lat: 35.6812, lng: 139.7671 };

const MapCard = () => {
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="rounded-2xl bg-card p-6 text-center text-xs text-muted-foreground ring-1 ring-foreground/10">
        지도 API 키가 설정되지 않았어요.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-foreground/10">
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <Map
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={11}
          gestureHandling="cooperative"
          disableDefaultUI={false}
          mapId="tripkey-confirm-map"
          style={{ width: '100%', height: '360px' }}
        />
      </APIProvider>
    </div>
  );
};

export default MapCard;
