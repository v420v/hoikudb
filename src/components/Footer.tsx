'use client';

import { useState, useRef, useEffect } from 'react';

export default function Footer() {
  const [isSourceOpen, setIsSourceOpen] = useState(false);
  const [hasSelectedWard, setHasSelectedWard] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const handleSearchClick = () => {
    const event = new Event('openFilterPanel');
    window.dispatchEvent(event);
  };

  const handleWardClick = () => {
    const event = new Event('openWardPanel');
    window.dispatchEvent(event);
    setIsMenuOpen(false);
  };

  const handleSearchClickWithMenu = () => {
    handleSearchClick();
    setIsMenuOpen(false);
  };

  const handleSourceClickWithMenu = () => {
    setIsSourceOpen((v) => !v);
    setIsMenuOpen(false);
  };

  // ポップオーバー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      
      // 出典ポップオーバー外クリックで閉じる
      if (isSourceOpen && popoverRef.current && !popoverRef.current.contains(target)) {
        setIsSourceOpen(false);
      }
      
      // メニュー外クリックで閉じる
      if (isMenuOpen && menuRef.current && !menuRef.current.contains(target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside, { passive: true } as any);
    return () => document.removeEventListener('mousedown', handleClickOutside as any);
  }, [isSourceOpen, isMenuOpen]);

  // オーバーレイ（検索/詳細）が開いている間は出典ポップオーバーを閉じる、区別の状態を取得
  useEffect(() => {
    const handler = (e: any) => {
      if (!e?.detail) return;
      if (e.detail.anyOpen) {
        setIsSourceOpen(false);
      }
      setHasSelectedWard(!!e.detail.selectedWard);
    };
    window.addEventListener('overlayState' as any, handler as any);
    return () => window.removeEventListener('overlayState' as any, handler as any);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-30 flex sm:justify-center px-4">
      <div className="pointer-events-auto relative w-full sm:w-auto">
        {/* アイランド本体 */}
        <div className="flex items-center justify-between sm:justify-start gap-2 px-3 py-2 sm:px-5 sm:py-3 rounded-full rounded-xl bg-white text-gray-800 shadow-2xl border border-gray-200"
          style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)' }}
        >
          {/* アプリケーション名とbetaラベル */}
          <div className="flex items-center gap-1">
            {/* タブレット以上：アプリケーション名 */}
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">保育DB</h1>
            <span className="px-2 py-0.5 mb-4 text-xs font-semibold text-white bg-gradient-to-r from-blue-400 to-blue-500 rounded-full">
              beta
            </span>
          </div>

          <div className="hidden sm:block h-6 w-px bg-gray-300"></div>

          {/* タブレット以上：3つのボタンを横並びで表示 */}
          <div className="hidden sm:flex items-center gap-2">
            {/* 区別ボタン */}
            <button
              onClick={handleWardClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 active:scale-[0.98] transition cursor-pointer"
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 active:scale-[0.98] transition cursor-pointer"
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
              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer"
              aria-expanded={isSourceOpen}
              aria-controls="source-popover"
              aria-label="データ出典情報を表示"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
              </svg>
            </button>
          </div>

          {/* スマホ：メニューボタン */}
          <div className="sm:hidden relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen((v) => !v)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer"
              aria-expanded={isMenuOpen}
              aria-label="メニューを開く"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            {/* ドロップダウンメニュー */}
            {isMenuOpen && (
              <div
                className="absolute top-[calc(100%+8px)] right-0 bg-white border border-gray-200 rounded-lg shadow-2xl min-w-[160px] overflow-hidden"
                style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)' }}
              >
                <button
                  onClick={handleWardClick}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-gray-800 hover:bg-gray-50 transition"
                  aria-label="区別で絞り込み"
                >
                  <svg className="w-5 h-5 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>区別</span>
                </button>
                <button
                  onClick={handleSearchClickWithMenu}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-gray-800 hover:bg-gray-50 transition"
                  aria-label="表示条件を開く"
                >
                  <svg className="w-5 h-5 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span>表示条件</span>
                </button>
                <button
                  onClick={handleSourceClickWithMenu}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-gray-800 hover:bg-gray-50 transition"
                  aria-expanded={isSourceOpen}
                  aria-label="データ出典情報を表示"
                >
                  <svg className="w-5 h-5 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                  </svg>
                  <span>データ出典</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 出典ポップオーバー */}
        {isSourceOpen && (
          <div
            id="source-popover"
            ref={popoverRef}
            className="absolute top-[calc(100%+10px)] left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-2xl w-[280px] sm:w-[360px] p-3"
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
              本サービス「保育DB」は上記公開データを基に一部加工して利用しています。
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
