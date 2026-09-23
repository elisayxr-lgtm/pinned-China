'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { geoIdentity, geoPath } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import provincesData from 'cn-atlas/provinces.json';
import prefecturesData from 'cn-atlas/prefectures.json';
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
  Globe2,
  Map,
  MapPin,
  Plus,
  Route,
  Sparkles,
  Upload,
} from 'lucide-react';
import { TravelMap } from '@/components/travel-map';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type View = 'map' | 'province' | 'city';
type GalleryMode = 'places' | 'timeline';
type ProvinceProperties = {
  地名?: string;
  name?: string;
  id?: string;
  区划码?: string;
};
type StoredTrip = {
  id: string;
  province: string;
  city: string;
  spot: string;
  visitedAt: string;
  story: string;
  summary?: string | null;
  photoUrl: string;
  photos: string[];
  createdAt?: string;
};
type PhotoRef = { src?: string; position?: string };
type Memory = {
  id: string;
  title: string;
  date: string;
  tag: string;
  photos: PhotoRef[];
  photoCount?: number;
  story: string;
  summary?: string | null;
};
type PlaceCover = {
  scope: 'province' | 'city';
  province: string;
  city: string;
  photoUrl: string;
};

const chinaProvinces = provincesData as FeatureCollection<
  Geometry,
  ProvinceProperties
>;
const chinaPrefectures = prefecturesData as FeatureCollection<
  Geometry,
  ProvinceProperties
>;
const DIRECT_REGIONS = new Set([
  '北京',
  '天津',
  '上海',
  '重庆',
  '香港',
  '澳门',
]);
const basePins = [
  {
    name: '北京',
    note: '胡同里的秋日散步',
    coordinates: [116.4074, 39.9042] as [number, number],
    position: '100% 0%',
  },
  {
    name: '上海',
    note: '梧桐树下的春天',
    coordinates: [121.4737, 31.2304] as [number, number],
    position: '0% 100%',
  },
  {
    name: '浙江',
    note: '西湖的薄雾清晨',
    coordinates: [120.1551, 30.2741] as [number, number],
    position: '0% 0%',
  },
];

const demoProvinceCities: Record<string, string[]> = {
  浙江: ['杭州', '宁波', '绍兴'],
};
const demoCityPositions: Record<string, string> = {
  杭州: '0% 0%',
  宁波: '100% 100%',
  绍兴: '100% 0%',
};

const cityMemories: Record<string, Memory[]> = {
  杭州: [
    {
      id: 'demo-hz-1',
      title: '北山街的薄雾',
      date: '2026.04.19',
      tag: '西湖',
      photos: [{ position: '0% 0%' }, { position: '100% 0%' }],
      photoCount: 8,
      story:
        '六点半的西湖还没完全醒来。风把柳条吹到水面，第一艘船慢慢划过，忽然觉得早起这件事也很浪漫。',
    },
    {
      id: 'demo-hz-2',
      title: '龙井村的一杯春茶',
      date: '2026.04.19',
      tag: '龙井村',
      photos: [{ position: '0% 100%' }, { position: '100% 100%' }],
      photoCount: 5,
      story:
        '沿着茶田一路往上，空气都是新叶的味道。坐下喝茶时，时间像被山谷放慢了一点。',
    },
    {
      id: 'demo-hz-3',
      title: '南宋御街的夜晚',
      date: '2026.04.20',
      tag: '清河坊',
      photos: [{ position: '100% 0%' }, { position: '0% 100%' }],
      photoCount: 6,
      story:
        '没有赶景点，只是顺着灯笼和人声慢慢走。旅行里最喜欢的时刻，常常并不在计划表上。',
    },
  ],
  北京: [
    {
      id: 'demo-bj-1',
      title: '北京胡同漫步',
      date: '2026.04.19',
      tag: '北京',
      photos: [{ position: '100% 0%' }, { position: '0% 100%' }],
      photoCount: 2,
      story:
        '沿着胡同慢慢走，把喜欢的街景留在记忆里。',
    },
  ],
  上海: [
    {
      id: 'demo-sh-1',
      title: '梧桐树下的春天',
      date: '2026.03.16',
      tag: '武康路',
      photos: [{ position: '0% 100%' }, { position: '100% 0%' }],
      photoCount: 7,
      story:
        '春日的树影把街道切成一块块光斑。没有目的地，沿着旧洋房一直走，也算是给忙碌生活的一次小小出逃。',
    },
  ],
  宁波: [
    {
      id: 'demo-nb-1',
      title: '港口吹来的风',
      date: '2025.08.09',
      tag: '老外滩',
      photos: [{ position: '100% 100%' }, { position: '0% 0%' }],
      photoCount: 4,
      story: '江边很开阔，晚风把一天的暑气都吹散了。',
    },
  ],
  绍兴: [
    {
      id: 'demo-sx-1',
      title: '桥边的乌篷船',
      date: '2025.05.02',
      tag: '仓桥直街',
      photos: [{ position: '0% 0%' }, { position: '100% 100%' }],
      photoCount: 5,
      story: '船从石桥下穿过去，水声很轻，像一段旧电影。',
    },
  ],
};

function normalizeAreaName(name = '') {
  return name
    .trim()
    .replace(
      /特别行政区|维吾尔自治区|壮族自治区|回族自治区|自治区|自治州|地区|盟|省|市/g,
      '',
    );
}

function memoryPreview(memory: Memory) {
  if (memory.summary?.trim()) return memory.summary.trim();
  const story = memory.story.trim().replace(/\s+/g, ' ');
  const firstSentence = story.match(/^[^。！？!?]*[。！？!?]/u)?.[0] ?? story;
  return Array.from(firstSentence).length <= 100
    ? firstSentence
    : '点开阅读完整旅行感想。';
}

function areaName(feature: Feature<Geometry, ProvinceProperties>) {
  return feature.properties?.地名 ?? feature.properties?.name ?? '';
}

function stretchGeometry(
  feature: Feature<Geometry, ProvinceProperties>,
  factor: number,
  anchor = 35,
) {
  function stretch(value: unknown): unknown {
    if (!Array.isArray(value)) return value;
    if (
      value.length >= 2 &&
      typeof value[0] === 'number' &&
      typeof value[1] === 'number'
    ) {
      return [
        value[0],
        anchor + (value[1] - anchor) * factor,
        ...value.slice(2),
      ];
    }
    return value.map(stretch);
  }
  if (!feature.geometry || !('coordinates' in feature.geometry)) return feature;
  return {
    ...feature,
    geometry: {
      ...feature.geometry,
      coordinates: stretch(feature.geometry.coordinates),
    } as Geometry,
  } as Feature<Geometry, ProvinceProperties>;
}

const stretchedChina = {
  ...chinaProvinces,
  features: chinaProvinces.features.map((feature) =>
    stretchGeometry(feature, 1.22),
  ),
} as FeatureCollection<Geometry, ProvinceProperties>;
const chinaProjection = geoIdentity()
  .reflectY(true)
  .fitExtent(
    [
      [28, 18],
      [972, 622],
    ],
    stretchedChina,
  );
const chinaPath = geoPath(chinaProjection);

function projectLocation(coordinates: [number, number]) {
  const stretched: [number, number] = [
    coordinates[0],
    35 + (coordinates[1] - 35) * 1.22,
  ];
  const projected = chinaProjection(stretched) ?? [500, 320];
  return {
    left: `${(projected[0] / 1000) * 100}%`,
    top: `${(projected[1] / 640) * 100}%`,
  };
}

function provincePosition(name: string) {
  const target = stretchedChina.features.find(
    (feature) =>
      normalizeAreaName(areaName(feature)) === normalizeAreaName(name),
  );
  if (!target) return { left: '50%', top: '50%' };
  const [x, y] = chinaPath.centroid(target);
  return { left: `${(x / 1000) * 100}%`, top: `${(y / 640) * 100}%` };
}

function getProvinceMapData(province: string) {
  const provinceFeature = chinaProvinces.features.find(
    (feature) =>
      normalizeAreaName(areaName(feature)) === normalizeAreaName(province),
  );
  const prefix = String(
    provinceFeature?.properties?.id ??
      provinceFeature?.properties?.区划码 ??
      '',
  ).slice(0, 2);
  const cityFeatures = chinaPrefectures.features.filter((feature) =>
    String(
      feature.properties?.id ?? feature.properties?.区划码 ?? '',
    ).startsWith(prefix) && Boolean(prefix),
  );
  const features =
    cityFeatures.length > 1
      ? cityFeatures
      : provinceFeature
        ? [provinceFeature]
        : [];
  const collection = {
    type: 'FeatureCollection',
    features,
  } as FeatureCollection<Geometry, ProvinceProperties>;
  const projection = geoIdentity()
    .reflectY(true)
    .fitExtent(
      [
        [34, 26],
        [726, 474],
      ],
      collection,
    );
  return { features, path: geoPath(projection) };
}

function coverKey(scope: 'province' | 'city', province: string, city = '') {
  return `${scope}:${normalizeAreaName(province)}:${scope === 'city' ? normalizeAreaName(city) : ''}`;
}

function Photo({
  photo,
  className = '',
}: {
  photo?: PhotoRef;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string>();
  if (photo?.src && failedSrc !== photo.src) return <img className={`travel-photo uploaded-photo ${className}`} src={photo.src} alt="旅行照片" draggable={false} onError={() => setFailedSrc(photo.src)} />;
  return (
    <span
      className={`travel-photo ${photo?.src ? 'uploaded-photo' : ''} ${className}`}
      style={{
        backgroundImage: undefined,
        backgroundPosition: photo?.position ?? '50% 50%',
      }}
    />
  );
}

export default function Home() {
  const [view, setView] = useState<View>('map');
  const [province, setProvince] = useState('浙江');
  const [city, setCity] = useState('杭州');
  const [galleryMode, setGalleryMode] = useState<GalleryMode>('timeline');
  const [routeOpen, setRouteOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saveState, setSaveState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [storedTrips, setStoredTrips] = useState<StoredTrip[]>([]);
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [coverSaving, setCoverSaving] = useState(false);
  const [showMapPhotos, setShowMapPhotos] = useState(true);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    const readTrips = async () => {
      const response = await fetch('/api/trips', { cache: 'no-store' });
      if (!response.ok) throw new Error('记忆');
      const data = await response.json() as { trips?: StoredTrip[] };
      if (active) setStoredTrips(data.trips ?? []);
    };
    const readCovers = async () => {
      const response = await fetch('/api/covers', { cache: 'no-store' });
      if (!response.ok) throw new Error('封面');
      const data = await response.json() as { covers?: PlaceCover[] };
      if (active) setCovers(Object.fromEntries((data.covers ?? []).map((cover) => [coverKey(cover.scope, cover.province, cover.city), cover.photoUrl])));
    };
    void Promise.allSettled([readTrips(), readCovers()]).then((results) => {
      if (active && results.some((result) => result.status === 'rejected')) setNotice('部分记忆或封面暂时未能读取，请刷新重试。已保存的内容不会因此丢失。');
    });
    return () => { active = false; };
  }, []);

  const photoPreviews = useMemo(
    () => selectedFiles.map((file) => URL.createObjectURL(file)),
    [selectedFiles],
  );
  useEffect(
    () => () => photoPreviews.forEach((url) => URL.revokeObjectURL(url)),
    [photoPreviews],
  );

  const memories = useMemo(() => {
    const saved = storedTrips
      .filter(
        (trip) => normalizeAreaName(trip.city) === normalizeAreaName(city) && normalizeAreaName(trip.province) === normalizeAreaName(province),
      )
      .map(
        (trip): Memory => ({
          id: trip.id,
          title: trip.spot,
          date: trip.visitedAt.replaceAll('-', '.'),
          tag: trip.spot,
          story: trip.story,
          summary: trip.summary,
          photos: (trip.photos?.length ? trip.photos : [trip.photoUrl]).map(
            (src) => ({ src }),
          ),
          photoCount: trip.photos?.length || 1,
        }),
      );
    return [...saved, ...(cityMemories[city] ?? [])].sort((a, b) =>
      b.date.localeCompare(a.date),
    );
  }, [city, province, storedTrips]);

  const unlockedPins = useMemo(() => {
    const names = new Set([
      ...basePins.map((pin) => pin.name),
      ...storedTrips.map((trip) => normalizeAreaName(trip.province)),
    ]);
    return [...names].map((name) => {
      const base = basePins.find((pin) => pin.name === name);
      const related = storedTrips.filter(
        (trip) => normalizeAreaName(trip.province) === name,
      );
      return {
        name,
        note: related.length
          ? `${related.length} 段记忆`
          : (base?.note ?? '新解锁的旅行地'),
        position: base?.position ?? '50% 50%',
        coordinates: base?.coordinates,
        src: covers[coverKey('province', name)] ?? related[0]?.photoUrl,
        direct: DIRECT_REGIONS.has(name),
      };
    });
  }, [covers, storedTrips]);

  const provinceCities = useMemo(() => {
    const names = new Set([
      ...(demoProvinceCities[province] ?? []),
      ...storedTrips
        .filter(
          (trip) =>
            normalizeAreaName(trip.province) === normalizeAreaName(province),
        )
        .map((trip) => normalizeAreaName(trip.city)),
    ]);
    const mapData = getProvinceMapData(province);
    return [...names].map((name) => {
      const feature = mapData.features.find(
        (item) => normalizeAreaName(areaName(item)) === name,
      );
      const [x, y] = feature ? mapData.path.centroid(feature) : [380, 250];
      const related = storedTrips.filter(
        (trip) =>
          normalizeAreaName(trip.province) === normalizeAreaName(province) &&
          normalizeAreaName(trip.city) === name,
      );
      return {
        name,
        left: `${(x / 760) * 100}%`,
        top: `${(y / 500) * 100}%`,
        note: `${related.length || cityMemories[name]?.length || 1} 段记忆`,
        position: demoCityPositions[name] ?? '50% 50%',
        src: covers[coverKey('city', province, name)] ?? related[0]?.photoUrl,
      };
    });
  }, [covers, province, storedTrips]);

  const locationLabel =
    view === 'city'
      ? province === city
        ? city
        : `${province} · ${city}`
      : view === 'province'
        ? province
        : '';
  const cityCover =
    covers[
      coverKey(
        DIRECT_REGIONS.has(province) ? 'province' : 'city',
        province,
        city,
      )
    ] ?? memories[0]?.photos[0]?.src;

  function openRegion(name: string, direct: boolean) {
    setProvince(name);
    if (direct) setCity(name);
    setView(direct ? 'city' : 'province');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openCity(name: string) {
    setCity(name);
    setView('city');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goHome() {
    setView('map');
    setRouteOpen(false);
  }

  async function saveTrip(event: { preventDefault: () => void; currentTarget: HTMLFormElement }) {
    event.preventDefault();
    setSaveState('saving');
    try {
      const form = new FormData(event.currentTarget);
      form.delete('photos');
      selectedFiles.forEach((file) => form.append('photos', file));
      const response = await fetch('/api/trips', {
        method: 'POST',
        body: form,
      });
      if (!response.ok) throw new Error('save failed');
      const saved = (await response.json()) as StoredTrip;
      setStoredTrips((current) => [
        saved,
        ...current.filter((trip) => trip.id !== saved.id),
      ]);
      setSaveState('saved');
      setProvince(normalizeAreaName(saved.province));
      setCity(normalizeAreaName(saved.city));
      setView('city');
      window.setTimeout(() => {
        setDialogOpen(false);
        setSaveState('idle');
        setSelectedFiles([]);
      }, 700);
    } catch {
      setSaveState('error');
    }
  }

  async function uploadCover(scope: 'province' | 'city', file?: File) {
    if (!file) return;
    setCoverSaving(true);
    try {
      const form = new FormData();
      form.set('scope', scope);
      form.set('province', province);
      form.set('city', scope === 'city' ? city : '');
      form.set('photo', file);
      const response = await fetch('/api/covers', {
        method: 'POST',
        body: form,
      });
      if (!response.ok) throw new Error('cover failed');
      const cover = (await response.json()) as PlaceCover;
      setCovers((current) => ({
        ...current,
        [coverKey(cover.scope, cover.province, cover.city)]: cover.photoUrl,
      }));
      setNotice('封面已更换，地图上的照片也同步更新了。');
    } catch {
      setNotice('封面未能保存，请选择 10MB 以内的 JPG、PNG 或 WebP 再试一次。');
    } finally {
      setCoverSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {notice && <div className="site-notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="关闭提示">×</button></div>}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 md:px-10 lg:px-14">
          <button
            className="flex items-center gap-3 text-left"
            onClick={goHome}
            aria-label="返回归途首页"
          >
            <span className="grid size-10 rotate-[-3deg] place-items-center rounded-[14px] bg-primary text-primary-foreground shadow-[0_5px_0_#356e92]">
              <Map className="size-5" />
            </span>
            <span>
              <strong className="block font-heading text-xl tracking-[0.16em]">
                归途
              </strong>
              <small className="text-[11px] tracking-[0.12em] text-muted-foreground">
                TRAVEL, PINNED.
              </small>
            </span>
          </button>
          <div className="flex items-center gap-2">
            {view === 'map' && (
              <div
                className="hidden rounded-full border border-border bg-card/80 p-1 shadow-sm sm:flex"
                aria-label="地图范围"
              >
                <button className="map-switch is-active">
                  <Map className="size-4" /> 中国
                </button>
                <button
                  className="map-switch"
                  disabled
                  title="先把中国部分做好"
                >
                  <Globe2 className="size-4" /> 世界 · 稍后
                </button>
              </div>
            )}
            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) {
                  setSelectedFiles([]);
                  setSaveState('idle');
                }
              }}
            >
              <DialogTrigger
                render={
                  <Button className="h-10 rounded-full px-4 shadow-[0_4px_0_#356e92] active:shadow-none" />
                }
              >
                <Plus className="size-4" />{' '}
                <span className="hidden sm:inline">记录旅程</span>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[24px] border border-border bg-card p-6 sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="font-heading text-2xl">
                    钉下一段新记忆
                  </DialogTitle>
                  <DialogDescription>
                    {locationLabel
                      ? `正在记录 ${locationLabel}`
                      : '选择城市，上传照片，再留下一点当时的心情。'}
                  </DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={saveTrip}>
                  {locationLabel && (
                    <div className="location-chip">
                      <MapPin className="size-4" />
                      <span>{locationLabel}</span>
                      <small>地点已自动带入</small>
                    </div>
                  )}
                  <label className="form-field">
                    <span>照片</span>
                    <span className="upload-field">
                      <Upload className="size-5" />
                      <span>
                        {selectedFiles.length
                          ? `已选择 ${selectedFiles.length} 张照片`
                          : '选择多张照片'}
                      </span>
                      <small>最多 20 张；第一张将作为初始封面</small>
                      <Input
                        name="photos"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        required
                        onChange={(event) =>
                          setSelectedFiles(
                            Array.from(event.target.files ?? []).slice(0, 20),
                          )
                        }
                      />
                    </span>
                  </label>
                  {photoPreviews.length > 0 && (
                    <div className="upload-previews">
                      {photoPreviews.slice(0, 6).map((url, index) => (
                        <span
                          key={url}
                          className={index === 0 ? 'is-cover' : ''}
                        >
                          <img src={url} alt={`待上传照片 ${index + 1}`} />
                          {index === 0 && <b>封面</b>}
                          {index === 5 && photoPreviews.length > 6 && (
                            <i>+{photoPreviews.length - 6}</i>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                  {view === 'map' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <label className="form-field">
                        <span>省份 / 地区</span>
                        <Input
                          name="province"
                          placeholder="例如：浙江"
                          required
                        />
                      </label>
                      <label className="form-field">
                        <span>城市</span>
                        <Input name="city" placeholder="例如：杭州" required />
                      </label>
                    </div>
                  ) : view === 'province' ? (
                    <>
                      <input type="hidden" name="province" value={province} />
                      <label className="form-field">
                        <span>城市</span>
                        <Input name="city" placeholder="例如：杭州" required />
                      </label>
                    </>
                  ) : (
                    <>
                      <input type="hidden" name="province" value={province} />
                      <input type="hidden" name="city" value={city} />
                    </>
                  )}
                  <label className="form-field">
                    <span>景点</span>
                    <Input name="spot" placeholder="例如：北山街" required />
                  </label>
                  <label className="form-field">
                    <span>日期</span>
                    <Input name="visitedAt" type="date" required />
                  </label>
                  <label className="form-field">
                    <span>一句话总结（可选 · 100 字以内）</span>
                    <Input name="summary" maxLength={100} placeholder="用一句话记住这次旅行" />
                  </label>
                  <label className="form-field">
                    <span>旅行感想</span>
                    <Textarea
                      name="story"
                      className="min-h-28"
                      placeholder="那天发生了什么，让你一直记得？"
                      required
                    />
                  </label>
                  {saveState === 'error' && (
                    <p className="text-sm text-destructive">
                      刚刚没有保存成功，请再试一次。
                    </p>
                  )}
                  {saveState === 'saved' && (
                    <p className="flex items-center gap-2 text-sm text-primary">
                      <Check className="size-4" />{' '}
                      已经钉在地图上，并显示在当前城市啦
                    </p>
                  )}
                  <DialogFooter className="mx-0 -mb-1 border-0 bg-transparent p-0">
                    <DialogClose
                      render={<Button variant="ghost" type="button" />}
                    >
                      暂时不记
                    </DialogClose>
                    <Button
                      type="submit"
                      className="h-10 px-5"
                      disabled={saveState === 'saving' || saveState === 'saved'}
                    >
                      {saveState === 'saving' ? '正在保存…' : '钉在地图上'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {view === 'map' && (
        <section className="mx-auto max-w-[1500px] px-3 pb-10 pt-4 md:px-7 lg:px-10">
          <div className="felt-board relative min-h-[760px] overflow-hidden rounded-[34px] px-4 pb-10 pt-7 shadow-[0_24px_70px_rgba(62,53,35,.16),inset_0_0_0_1px_rgba(255,255,255,.2)] md:px-9 lg:min-h-[850px] lg:px-12">
            <div className="relative z-20 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="eyebrow-note">
                  <Sparkles className="size-3.5" /> 把走过的路，轻轻钉在这里
                </div>
                <h1 className="font-heading text-4xl font-semibold leading-tight tracking-tight text-[#244861] md:text-6xl">
                  我的旅行地图
                </h1>
                <p className="mt-3 max-w-lg text-sm leading-6 text-[#486b83] md:text-base">
                  已解锁 {unlockedPins.length} 个省级地区 · 保存{' '}
                  {storedTrips.length} 段真实记忆
                </p>
              </div>
              <div className="flex w-fit items-center gap-1 rounded-2xl bg-white/45 p-1.5 text-xs text-[#486b83] backdrop-blur-sm sm:hidden">
                <button className="map-switch is-active">中国</button>
                <button className="map-switch" disabled>
                  世界 · 稍后
                </button>
              </div>
            </div>
            <TravelMap aspect={1000 / 640} showPhotos={showMapPhotos} onTogglePhotos={() => setShowMapPhotos((value) => !value)}
              labels={stretchedChina.features.map((feature) => { const [x, y] = chinaPath.centroid(feature); return { name: normalizeAreaName(areaName(feature)), x: x / 1000, y: y / 640 }; })}
              pins={unlockedPins.map((pin) => {
                const location = pin.coordinates ? projectLocation(pin.coordinates) : provincePosition(pin.name);
                return { name: pin.name, x: parseFloat(location.left) / 100, y: parseFloat(location.top) / 100,
                  photo: <Photo photo={pin.src ? { src: pin.src } : { position: pin.position }} />,
                  onOpen: () => openRegion(pin.name, pin.direct) };
              })}>
              <ChinaMap unlocked={new Set(unlockedPins.map((pin) => pin.name))} />
            </TravelMap>
            <div className="board-hint">
              <Camera className="size-4" /> 点照片重温旅行；隐藏照片后也可以点大头针
            </div>
          </div>
        </section>
      )}

      {view === 'province' && (
        <section className="mx-auto max-w-[1240px] px-4 pb-12 pt-5 md:px-8">
          <Breadcrumb onHome={goHome} label={province} />
          <div className="province-board relative mt-4 min-h-[720px] overflow-hidden rounded-[32px] px-6 py-8 shadow-[0_20px_60px_rgba(78,63,40,.13)] md:px-12">
            <div className="relative z-20 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-[.16em] text-[#749bc2]">
                  沿着照片，继续往里走
                </p>
                <h1 className="mt-2 font-heading text-4xl text-[#244861] md:text-5xl">
                  {province} · 城市地图
                </h1>
                <p className="mt-3 text-sm text-[#486b83]">
                  {provinceCities.length} 座城市，等待你重温沿途的记忆。
                </p>
              </div>
              <CoverUpload
                label={coverSaving ? '正在更换…' : '更换省封面'}
                disabled={coverSaving}
                onChange={(file) => void uploadCover('province', file)}
              />
            </div>
            <TravelMap key={province} aspect={760 / 500} showPhotos={showMapPhotos} onTogglePhotos={() => setShowMapPhotos((value) => !value)}
              labels={getProvinceMapData(province).features.map((feature) => { const [x, y] = getProvinceMapData(province).path.centroid(feature); return { name: normalizeAreaName(areaName(feature)), x: x / 760, y: y / 500 }; })}
              pins={provinceCities.map((pin) => ({ name: pin.name, x: parseFloat(pin.left) / 100, y: parseFloat(pin.top) / 100,
                photo: <Photo photo={pin.src ? { src: pin.src } : { position: pin.position }} />,
                onOpen: () => openCity(pin.name) }))}>
              <ProvinceMap province={province} unlocked={new Set(provinceCities.map((pin) => pin.name))} />
            </TravelMap>
            <p className="board-hint brown">
              <MapPin className="size-4" />{' '}
              新城市保存第一段记忆后，会自动在这里解锁
            </p>
          </div>
        </section>
      )}

      {view === 'city' && (
        <section className="mx-auto max-w-[1180px] px-5 pb-20 pt-5 md:px-8">
          <Breadcrumb
            onHome={goHome}
            label={province}
            city={city}
            onProvince={
              !DIRECT_REGIONS.has(province)
                ? () => setView('province')
                : undefined
            }
          />
          <div className="gallery-header mt-5 overflow-hidden rounded-[30px]">
            <div className="relative z-10 max-w-2xl p-7 md:p-12">
              <p className="text-xs font-semibold tracking-[.18em] text-[#749bc2]">
                CITY MEMORY HALL
              </p>
              <h1 className="mt-2 font-heading text-5xl text-[#244861] md:text-7xl">
                {city}
              </h1>
              <p className="mt-4 max-w-md leading-7 text-[#486b83]">
                把到过的景点、偶然遇见的风景，还有当时没说出口的话，留在同一间展厅里。
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button
                  className="h-10 rounded-full px-5"
                  onClick={() => setDialogOpen(true)}
                >
                  <Plus /> 添加一段记忆
                </Button>
                <Button
                  variant="outline"
                  className="h-10 rounded-full border-[#b4ccdc] bg-[#fffbde]/70 px-5"
                  onClick={() => setRouteOpen((open) => !open)}
                >
                  <Route /> {routeOpen ? '收起说明' : '了解足迹记录'}
                </Button>
                <CoverUpload
                  label={coverSaving ? '正在更换…' : '更换地图封面'}
                  disabled={coverSaving}
                  onChange={(file) =>
                    void uploadCover(
                      DIRECT_REGIONS.has(province) ? 'province' : 'city',
                      file,
                    )
                  }
                />
              </div>
            </div>
            <div className="gallery-cover">
              <Photo
                photo={cityCover ? { src: cityCover } : memories[0]?.photos[0]}
              />
            </div>
          </div>
          {routeOpen && (
            <div className="route-card mt-6 rounded-[24px] p-5 md:p-7">
              <div className="flex items-center gap-2 font-heading text-xl"><Route className="size-5 text-primary" /> 足迹记录还未开启</div>
              <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">现在保存的是景点、日期、照片和旅行感想，还没有记录你实际走过的 GPS 轨迹。之前显示的站点和距离只是演示，不是你的真实足迹，因此已移除。</p>
              <p className="mt-2 max-w-3xl leading-7 text-muted-foreground">未来的「回放足迹」会以某次旅程为单位，重现你实际经过的路线；它不会根据景点名称猜测或规划路线。接入轨迹记录或导入后，才能准确呈现。</p>
            </div>
          )}
          <Tabs
            value={galleryMode}
            onValueChange={(value) => setGalleryMode(value as GalleryMode)}
            className="mt-10"
          >
            <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[.15em] text-muted-foreground">
                  TRAVEL NOTES
                </p>
                <h2 className="mt-1 font-heading text-3xl">沿途记忆</h2>
              </div>
              <TabsList className="h-10 rounded-full bg-[#e4eff5] p-1">
                <TabsTrigger value="places" className="h-8 rounded-full px-4">
                  <MapPin /> 按景点
                </TabsTrigger>
                <TabsTrigger value="timeline" className="h-8 rounded-full px-4">
                  <CalendarDays /> 时间线
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="places" className="mt-6">
              {memories.length ? (
                <div className="memory-grid">
                  {memories.map((memory, index) => (
                    <MemoryCard key={memory.id} memory={memory} index={index} />
                  ))}
                </div>
              ) : (
                <EmptyMemories />
              )}
            </TabsContent>
            <TabsContent value="timeline" className="mt-6">
              {memories.length ? (
                <div className="timeline">
                  {memories.map((memory, index) => (
                    <TimelineItem
                      key={memory.id}
                      memory={memory}
                      index={index}
                    />
                  ))}
                </div>
              ) : (
                <EmptyMemories />
              )}
            </TabsContent>
          </Tabs>
        </section>
      )}
    </main>
  );
}

function ChinaMap({ unlocked }: { unlocked: Set<string> }) {
  return (
    <svg
      className="absolute inset-0 h-full w-full drop-shadow-[0_12px_0_rgba(48,90,78,.12)]"
      viewBox="0 0 1000 640"
      aria-label="包含省级边界和港澳台的中国地图"
    >
      <g className="china-provinces">
        {stretchedChina.features.map((feature) => {
          const name = areaName(feature);
          return (
            <g key={feature.properties?.id ?? name}>
              <path
                d={chinaPath(feature) ?? ''}
                fill="#FFFBDE"
                fillOpacity={unlocked.has(normalizeAreaName(name)) ? 1 : 0.38}
              />
            </g>
          );
        })}
      </g>
      <g className="south-sea-inset" aria-label="南海诸岛示意">
        <rect x="865" y="452" width="105" height="150" rx="9" />
        <path d="M895 475q18 17 8 37t14 32q12 13 1 29M932 487q-14 17-4 34t-4 30" />
        <circle cx="892" cy="498" r="2.4" />
        <circle cx="918" cy="522" r="2.2" />
        <circle cx="910" cy="554" r="2" />
        <circle cx="937" cy="506" r="2.2" />
        <circle cx="930" cy="557" r="2.1" />
        <text x="918" y="586">
          南海诸岛
        </text>
      </g>
    </svg>
  );
}

function ProvinceMap({ province, unlocked }: { province: string; unlocked: Set<string> }) {
  const mapData = getProvinceMapData(province);
  return (
    <svg
      className="absolute inset-0 h-full w-full drop-shadow-[0_12px_0_rgba(132,88,48,.1)]"
      viewBox="0 0 760 500"
      aria-label={`${province}地级市地图`}
    >
      <g className="province-cities">
        {mapData.features.map((feature) => {
          const name = areaName(feature);
          return (
            <g key={feature.properties?.id ?? name}>
              <path
                d={mapData.path(feature) ?? ''}
                fill="#FFFBDE"
                fillOpacity={unlocked.has(normalizeAreaName(name)) ? 1 : 0.38}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function CoverUpload({
  label,
  disabled,
  onChange,
}: {
  label: string;
  disabled: boolean;
  onChange: (file?: File) => void;
}) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.files?.[0]);
    event.target.value = '';
  }
  return (
    <label className={`cover-upload ${disabled ? 'is-disabled' : ''}`}>
      <Camera className="size-4" />
      <span>{label}</span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled}
        onChange={handleChange}
      />
    </label>
  );
}

function MemoryPhotos({ memory }: { memory: Memory }) {
  const remaining = Math.max(memory.photos.length - 2, 0);
  const second = memory.photos[1];
  return <div className={`memory-media ${second ? 'has-second' : ''}`}>
    <Photo photo={memory.photos[0]} className="memory-main-photo" />
    {second && <span className={`memory-second-photo ${remaining > 0 ? 'has-more' : ''}`}><Photo photo={second} />{remaining > 0 && <span className="more-count">+{remaining}</span>}</span>}
  </div>;
}

function MemoryExhibit({ memory, children, className }: { memory: Memory; children: ReactNode; className: string }) {
  const [open, setOpen] = useState(false);
  const [activePhoto, setActivePhoto] = useState<number | null>(null);
  const total = memory.photos.length;
  const move = (direction: number) => setActivePhoto((index) => index === null ? null : (index + direction + total) % total);
  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) setActivePhoto(null); }}>
      <DialogTrigger render={<button type="button" className={className} aria-label={`打开记忆：${memory.title}`} />}>{children}</DialogTrigger>
      <DialogContent className="memory-exhibit" showCloseButton={false}>
        <div className="exhibit-copy">
          <p className="exhibit-eyebrow">沿途记忆 / {memory.date}</p>
          <DialogTitle className="exhibit-title">{memory.title}</DialogTitle>
          <DialogDescription className="exhibit-description">{memory.story}</DialogDescription>
          <p className="exhibit-meta"><MapPin size={15} />{memory.tag} · {total} 张照片</p>
          <p className="exhibit-tip">点一张照片，慢慢看。</p>
        </div>
        <div className={`exhibit-grid ${total === 1 ? 'is-single' : total <= 12 ? 'is-compact' : ''}`} style={total > 1 && total <= 12 ? { gridTemplateColumns: `repeat(${total <= 4 ? 2 : 3}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${Math.ceil(total / (total <= 4 ? 2 : 3))}, minmax(0, 1fr))` } : undefined} aria-label="记忆照片墙">
          {memory.photos.map((photo, index) => <button key={index} type="button" onClick={() => setActivePhoto(index)} aria-label={`放大第 ${index + 1} 张照片`}>
            <Photo photo={photo} /><span>{String(index + 1).padStart(2, '0')}</span>
          </button>)}
        </div>
        <DialogClose className="exhibit-close" aria-label="关闭记忆"><X size={22} /></DialogClose>
        <Dialog open={activePhoto !== null} onOpenChange={(value) => { if (!value) setActivePhoto(null); }}>
          <DialogContent className="photo-lightbox" showCloseButton={false}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
              if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
            }}>
            <DialogTitle className="sr-only">{memory.title} · 大图浏览</DialogTitle>
            <DialogDescription className="sr-only">左右箭头切换照片，Escape 返回照片墙。</DialogDescription>
            <div className="lightbox-top"><span>{memory.title}</span><DialogClose aria-label="返回照片墙"><X size={24} /></DialogClose></div>
            {activePhoto !== null && <div className="lightbox-image"><Photo photo={memory.photos[activePhoto]} /></div>}
            {total > 1 && <><button type="button" className="lightbox-prev" onClick={() => move(-1)} aria-label="上一张照片"><ChevronLeft size={32} /></button><button type="button" className="lightbox-next" onClick={() => move(1)} aria-label="下一张照片"><ChevronRight size={32} /></button></>}
            <div className="lightbox-bottom"><span aria-live="polite">{(activePhoto ?? 0) + 1} / {total}</span><span>← → 切换 · Esc 返回照片墙</span></div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

function MemoryCard({ memory, index }: { memory: Memory; index: number }) {
  return <MemoryExhibit memory={memory} className={`memory-card text-left ${index === 0 ? 'featured' : ''}`}>
    <div className="memory-image"><MemoryPhotos memory={memory} /></div>
    <div className="p-5 md:p-6">
      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground"><span>{memory.tag}</span><time>{memory.date}</time></div>
      <h3 className="mt-4 font-heading text-2xl">{memory.title}</h3>
      <p className="mt-3 leading-7 text-[#486b83]">{memoryPreview(memory)}</p>
    </div>
  </MemoryExhibit>;
}

function TimelineItem({ memory, index }: { memory: Memory; index: number }) {
  return <MemoryExhibit memory={memory} className="timeline-item w-full text-left">
    <div className="timeline-dot">{index + 1}</div>
    <div className="timeline-photo"><MemoryPhotos memory={memory} /></div>
    <div>
      <time className="text-sm tracking-[.1em] text-[#749bc2]">{memory.date}</time>
      <h3 className="mt-1 font-heading text-2xl">{memory.title}</h3>
      <p className="mt-2 max-w-xl leading-7 text-muted-foreground">{memoryPreview(memory)}</p>
    </div>
  </MemoryExhibit>;
}

function EmptyMemories() {
  return (
    <div className="empty-memories">
      <Camera className="size-6" />
      <strong>这座城市还没有照片</strong>
      <span>保存第一段记忆后，它会立刻出现在这里。</span>
    </div>
  );
}

function Breadcrumb({
  onHome,
  label,
  city,
  onProvince,
}: {
  onHome: () => void;
  label: string;
  city?: string;
  onProvince?: () => void;
}) {
  return (
    <nav
      className="flex items-center gap-2 text-sm text-muted-foreground"
      aria-label="页面路径"
    >
      <button
        onClick={onHome}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> 旅行地图
      </button>
      <ChevronRight className="size-3" />
      <button
        onClick={onProvince}
        disabled={!onProvince}
        className={onProvince ? 'hover:text-foreground' : 'text-foreground'}
      >
        {label}
      </button>
      {city && (
        <>
          <ChevronRight className="size-3" />
          <span className="text-foreground">{city}</span>
        </>
      )}
    </nav>
  );
}
