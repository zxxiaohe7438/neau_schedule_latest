import { useEffect, useState } from 'react';
import { MinusIcon, SquareIcon, RestoreIcon, XIcon } from './icons';

/**
 * 自绘窗口标题栏（frameless 模式）。
 * 中间区域可拖拽移动窗口；右侧为最小化/最大化/关闭控制。
 */
export function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const off = window.api.window.onMaximizedChange(setMaximized);
    return off;
  }, []);

  return (
    <div className="app-titlebar">
      <div className="titlebar-brand">
        <span className="titlebar-logo" aria-hidden="true" />
        <span>NEAU LOCAL SCHEDULE</span>
      </div>
      <div className="titlebar-controls">
        <button
          className="titlebar-btn"
          onClick={() => window.api.window.minimize()}
          aria-label="最小化"
        >
          <MinusIcon size={14} />
        </button>
        <button
          className="titlebar-btn"
          onClick={() => window.api.window.toggleMaximize()}
          aria-label={maximized ? '还原' : '最大化'}
        >
          {maximized ? <RestoreIcon size={12} /> : <SquareIcon size={12} />}
        </button>
        <button
          className="titlebar-btn titlebar-close"
          onClick={() => window.api.window.close()}
          aria-label="关闭"
        >
          <XIcon size={14} />
        </button>
      </div>
    </div>
  );
}
