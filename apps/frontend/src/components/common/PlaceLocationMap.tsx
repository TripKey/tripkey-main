// PlaceLocationMap — 단일 장소 위치용 지도. 카드 상세 패널에서 좌표 하나를 핀으로 표시.
// 확정 화면 MapCard와 동일한 라이브러리(@vis.gl/react-google-maps)·API 키를 쓰되,
// 순서 번호·동선 없이 핀 하나만 두는 경량 버전.
import { APIProvider, AdvancedMarker, Map } from '@vis.gl/react-google-maps';
import { MapPin } from 'lucide-react';

import { GOOGLE_MAPS_API_KEY } from '@/utils/constants';

type PlaceLocationMapProps = {
  lat: number;
  lng: number;
  name?: string;
};

const PlaceLocationMap = ({ lat, lng, name }: PlaceLocationMapProps) => {
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex h-44 items-center justify-center rounded-xl bg-muted text-xs text-muted-foreground">
        지도 API 키가 설정되지 않았어요.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <Map
          defaultCenter={{ lat, lng }}
          defaultZoom={15}
          gestureHandling="cooperative"
          mapId="tripkey-place-map"
          style={{ width: '100%', height: '176px' }}
          disableDefaultUI
          zoomControl
          clickableIcons={false}
        >
          <AdvancedMarker position={{ lat, lng }} title={name}>
            <div className="flex size-7 items-center justify-center rounded-full bg-violet-600 text-white shadow-md ring-2 ring-white">
              <MapPin className="size-4" aria-hidden="true" />
            </div>
          </AdvancedMarker>
        </Map>
      </APIProvider>
    </div>
  );
};

export default PlaceLocationMap;
