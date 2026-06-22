// MapCard — SCR-05 확정 화면 지도 카드. 활성 Day 카드들을 번호 마커로 표시.
// 좌표 없는 카드는 ConfirmPage에서 걸러진 뒤 markers로 들어온다.
///<reference types="google.maps" />

import {
  AdvancedMarker,
  APIProvider,
  Map,
  Pin,
  useMap,
} from '@vis.gl/react-google-maps';
import { useEffect } from 'react';

import { GOOGLE_MAPS_API_KEY } from '@/utils/constants';

export type MapMarker = {
  id: string;
  order: number;
  name: string;
  lat: number;
  lng: number;
};

type MapCardProps = {
  markers: MapMarker[];
};

// 마커가 하나도 없을 때 보여줄 기본 중심 (도쿄).
const DEFAULT_CENTER = { lat: 35.6812, lng: 139.7671 };

// 마커 변화에 맞춰 지도 영역을 자동으로 맞춘다 (useMap은 <Map> 자식에서만 동작).
const FitBounds = ({ markers }: { markers: MapMarker[] }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || markers.length === 0) return;

    // 마커 1개면 fitBounds가 과하게 확대돼서 중심+고정 줌으로 처리.
    if (markers.length === 1) {
      map.setCenter({ lat: markers[0].lat, lng: markers[0].lng });
      map.setZoom(14);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    markers.forEach((m) => bounds.extend({ lat: m.lat, lng: m.lng }));
    map.fitBounds(bounds, 64); // 64px 패딩
  }, [map, markers]);

  return null;
};

const MapCard = ({ markers }: MapCardProps) => {
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
          mapId="tripkey-confirm-map"
          style={{ width: '100%', height: '360px' }}
        >
          {markers.map((m) => (
            <AdvancedMarker
              key={m.id}
              position={{ lat: m.lat, lng: m.lng }}
              title={m.name}
            >
              <Pin
                background="#7c3aed"
                borderColor="#5b21b6"
                glyphColor="#ffffff"
              >
                {m.order}
              </Pin>
            </AdvancedMarker>
          ))}
          <FitBounds markers={markers} />
        </Map>
      </APIProvider>
    </div>
  );
};

export default MapCard;
