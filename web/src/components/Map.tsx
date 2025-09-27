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
        age_class: string;
        acceptance_count: number;
        children_count: number;
        waiting_count: number;
    }>;
    coordinates: [number, number];
}

interface AgeFilter {
    ageClass: string;
    minAvailableCount: number;
}

interface FilterOptions {
    searchQuery: string;
    ageFilters: AgeFilter[];
}

// サーバーサイドAPIを使用してデータを取得
async function fetchData() {
    try {
        const response = await fetch('/api/preschool-data');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('データを取得しました:', data);
        return data;

    } catch (error) {
        console.error("データの取得に失敗しました:", error);
        throw error;
    }
}

export default function Map({ className = '' }: MapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const [allData, setAllData] = useState<PreschoolData[]>([]);
    const [filteredData, setFilteredData] = useState<PreschoolData[]>([]);
    const [filters, setFilters] = useState<FilterOptions>({
        searchQuery: '',
        ageFilters: []
    });
    const [selectedPreschool, setSelectedPreschool] = useState<PreschoolData | null>(null);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);
    const [viewportHeight, setViewportHeight] = useState('100vh');

    const loadData = useCallback(async () => {
        try {
            const response = await fetchData();
            const preschools: PreschoolData[] = response.features.map((feature: any) => ({
                id: feature.properties.id,
                name: feature.properties.name,
                stats: feature.properties.stats,
                coordinates: feature.geometry.coordinates.slice(0, 2) as [number, number]
            }));
            setAllData(preschools);
            setFilteredData(preschools);
        } catch (error) {
            console.error('データの取得に失敗しました:', error);
        }
    }, []);

    const applyFilters = useCallback((data: PreschoolData[], filterOptions: FilterOptions) => {
        return data.filter(preschool => {
            if (filterOptions.searchQuery &&
                !preschool.name.toLowerCase().includes(filterOptions.searchQuery.toLowerCase())) {
                return false;
            }

            if (filterOptions.ageFilters.length > 0) {
                for (const ageFilter of filterOptions.ageFilters) {
                    const requiredMin = Math.max(1, ageFilter.minAvailableCount || 1);
                    const matchingStat = preschool.stats.find(stat =>
                        stat.age_class === ageFilter.ageClass
                    );
                    if (!matchingStat) {
                        return false;
                    }
                    const availableCount = Math.max(0, (matchingStat?.acceptance_count ?? 0) - (matchingStat?.waiting_count ?? 0));
                    if (availableCount < requiredMin) {
                        return false;
                    }
                }
            }

            return true;
        });
    }, []);

    useEffect(() => {
        const filtered = applyFilters(allData, filters);
        setFilteredData(filtered);
    }, [allData, filters, applyFilters]);

    // iOS Safariのビューポート高さ問題を解決
    useEffect(() => {
        const updateViewportHeight = () => {
            setViewportHeight(`${window.innerHeight}px`);
        };

        let timeoutId: ReturnType<typeof setTimeout>;
        const debouncedUpdate = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(updateViewportHeight, 150);
        };

        updateViewportHeight();
        window.addEventListener('resize', debouncedUpdate);
        window.addEventListener('orientationchange', updateViewportHeight);

        return () => {
            window.removeEventListener('resize', debouncedUpdate);
            window.removeEventListener('orientationchange', updateViewportHeight);
            clearTimeout(timeoutId);
        };
    }, []);

    useEffect(() => {
        if (map.current) return;

        if (mapContainer.current) {
            map.current = new maplibregl.Map({
                container: mapContainer.current,
                style: 'https://tiles.openfreemap.org/styles/bright',
                center: [139.6380, 35.4437],
                zoom: 12,
                pitch: 45, // 45度の傾斜角を設定（0度が真上から、60度が最大）
                bearing: 0, // 方位角（0度が北向き）
                renderWorldCopies: false
            });

            map.current.on('load', async () => {
                const kanagawaBounds: [[number, number], [number, number]] = [
                    [139.0, 35.1],
                    [139.9, 35.65]
                ];
                map.current!.fitBounds(kanagawaBounds, { padding: 20 });
                map.current!.setMaxBounds(kanagawaBounds);
                const allowedSlightlyWiderMinZoom = Math.max(0, map.current!.getZoom() - 0.7);
                map.current!.setMinZoom(allowedSlightlyWiderMinZoom);

                const uchidachoCenter: [number, number] = [139.631317, 35.453254];
                map.current!.setCenter(uchidachoCenter);

                await loadData();
            });

            map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
        }

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, [loadData]);

    useEffect(() => {
        if (!map.current || !map.current.isStyleLoaded()) return;

        if (map.current.getSource('preschools')) {
            map.current.removeLayer('clusters');
            map.current.removeLayer('cluster-count');
            map.current.removeLayer('unclustered-point');
            map.current.removeSource('preschools');
        }

        const geojsonData = {
            type: 'FeatureCollection' as const,
            features: filteredData.map(preschool => ({
                type: 'Feature' as const,
                properties: {
                    id: preschool.id,
                    name: preschool.name,
                    stats: preschool.stats
                },
                geometry: {
                    type: 'Point' as const,
                    coordinates: preschool.coordinates
                }
            }))
        };

        map.current.addSource('preschools', {
            type: 'geojson',
            data: geojsonData as maplibregl.GeoJSONSourceSpecification['data'],
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
            if (e.features && e.features.length > 0) {
                const properties = e.features[0].properties;
                const preschool = filteredData.find(p => p.id === properties.id);
                if (preschool) {
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
    }, [filteredData]);

    return (
        <div 
            className={`relative w-full h-full ${className}`}
            style={{ height: viewportHeight }}
        >
            {/* タイトル */}
            <div className="absolute top-4 left-4 z-30 rounded-lg px-0 py-4">
                <h1 className="text-3xl font-bold text-gray-800 tracking-wide">ほいぷら</h1>
            </div>
            {/* フィルターパネル */}
            <div
                className={`absolute top-20 left-4 z-10 bg-white rounded-lg shadow-2xl p-4 sm:p-6 w-72 sm:w-80 max-h-[calc(100vh-6rem)] overflow-y-auto transition-transform duration-150 ease-out ${isFilterPanelOpen ? 'translate-x-0' : '-translate-x-[calc(100%+1rem)]'}`}
                style={{
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
                }}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">保育園検索</h2>
                    <button
                        onClick={() => setIsFilterPanelOpen(false)}
                        className="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100 transition-colors duration-150 cursor-pointer"
                        aria-label="フィルターパネルを閉じる"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* 保育園名検索（最重要） */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        保育園名で検索
                        <span className="text-xs text-gray-500 ml-1">（部分一致）</span>
                    </label>
                    <input
                        type="text"
                        value={filters.searchQuery}
                        onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                                            className="px-3 py-1 border border-gray-300 rounded-l text-gray-700 bg-white active:bg-gray-50"
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
                                            className="w-full max-w-[6rem] text-center px-2 py-1 border-t border-b border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                                            className="px-3 py-1 border border-gray-300 rounded-r text-gray-700 bg-white active:bg-gray-50"
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

                {/* フィルターリセット */}
                <button
                    onClick={() => setFilters({
                        searchQuery: '',
                        ageFilters: []
                    })}
                    className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors cursor-pointer"
                >
                    検索条件をリセット
                </button>
            </div>

            {/* フィルターパネル開閉ボタン */}
            {!isFilterPanelOpen && (
                <button
                    onClick={() => setIsFilterPanelOpen(true)}
                    className="absolute top-20 left-4 z-10 bg-white rounded-lg shadow-2xl p-3 hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                    style={{
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
                    }}
                    aria-label="フィルターパネルを開く"
                >
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </button>
            )}

            {/* 保育園詳細モーダル */}
            <div
                className={`absolute inset-0 z-20 flex items-end justify-end p-4 pointer-events-none transition-opacity duration-300 ${selectedPreschool ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={() => setSelectedPreschool(null)}
            >
                {selectedPreschool && (
                    <div
                        className="bg-white rounded-lg shadow-2xl p-4 sm:p-6 w-80 sm:w-96 max-h-[80vh] overflow-y-auto pointer-events-auto transform transition-transform duration-100 ease-out translate-x-0"
                        style={{
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                            animation: 'slideInFromRight 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-800">{selectedPreschool.name}</h3>
                            <button
                                onClick={() => setSelectedPreschool(null)}
                                className="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
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
                                        <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-700">空き</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedPreschool.stats.map((stat, index) => {
                                        const availableCount = Math.max(0, stat.acceptance_count - stat.waiting_count);
                                        return (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800">
                                                    {stat.age_class}
                                                </td>
                                                <td className="border border-gray-300 px-3 py-2 text-center text-sm text-gray-600 font-semibold">
                                                    {stat.children_count}人
                                                </td>
                                                <td className="border border-gray-300 px-3 py-2 text-center text-sm text-gray-600 font-semibold">
                                                    {stat.acceptance_count}人
                                                </td>
                                                <td className="border border-gray-300 px-3 py-2 text-center text-sm text-gray-600 font-semibold">
                                                    {stat.waiting_count}人
                                                </td>
                                                <td className={`border border-gray-300 px-3 py-2 text-center text-sm font-semibold ${availableCount > 0 ? 'text-green-600' : 'text-gray-500'
                                                    }`}>
                                                    {availableCount}人
                                                </td>
                                            </tr>
                                        );
                                    })}
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
                style={{ 
                    height: viewportHeight,
                    minHeight: viewportHeight
                }}
            />
        </div>
    );
}
