'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapProps {
    className?: string;
}

interface PreschoolData {
    id: number;
    name: string;
    stats: Array<{
        kind: 'waiting' | 'children' | 'acceptance';
        target_date: string;
        zero_year_old: number;
        one_year_old: number;
        two_year_old: number;
        three_year_old: number;
        four_year_old: number;
        five_year_old: number;
    }>;
    coordinates: [number, number];
}

interface GeoJSONFeature {
    type: 'Feature';
    properties: {
        id: number;
        name: string;
        stats: Array<{
            kind: 'waiting' | 'children' | 'acceptance';
            target_date: string;
            zero_year_old: number;
            one_year_old: number;
            two_year_old: number;
            three_year_old: number;
            four_year_old: number;
            five_year_old: number;
        }>;
    };
    geometry: {
        type: 'Point';
        coordinates: [number, number];
    };
}

interface GeoJSONData {
    type: 'FeatureCollection';
    features: GeoJSONFeature[];
}

interface AgeFilter {
    ageClass: string;
    minAvailableCount: number;
}

interface FilterOptions {
    searchQuery: string;
    ageFilters: AgeFilter[];
}

// データキャッシュ用の型
interface CachedData {
    data: GeoJSONData;
    timestamp: number;
}

// データキャッシュ（メモリ内）
const dataCache: { [key: string]: CachedData } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5分間キャッシュ

async function fetchDataFromAPI(area: string): Promise<GeoJSONData> {
    try {
        console.log(`APIからデータを取得中: ${area}`);
        const response = await fetch(`http://54.199.84.59/preschool/stats?area=${encodeURIComponent(area)}`);
        console.log('APIレスポンス:', response.status, response.statusText);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('APIから取得したデータ:', data);
        return data;
    } catch (error) {
        console.error(`APIからのデータ取得に失敗しました (${area}):`, error);
        throw error;
    }
}

async function fetchData(area: string): Promise<GeoJSONData> {
    // キャッシュをチェック
    const cached = dataCache[area];
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        console.log(`キャッシュからデータを取得: ${area}`);
        return cached.data;
    }

    try {
        console.log(`APIからデータを取得: ${area}`);
        const data = await fetchDataFromAPI(area);
        
        // キャッシュに保存
        dataCache[area] = {
            data,
            timestamp: now
        };
        
        return data;
    } catch (error) {
        console.error(`データの取得に失敗しました (${area}):`, error);
        throw error;
    }
}

export default function Map({ className = '' }: MapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const [allGeoJSONData, setAllGeoJSONData] = useState<GeoJSONData | null>(null);
    const [filteredGeoJSONData, setFilteredGeoJSONData] = useState<GeoJSONData | null>(null);
    const [filters, setFilters] = useState<FilterOptions>({
        searchQuery: '',
        ageFilters: []
    });
    const [selectedPreschool, setSelectedPreschool] = useState<PreschoolData | null>(null);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [viewportHeight, setViewportHeight] = useState('100vh');
    const [isLoading, setIsLoading] = useState(true);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [apiError, setApiError] = useState<string | null>(null);
    const [selectedWard, setSelectedWard] = useState<string | null>(null);
    const [isWardPanelOpen, setIsWardPanelOpen] = useState(true); // 初期状態で区別パネルを表示

    // 区別の座標範囲を取得する関数
    const getDistrictBounds = useCallback((district: string) => {
        const districts = [
            { name: '鶴見区',   bounds: { minLng: 139.65, maxLng: 139.75, minLat: 35.50, maxLat: 35.55 } },
            { name: '神奈川区', bounds: { minLng: 139.62, maxLng: 139.70, minLat: 35.45, maxLat: 35.50 } },
            { name: '西区',     bounds: { minLng: 139.61, maxLng: 139.65, minLat: 35.45, maxLat: 35.50 } },
            { name: '中区',     bounds: { minLng: 139.63, maxLng: 139.70, minLat: 35.44, maxLat: 35.48 } },
            { name: '南区',     bounds: { minLng: 139.62, maxLng: 139.70, minLat: 35.40, maxLat: 35.45 } },
            { name: '港北区',   bounds: { minLng: 139.55, maxLng: 139.65, minLat: 35.50, maxLat: 35.60 } },
            { name: '都筑区',   bounds: { minLng: 139.55, maxLng: 139.65, minLat: 35.55, maxLat: 35.65 } },
            { name: '青葉区',   bounds: { minLng: 139.45, maxLng: 139.55, minLat: 35.55, maxLat: 35.65 } },
            { name: '緑区',     bounds: { minLng: 139.40, maxLng: 139.50, minLat: 35.50, maxLat: 35.60 } },
            { name: '旭区',     bounds: { minLng: 139.52, maxLng: 139.62, minLat: 35.45, maxLat: 35.55 } },
            { name: '瀬谷区',   bounds: { minLng: 139.40, maxLng: 139.50, minLat: 35.40, maxLat: 35.50 } },
            { name: '泉区',     bounds: { minLng: 139.45, maxLng: 139.55, minLat: 35.35, maxLat: 35.45 } },
            { name: '戸塚区',   bounds: { minLng: 139.40, maxLng: 139.55, minLat: 35.35, maxLat: 35.45 } },
            { name: '栄区',     bounds: { minLng: 139.40, maxLng: 139.50, minLat: 35.30, maxLat: 35.40 } },
            { name: '港南区',   bounds: { minLng: 139.60, maxLng: 139.70, minLat: 35.35, maxLat: 35.45 } },
            { name: '保土ケ谷区',bounds: { minLng:139.57, maxLng:139.65, minLat:35.40, maxLat:35.50 } },
            { name: '金沢区',   bounds: { minLng: 139.60, maxLng: 139.75, minLat: 35.25, maxLat: 35.35 } },
            { name: '磯子区',   bounds: { minLng: 139.60, maxLng: 139.70, minLat: 35.30, maxLat: 35.40 } }
        ];

        const foundDistrict = districts.find(d => d.name === district);
        if (!foundDistrict) return null;

        return [
            [foundDistrict.bounds.minLng, foundDistrict.bounds.minLat],
            [foundDistrict.bounds.maxLng, foundDistrict.bounds.maxLat]
        ] as [[number, number], [number, number]];
    }, []);

    // 選択された区に地図を移動する関数
    const moveToDistrict = useCallback((district: string) => {
        if (!map.current) return;

        const bounds = getDistrictBounds(district);
        if (bounds) {
            map.current.fitBounds(bounds, {
                padding: 50,
                maxZoom: 16
            });
        }
    }, [getDistrictBounds]);

    const loadData = useCallback(async () => {
        // 初期データとして横浜市全体のデータを取得（フォールバック用）
        try {
            setIsLoading(true);
            setApiError(null);
            console.log('データを取得中...');
            const geoJSONData = await fetchData('横浜市');
            console.log('取得したデータ:', geoJSONData);
            console.log('フィーチャー数:', geoJSONData.features.length);
            setAllGeoJSONData(geoJSONData);
            setFilteredGeoJSONData(geoJSONData);
        } catch (error) {
            console.error('初期データの取得に失敗しました:', error);
            setApiError('データの取得に失敗しました。ページを再読み込みしてください。');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 区別のデータを取得する関数
    const loadDataForWard = useCallback(async (ward: string) => {
        try {
            setIsLoading(true);
            setApiError(null);
            console.log(`区別データを取得中: ${ward}`);
            const geoJSONData = await fetchData(ward);
            console.log('取得した区別データ:', geoJSONData);
            console.log('フィーチャー数:', geoJSONData.features.length);
            
            // 区別データを直接設定
            setAllGeoJSONData(geoJSONData);
            setFilteredGeoJSONData(geoJSONData);
        } catch (error) {
            console.error(`区別データの取得に失敗しました (${ward}):`, error);
            setApiError(`${ward}のデータ取得に失敗しました。しばらくしてから再試行してください。`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const applyFilters = useCallback((geoJSONData: GeoJSONData, filterOptions: FilterOptions) => {
        const filteredFeatures = geoJSONData.features.filter(feature => {
            // statsが文字列（JSON）の場合はパース
            let stats = [];
            if (typeof feature.properties.stats === 'string') {
                try {
                    stats = JSON.parse(feature.properties.stats);
                } catch (error) {
                    stats = [];
                }
            } else if (Array.isArray(feature.properties.stats)) {
                stats = feature.properties.stats;
            }

            const preschool = {
                id: feature.properties.id,
                name: feature.properties.name,
                stats: stats,
                coordinates: feature.geometry.coordinates.slice(0, 2) as [number, number]
            };

            if (filterOptions.searchQuery &&
                !preschool.name.toLowerCase().includes(filterOptions.searchQuery.toLowerCase())) {
                return false;
            }

            if (filterOptions.ageFilters.length > 0) {
                for (const ageFilter of filterOptions.ageFilters) {
                    const requiredMin = Math.max(1, ageFilter.minAvailableCount || 1);
                    
                    // 新しい構造から年齢クラスに対応するデータを取得
                    const ageClassMap: { [key: string]: string } = {
                        '0歳児': 'zero_year_old',
                        '1歳児': 'one_year_old',
                        '2歳児': 'two_year_old',
                        '3歳児': 'three_year_old',
                        '4歳児': 'four_year_old',
                        '5歳児': 'five_year_old'
                    };
                    
                    const ageField = ageClassMap[ageFilter.ageClass];
                    if (!ageField) {
                        return false;
                    }
                    
                    // acceptance_countとwaiting_countを計算
                    const acceptanceStat = preschool.stats.find((stat: any) => stat.kind === 'acceptance');
                    const waitingStat = preschool.stats.find((stat: any) => stat.kind === 'waiting');
                    
                    const acceptanceCount = acceptanceStat?.[ageField as keyof typeof acceptanceStat] ?? 0;
                    const waitingCount = waitingStat?.[ageField as keyof typeof waitingStat] ?? 0;
                    const availableCount = Math.max(0, acceptanceCount - waitingCount);
                    
                    if (availableCount < requiredMin) {
                        return false;
                    }
                }
            }

            return true;
        });

        return {
            type: 'FeatureCollection' as const,
            features: filteredFeatures
        };
    }, []);

    useEffect(() => {
        if (allGeoJSONData) {
            const filtered = applyFilters(allGeoJSONData, filters);
            setFilteredGeoJSONData(filtered);
        }
    }, [allGeoJSONData, filters, applyFilters]);

    // iOS Safariのビューポート高さ問題を解決
    useEffect(() => {
        const updateViewportHeight = () => {
            setViewportHeight(`${window.innerHeight}px`);
        };

        let timeoutId: ReturnType<typeof setTimeout>;
        const debouncedUpdate = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(updateViewportHeight, 100); // デバウンス時間を短縮
        };

        // 初期化
        updateViewportHeight();

        // イベントリスナーを追加
        window.addEventListener('resize', debouncedUpdate, { passive: true });
        window.addEventListener('orientationchange', updateViewportHeight, { passive: true });

        return () => {
            window.removeEventListener('resize', debouncedUpdate);
            window.removeEventListener('orientationchange', updateViewportHeight);
            clearTimeout(timeoutId);
        };
    }, []);

    useEffect(() => {
        if (map.current) return;

        if (mapContainer.current) {
            try {
                map.current = new maplibregl.Map({
                    container: mapContainer.current,
                    style: 'https://tiles.openfreemap.org/styles/bright',
                    center: [139.634, 35.450], // 横浜市役所
                    fadeDuration: 0,
                    zoom: 15, // 横浜市全体が見えるようにズームレベルを調整
                    pitch: 0,
                    bearing: 0,
                    renderWorldCopies: false,
                    maxZoom: 18,
                    minZoom: 7, // 横浜市全体が映るように最小ズームを調整
                    maxBounds: [
                        [139.4, 35.25], // 西南角（西経139.4度、北緯35.25度）
                        [139.8, 35.65]  // 東北角（東経139.8度、北緯35.65度）
                    ], // 横浜市の地理的境界を設定（より厳密に制限）
                    attributionControl: {
                        compact: true,
                        customAttribution: '© OpenStreetMap contributors'
                    },
                    localIdeographFontFamily: "'Noto Sans CJK JP','Hiragino Kaku Gothic ProN','sans-serif'",
                });

                map.current.on('load', () => {
                    // 地図の初期化完了後、非同期でデータを読み込み
                    loadData().catch(error => {
                        console.error('データの読み込み中にエラーが発生しました:', error);
                    });
                });

                map.current.on('error', (error) => {
                    console.error('マップエラー:', error);
                });

                map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

                // 地図の移動時に区名を更新（データの自動読み込みは削除）
                //map.current.on('moveend', () => {
                //    if (map.current) {
                //        const center = map.current.getCenter();
                //        const district = getDistrictFromCoordinates(center.lng, center.lat);
                //        setCurrentDistrict(district);
                //    }
                //});
            } catch (error) {
                console.error('マップの作成中にエラーが発生しました:', error);
            }
        }

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, [loadData]);

    // グローバルイベントでフィルターパネルを開く（フッターのアイランドボタンから起動）
    useEffect(() => {
        const openHandler = () => {
            // 検索（フィルターパネル）を開く際は詳細モーダルを閉じる
            setSelectedPreschool(null);
            setIsFilterPanelOpen(true);
            // オーバーレイ状態通知
            try {
                const ev = new CustomEvent('overlayState', { detail: { anyOpen: true, type: 'filter' } });
                window.dispatchEvent(ev as any);
            } catch {}
        };
        // 型の都合上、イベント名を any 経由で登録
        window.addEventListener('openFilterPanel' as any, openHandler as any);
        return () => {
            window.removeEventListener('openFilterPanel' as any, openHandler as any);
        };
    }, []);

    // グローバルイベントで区別パネルを開く
    useEffect(() => {
        const openWardHandler = () => {
            setSelectedPreschool(null);
            setIsFilterPanelOpen(false);
            setIsWardPanelOpen(true);
            try {
                const ev = new CustomEvent('overlayState', { detail: { anyOpen: true, type: 'ward' } });
                window.dispatchEvent(ev as any);
            } catch {}
        };
        window.addEventListener('openWardPanel' as any, openWardHandler as any);
        return () => {
            window.removeEventListener('openWardPanel' as any, openWardHandler as any);
        };
    }, []);

    // 区が選択されていない場合、区別パネルを強制表示
    useEffect(() => {
        if (!selectedWard && !isWardPanelOpen && !isFilterPanelOpen && !selectedPreschool) {
            // 少し遅延させて他の処理が完了してから表示
            const timer = setTimeout(() => {
                setIsWardPanelOpen(true);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [selectedWard, isWardPanelOpen, isFilterPanelOpen, selectedPreschool]);

    // isFilterPanelOpen / selectedPreschool / isWardPanelOpen の変更を監視してフッターへ状態通知
    useEffect(() => {
        const anyOpen = !!isFilterPanelOpen || !!selectedPreschool || !!isWardPanelOpen;
        try {
            const ev = new CustomEvent('overlayState', { 
                detail: { 
                    anyOpen, 
                    type: isFilterPanelOpen ? 'filter' : (isWardPanelOpen ? 'ward' : (selectedPreschool ? 'detail' : 'none')) 
                } 
            });
            window.dispatchEvent(ev as any);
        } catch {}
    }, [isFilterPanelOpen, selectedPreschool, isWardPanelOpen]);

    // 条件追加時に自動スクロール
    useEffect(() => {
        if (filters.ageFilters.length > 0 && scrollContainerRef.current) {
            // 少し遅延させてDOM更新後にスクロール
            setTimeout(() => {
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTo({
                        top: scrollContainerRef.current.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            }, 100);
        }
    }, [filters.ageFilters.length]);

    useEffect(() => {
        if (!map.current || !map.current.isStyleLoaded()) {
            console.log('マップが準備できていません');
            return;
        }

        console.log('クラスター表示を更新中...');
        console.log('filteredGeoJSONData:', filteredGeoJSONData);
        console.log('フィーチャー数:', filteredGeoJSONData?.features.length);

        try {
            if (map.current.getLayer('clusters')) {
                map.current.removeLayer('clusters');
            }
            if (map.current.getLayer('cluster-count')) {
                map.current.removeLayer('cluster-count');
            }
            if (map.current.getLayer('unclustered-point')) {
                map.current.removeLayer('unclustered-point');
            }
            if (map.current.getSource('preschools')) {
                map.current.removeSource('preschools');
            }
        } catch (error) {
            console.warn('レイヤーまたはソースの削除中にエラーが発生しました:', error);
        }

        if (!filteredGeoJSONData) {
            console.log('filteredGeoJSONDataがありません');
            return;
        }

        map.current.addSource('preschools', {
            type: 'geojson',
            data: filteredGeoJSONData as maplibregl.GeoJSONSourceSpecification['data'],
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 50
        });

        map.current.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'preschools',
            filter: ['has', 'point_count'],
            paint: {
                'circle-color': [
                    'step',
                    ['get', 'point_count'],
                    '#a8d8ff',
                    10,
                    '#87ceeb',
                    50,
                    '#6495ed'
                ],
                'circle-radius': [
                    'step',
                    ['get', 'point_count'],
                    25,
                    10,
                    40,
                    50,
                    55
                ],
                'circle-stroke-width': 3,
                'circle-stroke-color': '#ffffff',
                'circle-opacity': 0.9
            }
        });

        map.current.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'preschools',
            filter: ['has', 'point_count'],
            layout: {
                'text-field': '{point_count_abbreviated}',
                'text-font': ['Noto Sans Bold'],
                'text-size': 16
            },
            paint: {
                'text-color': '#ffffff',
                'text-halo-color': '#000000',
                'text-halo-width': 2
            }
        });

        map.current.addLayer({
            id: 'unclustered-point',
            type: 'circle',
            source: 'preschools',
            filter: ['!', ['has', 'point_count']],
            paint: {
                'circle-color': '#87ceeb',
                'circle-radius': 10,
                'circle-stroke-width': 3,
                'circle-stroke-color': '#ffffff',
                'circle-opacity': 0.9
            }
        });

        map.current.on('click', 'clusters', async (e) => {
            const features = map.current!.queryRenderedFeatures(e.point, {
                layers: ['clusters']
            });
            if (features.length > 0 && features[0].properties?.cluster_id) {
                const clusterId = features[0].properties.cluster_id;
                const source = map.current!.getSource('preschools') as maplibregl.GeoJSONSource;
                const zoom = await source.getClusterExpansionZoom(clusterId);
                const geometry = features[0].geometry;
                if (geometry.type === 'Point') {
                    map.current!.easeTo({
                        center: geometry.coordinates as [number, number],
                        zoom
                    });
                }
            }
        });

        map.current.on('click', 'unclustered-point', (e) => {
            const features = map.current!.queryRenderedFeatures(e.point, {
                layers: ['unclustered-point']
            });
            if (features && features.length > 0) {
                const properties = features[0].properties;
                const geometry = features[0].geometry as GeoJSON.Point;
                if (geometry.type === 'Point') {
                    // 詳細を開く際は検索（フィルターパネル）を閉じる
                    setIsFilterPanelOpen(false);
                    try {
                        const ev = new CustomEvent('overlayState', { detail: { anyOpen: true, type: 'detail' } });
                        window.dispatchEvent(ev as any);
                    } catch {}
                    let stats = [];
                    if (typeof properties.stats === 'string') {
                        try {
                            stats = JSON.parse(properties.stats);
                        } catch (error) {
                            stats = [];
                        }
                    } else if (Array.isArray(properties.stats)) {
                        stats = properties.stats;
                    }

                    const preschool = {
                        id: properties.id,
                        name: properties.name,
                        stats: stats,
                        coordinates: geometry.coordinates.slice(0, 2) as [number, number]
                    };
                    setSelectedPreschool(preschool);
                }
            }
        });

        map.current.on('mouseenter', 'clusters', () => {
            map.current!.getCanvas().style.cursor = 'pointer';
        });
        map.current.on('mouseleave', 'clusters', () => {
            map.current!.getCanvas().style.cursor = '';
        });
        map.current.on('mouseenter', 'unclustered-point', () => {
            map.current!.getCanvas().style.cursor = 'pointer';
        });
        map.current.on('mouseleave', 'unclustered-point', () => {
            map.current!.getCanvas().style.cursor = '';
        });
    }, [filteredGeoJSONData]);

    return (
        <div
            className={`relative w-full h-full ${className}`}
        >
            {/* 区名表示（フィルターがかかっている場合のみ） */}
            {selectedWard && (
                <div className="absolute top-4 left-4 z-30 rounded-xl px-4 py-3 bg-white/95 backdrop-blur-sm shadow-xl border border-gray-200">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h1 className="text-xl font-bold text-gray-800 tracking-wide" id="district-name">
                                {selectedWard}
                            </h1>
                            <p className="text-sm text-gray-600 mt-0.5">区別で絞り込み中</p>
                        </div>
                        <button
                            onClick={() => {
                                setSelectedWard(null);
                                // 横浜市全体のデータを取得
                                loadData();
                                // 地図を横浜市全体に戻す
                                if (map.current) {
                                    map.current.fitBounds([
                                        [139.4, 35.25],
                                        [139.8, 35.65]
                                    ], {
                                        padding: 50,
                                        maxZoom: 15
                                    });
                                }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200 border border-gray-200 hover:border-gray-300"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            解除
                        </button>
                    </div>
                </div>
            )}

            {/* ローディング表示 */}
            {isLoading && (
                <div 
                    className="absolute right-2.5 z-30 bg-white rounded-lg shadow-2xl px-4 py-3 flex items-center"
                    style={{
                        top: '120px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
                    }}
                >
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-blue-500 mr-3"></div>
                    <span className="text-sm font-medium text-gray-700">データを読み込み中...</span>
                </div>
            )}

            {/* エラー表示 */}
            {apiError && (
                <div 
                    className="absolute right-2.5 z-30 bg-red-50 border border-red-200 rounded-lg shadow-2xl px-4 py-3 max-w-sm"
                    style={{
                        top: '120px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
                    }}
                >
                    <div className="flex items-start">
                        <svg className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <p className="text-sm font-medium text-red-800">エラー</p>
                            <p className="text-xs text-red-600 mt-1">{apiError}</p>
                            <button
                                onClick={() => setApiError(null)}
                                className="text-xs text-red-500 hover:text-red-700 mt-2 underline"
                            >
                                閉じる
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* 区別パネル */}
            <div
                className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 ${isWardPanelOpen ? 'pointer-events-auto' : 'pointer-events-none'} transition-opacity duration-300 ${isWardPanelOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={() => {
                    // 区が選択されている場合のみ閉じることを許可
                    if (selectedWard) {
                        setIsWardPanelOpen(false);
                    }
                }}
            >
                <div
                    className="w-full sm:w-96 bg-white border border-gray-200 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[calc(var(--app-vh)-2rem)] sm:max-h-[calc(var(--app-vh)-6rem)] overflow-hidden"
                    style={{
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                        animation: isWardPanelOpen ? 'slideUpFromCenter 300ms cubic-bezier(0.16, 1, 0.3, 1)' : undefined
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* グリッパー */}
                    <div className="sm:hidden flex justify-center pt-2 pb-1">
                        <div className="w-10 h-1.5 rounded-full bg-gray-300" />
                    </div>

                    {/* ヘッダー */}
                    <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">区別で絞り込み</h2>
                            <p className="text-sm text-gray-600 mt-1">
                                {selectedWard 
                                    ? "横浜市の区を選択してください" 
                                    : "※ 区を選択してください（必須）"
                                }
                            </p>
                        </div>
                        {selectedWard && (
                            <button
                                onClick={() => setIsWardPanelOpen(false)}
                                className="text-gray-500 hover:text-gray-700 p-2 rounded-md hover:bg-gray-100 transition-colors duration-150 cursor-pointer"
                                aria-label="区別パネルを閉じる"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* 区別ボタン */}
                    <div className="px-4 sm:px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(var(--app-vh) - 200px)' }}>
                        <div className="text-lg font-bold text-gray-800 mb-2">
                            横浜市
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                '鶴見区', '神奈川区', '西区', '中区', '南区', '港北区',
                                '都筑区', '青葉区', '緑区', '旭区', '瀬谷区', '泉区',
                                '戸塚区', '栄区', '港南区', '保土ケ谷区', '金沢区', '磯子区'
                            ].map((ward) => (
                                <button
                                    key={ward}
                                    onClick={() => {
                                        setSelectedWard(ward);
                                        setIsWardPanelOpen(false);
                                        // 選択された区のデータを取得
                                        loadDataForWard(ward);
                                        // 地図を選択された区に移動
                                        moveToDistrict(ward);
                                    }}
                                    className={`px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                                        selectedWard === ward
                                            ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                                            : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                                    }`}
                                >
                                    {ward}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* フィルターパネル */}
            <div
                className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 ${isFilterPanelOpen ? 'pointer-events-auto' : 'pointer-events-none'} transition-opacity duration-300 ${isFilterPanelOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={() => setIsFilterPanelOpen(false)}
            >
                <div
                    className="w-full sm:w-80 bg-white border border-gray-200 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[calc(var(--app-vh)-2rem)] sm:max-h-[calc(var(--app-vh)-6rem)] overflow-hidden"
                    style={{
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                        animation: isFilterPanelOpen ? 'slideUpFromCenter 300ms cubic-bezier(0.16, 1, 0.3, 1)' : undefined
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* グリッパー */}
                    <div className="sm:hidden flex justify-center pt-2 pb-1">
                        <div className="w-10 h-1.5 rounded-full bg-gray-300" />
                    </div>

                    {/* ヘッダー */}
                    <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">表示条件</h2>
                            <p className="text-sm text-gray-600 mt-1">
                                表示件数: <span className="font-semibold text-blue-600">{filteredGeoJSONData?.features.length.toLocaleString('ja-JP') || 0}</span>件
                            </p>
                        </div>
                        <button
                            onClick={() => setIsFilterPanelOpen(false)}
                            className="text-gray-500 hover:text-gray-700 p-2 rounded-md hover:bg-gray-100 transition-colors duration-150 cursor-pointer"
                            aria-label="フィルターパネルを閉じる"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* スクロール領域 */}
                    <div ref={scrollContainerRef} className="px-4 sm:px-6 pt-4 pb-4 sm:pb-6 overflow-y-auto" style={{ maxHeight: 'calc(var(--app-vh) - 240px)' }}>
                    {/* 保育園名表示条件（最重要） */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            保育園名で絞り込み
                            <span className="text-xs text-gray-500 ml-1">（部分一致）</span>
                        </label>
                        <input
                            type="text"
                            value={filters.searchQuery}
                            onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                            className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="例: 横浜市馬場保育園"
                        />
                    </div>

                    {/* 年齢クラスと空き数のセット */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            年齢クラスと空き数
                            <span className="text-xs text-gray-500 ml-1">（複数設定可能）</span>
                        </label>

                        {filters.ageFilters.map((ageFilter, index) => (
                            <div key={index} className="mb-4 p-3 border border-gray-200 rounded-md bg-gray-50">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">条件 {index + 1}</span>
                                    <button
                                        onClick={() => setFilters(prev => ({
                                            ...prev,
                                            ageFilters: prev.ageFilters.filter((_, i) => i !== index)
                                        }))}
                                        className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                                        aria-label="条件を削除"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">年齢クラス</label>
                                        <select
                                            value={ageFilter.ageClass}
                                            onChange={(e) => setFilters(prev => ({
                                                ...prev,
                                                ageFilters: prev.ageFilters.map((filter, i) =>
                                                    i === index ? { ...filter, ageClass: e.target.value } : filter
                                                )
                                            }))}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        >
                                            {!filters.ageFilters.some((filter, i) => i !== index && filter.ageClass === '0歳児') && (
                                                <option value="0歳児">0歳児</option>
                                            )}
                                            {!filters.ageFilters.some((filter, i) => i !== index && filter.ageClass === '1歳児') && (
                                                <option value="1歳児">1歳児</option>
                                            )}
                                            {!filters.ageFilters.some((filter, i) => i !== index && filter.ageClass === '2歳児') && (
                                                <option value="2歳児">2歳児</option>
                                            )}
                                            {!filters.ageFilters.some((filter, i) => i !== index && filter.ageClass === '3歳児') && (
                                                <option value="3歳児">3歳児</option>
                                            )}
                                            {!filters.ageFilters.some((filter, i) => i !== index && filter.ageClass === '4歳児') && (
                                                <option value="4歳児">4歳児</option>
                                            )}
                                            {!filters.ageFilters.some((filter, i) => i !== index && filter.ageClass === '5歳児') && (
                                                <option value="5歳児">5歳児</option>
                                            )}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">空き数</label>
                                        <div className="flex items-stretch">
                                            <button
                                                type="button"
                                                onClick={() => setFilters(prev => ({
                                                    ...prev,
                                                    ageFilters: prev.ageFilters.map((filter, i) => {
                                                        if (i !== index) return filter;
                                                        const next = Math.max(1, (filter.minAvailableCount || 1) - 1);
                                                        return { ...filter, minAvailableCount: next };
                                                    })
                                                }))}
                                                className="px-4 py-2 border border-gray-300 rounded-l text-gray-700 bg-white active:bg-gray-50"
                                                aria-label="空き数を減らす"
                                            >
                                                −
                                            </button>
                                            <input
                                                type="number"
                                                inputMode="numeric"
                                                min={1}
                                                value={Math.max(1, ageFilter.minAvailableCount || 1)}
                                                onChange={(e) => setFilters(prev => ({
                                                    ...prev,
                                                    ageFilters: prev.ageFilters.map((filter, i) =>
                                                        i === index ? { ...filter, minAvailableCount: Math.max(1, parseInt(e.target.value) || 1) } : filter
                                                    )
                                                }))}
                                                className="w-full max-w-[6rem] text-center px-3 py-2 border-t border-b border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                placeholder="1"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setFilters(prev => ({
                                                    ...prev,
                                                    ageFilters: prev.ageFilters.map((filter, i) => {
                                                        if (i !== index) return filter;
                                                        const next = (filter.minAvailableCount || 1) + 1;
                                                        return { ...filter, minAvailableCount: next };
                                                    })
                                                }))}
                                                className="px-4 py-2 border border-gray-300 rounded-r text-gray-700 bg-white active:bg-gray-50"
                                                aria-label="空き数を増やす"
                                            >
                                                ＋
                                            </button>
                                            <div className="ml-2 flex items-center text-xs text-gray-500">人以上</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* 条件追加ボタン */}
                        {(() => {
                            const allAgeClasses = ['0歳児', '1歳児', '2歳児', '3歳児', '4歳児', '5歳児'];
                            const usedAgeClasses = filters.ageFilters.map(filter => filter.ageClass);
                            const availableAgeClasses = allAgeClasses.filter(ageClass => !usedAgeClasses.includes(ageClass));

                            return availableAgeClasses.length > 0 && (
                                <button
                                    onClick={() => setFilters(prev => ({
                                        ...prev,
                                        ageFilters: [...prev.ageFilters, { ageClass: availableAgeClasses[0], minAvailableCount: 1 }]
                                    }))}
                                    className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center"
                                >
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    条件を追加
                                </button>
                            );
                        })()}
                    </div>

                    {/* 余白確保（フッター浮かせる） */}
                    <div className="h-12 sm:h-0" />
                    </div>

                    {/* フッターアクション */}
                    <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3 sm:px-6 sm:py-4 flex gap-3">
                        <button
                            onClick={() => setFilters({ searchQuery: '', ageFilters: [] })}
                            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer text-sm font-medium"
                        >
                            リセット
                        </button>
                        <button
                            onClick={() => setIsFilterPanelOpen(false)}
                            className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-black transition-colors cursor-pointer text-sm font-medium"
                        >
                            閉じる
                        </button>
                    </div>
                </div>
            </div>

            {/* 右上の検索ボタンはアイランドへ統合したため削除 */}

            {/* 保育園詳細モーダル */}
            <div
                className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${selectedPreschool ? 'pointer-events-auto' : 'pointer-events-none'} transition-opacity duration-300 ${selectedPreschool ? 'opacity-100' : 'opacity-0'}`}
                onClick={() => setSelectedPreschool(null)}
            >
                {selectedPreschool && (
                    <div
                        className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 sm:p-6 w-80 sm:w-96 max-h-[80vh] overflow-y-auto pointer-events-auto transform transition-transform duration-200 ease-out"
                        style={{
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                            animation: 'slideUpFromCenter 300ms cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-gray-800 mb-2">{selectedPreschool.name}</h3>
                                {(() => {
                                    // 最新のtarget_dateを取得
                                    const latestStat = selectedPreschool.stats.find(stat => stat.target_date);
                                    if (latestStat?.target_date) {
                                        try {
                                            // target_dateを適切な形式にフォーマット
                                            const date = new Date(latestStat.target_date);
                                            const formattedDate = date.toLocaleDateString('ja-JP', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            });
                                            return (
                                                <div className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-md inline-block">
                                                    <span className="font-medium">データ取得日:</span> {formattedDate}
                                                </div>
                                            );
                                        } catch (error) {
                                            return (
                                                <div className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-md inline-block">
                                                    <span className="font-medium">データ取得日:</span> {latestStat.target_date}
                                                </div>
                                            );
                                        }
                                    }
                                    return null;
                                })()}
                            </div>
                            <button
                                onClick={() => setSelectedPreschool(null)}
                                className="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100 transition-colors cursor-pointer ml-4 flex-shrink-0"
                                aria-label="モーダルを閉じる"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-700">年齢</th>
                                        <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-700">在園</th>
                                        <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-700">受け入れ</th>
                                        <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-700">待機</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.isArray(selectedPreschool.stats) && selectedPreschool.stats.length > 0 ? (
                                        (() => {
                                            // 新しい構造から年齢クラス別のデータを生成
                                            const ageClasses = [
                                                { key: 'zero_year_old', label: '0歳児' },
                                                { key: 'one_year_old', label: '1歳児' },
                                                { key: 'two_year_old', label: '2歳児' },
                                                { key: 'three_year_old', label: '3歳児' },
                                                { key: 'four_year_old', label: '4歳児' },
                                                { key: 'five_year_old', label: '5歳児' }
                                            ];
                                            
                                            const childrenStat = selectedPreschool.stats.find(stat => stat.kind === 'children');
                                            const acceptanceStat = selectedPreschool.stats.find(stat => stat.kind === 'acceptance');
                                            const waitingStat = selectedPreschool.stats.find(stat => stat.kind === 'waiting');
                                            
                                            return ageClasses.map((ageClass, index) => {
                                                const childrenCount = childrenStat?.[ageClass.key as keyof typeof childrenStat] ?? 0;
                                                const acceptanceCount = acceptanceStat?.[ageClass.key as keyof typeof acceptanceStat] ?? 0;
                                                const waitingCount = waitingStat?.[ageClass.key as keyof typeof waitingStat] ?? 0;
                                                
                                                return (
                                                    <tr key={index} className="hover:bg-gray-50">
                                                        <td className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800">
                                                            {ageClass.label}
                                                        </td>
                                                        <td className="border border-gray-300 px-3 py-2 text-center text-sm text-gray-600 font-semibold">
                                                            {childrenCount}人
                                                        </td>
                                                        <td className="border border-gray-300 px-3 py-2 text-center text-sm text-gray-600 font-semibold">
                                                            {acceptanceCount}人
                                                        </td>
                                                        <td className="border border-gray-300 px-3 py-2 text-center text-sm text-gray-600 font-semibold">
                                                            {waitingCount}人
                                                        </td>
                                                    </tr>
                                                );
                                            });
                                        })()
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="border border-gray-300 px-3 py-4 text-center text-sm text-gray-500">
                                                データがありません
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* マップ */}
            <div
                ref={mapContainer}
                className="w-full h-full"
            />
        </div>
    );
}
