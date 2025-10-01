'use client';

import { useState } from 'react';

export default function Footer() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <footer className="bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        {/* コンパクト表示 */}
        <div className="py-2 sm:py-3">
          <div className="flex items-center justify-between">
            {/* データ出典概要 */}
            <div className="flex-1 text-center px-2">
              <p className="text-xs text-gray-600 leading-tight">
                データ出典: 
                <a 
                  href="https://www.city.yokohama.lg.jp/kosodate-kyoiku/hoiku-yoji/shisetsu/riyou/info/nyusho-jokyo.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline ml-1"
                >
                  横浜市
                </a>
                <span className="text-gray-400"> (CC BY 4.0)</span>
              </p>
            </div>
            
            {/* 詳細表示ボタン */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-500 hover:text-gray-700 transition-colors duration-200 flex items-center space-x-1 flex-shrink-0 ml-2"
              aria-label={isExpanded ? '詳細を閉じる' : '詳細を表示'}
            >
              <span className="text-xs hidden sm:inline">詳細</span>
              <svg 
                className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* 詳細表示（折りたたみ） */}
        <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="border-t border-gray-100 py-3 sm:py-4">
            <div className="text-left sm:text-center max-w-4xl mx-auto px-2">
              <div className="space-y-2 sm:space-y-3">
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  本サービス「ほいぷら」は、横浜市の公開データ
                  <a 
                    href="https://www.city.yokohama.lg.jp/kosodate-kyoiku/hoiku-yoji/shisetsu/riyou/info/nyusho-jokyo.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline mx-1"
                  >
                    保育所等の入所状況
                  </a>
                  を基に一部加工して利用しています。
                </p>
                
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  元データは
                  <a 
                    href="https://creativecommons.org/licenses/by/4.0/deed.ja"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline mx-1"
                  >
                    CC BY 4.0
                  </a>
                  ライセンスの下で提供されています。
                </p>
                
                <p className="text-xs text-gray-500 leading-relaxed">
                  ※本サービスは横浜市の公式サイトではなく、横浜市による保証・後援を受けているものではありません。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
