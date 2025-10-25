'use client';

import { useState, useRef, useEffect } from 'react';

export default function Footer() {
  const [isSourceOpen, setIsSourceOpen] = useState(false);
  const [isHiddenByOverlay, setIsHiddenByOverlay] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const handleSearchClick = () => {
    const event = new Event('openFilterPanel');
    window.dispatchEvent(event);
  };

  const handleWardClick = () => {
    const event = new Event('openWardPanel');
    window.dispatchEvent(event);
  };

  // ポップオーバー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!isSourceOpen) return;
      const target = e.target as Node;
      if (popoverRef.current && !popoverRef.current.contains(target)) {
        setIsSourceOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside, { passive: true } as any);
    return () => document.removeEventListener('mousedown', handleClickOutside as any);
  }, [isSourceOpen]);

  // オーバーレイ（検索/詳細）が開いている間はアイランドを隠す
  useEffect(() => {
    const handler = (e: any) => {
      if (!e?.detail) return;
      setIsHiddenByOverlay(!!e.detail.anyOpen);
      if (e.detail.anyOpen) {
        setIsSourceOpen(false);
      }
    };
    window.addEventListener('overlayState' as any, handler as any);
    return () => window.removeEventListener('overlayState' as any, handler as any);
  }, []);

  return (
    <div className={`pointer-events-none fixed inset-x-0 bottom-15 z-30 flex justify-center transition-opacity duration-200 ${isHiddenByOverlay ? 'opacity-0' : 'opacity-100'}`}>
      <div className="pointer-events-auto relative">
        {/* アイランド本体 */}
        <div className="flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-3 rounded-full bg-white text-gray-800 shadow-2xl border border-gray-200"
          style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)' }}
        >
          {/* 区別ボタン */}
          <button
            onClick={handleWardClick}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 active:scale-[0.98] transition"
            aria-label="区別で絞り込み"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-semibold">区別</span>
          </button>

          {/* 表示条件ボタン（メインCTA） */}
          <button
            onClick={handleSearchClick}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 active:scale-[0.98] transition"
            aria-label="表示条件を開く"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-sm font-semibold">表示条件</span>
          </button>

          {/* 情報ボタン（出典） */}
          <button
            onClick={() => setIsSourceOpen((v) => !v)}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50"
            aria-expanded={isSourceOpen}
            aria-controls="source-popover"
            aria-label="データ出典情報を表示"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
            </svg>
          </button>
        </div>

        {/* 出典ポップオーバー */}
        {isSourceOpen && (
          <div
            id="source-popover"
            ref={popoverRef}
            className="absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-2xl w-[280px] sm:w-[360px] p-3"
            style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)' }}
            role="dialog"
            aria-label="データ出典情報"
          >
            <p className="text-xs text-gray-700 leading-relaxed">
              データ出典:
              <a
                href="https://www.city.yokohama.lg.jp/kosodate-kyoiku/hoiku-yoji/shisetsu/riyou/info/nyusho-jokyo.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline ml-1"
              >
                横浜市
              </a>
              <span className="text-gray-400 ml-1">(CC BY 4.0)</span>
            </p>
            <p className="mt-2 text-xs text-gray-600">
              本サービス「ほいぷら」は上記公開データを基に一部加工して利用しています。
            </p>
            <p className="mt-2 text-[11px] text-gray-500">
              ※本サービスは横浜市の公式サイトではなく、横浜市による保証・後援を受けていません。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
