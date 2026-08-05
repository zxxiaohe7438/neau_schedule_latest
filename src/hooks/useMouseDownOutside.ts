import { useCallback, useRef } from 'react';

/**
 * 遮罩点击关闭模式。
 * 记录 mousedown 是否落在内容区内，仅当按下与抬起都在遮罩（而非内容区）时触发关闭。
 * 收敛了 Modal / CellNoteEditor / SmartPasteDialog / TimetableGrid 右键菜单中的重复实现。
 *
 * @param containerSelector 用于在当前遮罩元素内定位内容容器的选择器
 * @param onClose 点击遮罩空白处时触发
 */
export function useMouseDownOutside(
  containerSelector: string,
  onClose: () => void
) {
  const isMouseDownInside = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const container = (e.currentTarget as HTMLElement).querySelector(containerSelector);
      isMouseDownInside.current = container?.contains(e.target as Node) ?? false;
    },
    [containerSelector]
  );

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !isMouseDownInside.current) {
        onClose();
      }
    },
    [onClose]
  );

  return { handleMouseDown, handleOverlayClick };
}
