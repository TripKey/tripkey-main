// MapCard — SCR-05 확정 화면 지도 카드. 활성 Day 카드들을 번호 마커로 표시.
// 좌표 없는 카드는 ConfirmPage에서 걸러진 뒤 markers로 들어온다.
///<reference types="google.maps" />

import {
  AdvancedMarker,
  APIProvider,
  Map,
  useMap,
} from '@vis.gl/react-google-maps';
import { useEffect, useMemo, useState } from 'react';

import type { CardCategory } from '@/types/grouping-api';
import { GOOGLE_MAPS_API_KEY } from '@/utils/constants';

export type MapMarker = {
  id: string;
  order: number;
  name: string;
  lat: number;
  lng: number;
  category?: CardCategory;
  region?: string;
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

// 장소 마커를 순서대로 잇는 단순 동선 폴리라인 (vis.gl 2D Polyline 미제공 → 직접 생성).
const RoutePolyline = ({ path }: { path: { lat: number; lng: number }[] }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || path.length < 2) return;

    const line = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#7c3aed',
      strokeOpacity: 0.8,
      strokeWeight: 3,
    });
    line.setMap(map);
    return () => line.setMap(null);
  }, [map, path]);

  return null;
};

const MapCard = ({ markers }: MapCardProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  // 동선은 모든 마커를 순서대로 연결 (교통/공항 포함).
  const routePath = useMemo(
    () => markers.map((m) => ({ lat: m.lat, lng: m.lng })),
    [markers]
  );

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
          disableDefaultUI
          zoomControl
          clickableIcons={false}
        >
          {markers.map((m) => {
            const isTransport = m.category === 'transport';
            const isActive = activeId === m.id;
            return (
              <AdvancedMarker
                key={m.id}
                position={{ lat: m.lat, lng: m.lng }}
                title={m.name}
              >
                <div className="relative flex flex-col items-center">
                  {/* 호버 카드 — 핀 위에 떠서 레이아웃에 영향 안 줌 (핀 고정) */}
                  {isActive && (
                    <div className="absolute bottom-full left-1/2 mb-2 flex w-max max-w-50 -translate-x-1/2 items-center gap-2 rounded-xl bg-card px-2.5 py-1.5 shadow-md ring-1 ring-foreground/10">
                      <span
                        aria-hidden="true"
                        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background"
                      >
                        {m.order}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-foreground">
                          {m.name}
                        </p>
                        {m.region && (
                          <p className="truncate text-[10px] text-muted-foreground">
                            {m.region}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 숫자 원형 마커 — 교통(항공편 등)은 ✈, 일반 장소는 순서 번호 */}
                  <div
                    className={`flex size-7 items-center justify-center rounded-full font-bold text-white shadow-md ring-2 ring-white ${
                      isTransport ? 'bg-blue-600' : 'bg-violet-600'
                    }`}
                    onMouseEnter={() => setActiveId(m.id)}
                    onMouseLeave={() =>
                      setActiveId((id) => (id === m.id ? null : id))
                    }
                  >
                    {isTransport ? (
                      <span className="text-base leading-none">✈</span>
                    ) : (
                      <span className="text-xs">{m.order}</span>
                    )}
                  </div>
                </div>
              </AdvancedMarker>
            );
          })}
          <RoutePolyline path={routePath} />
          <FitBounds markers={markers} />
        </Map>
      </APIProvider>
    </div>
  );
};

export default MapCard;
