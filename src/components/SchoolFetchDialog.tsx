import type { ImportResult } from '../domain/ImportResult';
import { useSchoolFetch } from '../hooks/useSchoolFetch';
import { useMouseDownOutside } from '../hooks/useMouseDownOutside';

interface SchoolFetchDialogProps {
  /** 抓取结果进入现有导入预览 */
  onResult: (result: ImportResult) => void;
  onCancel: () => void;
}

/**
 * 从学校官网获取课表对话框。
 * 流程：打开登录窗口（扫码/账号登录，密码不经过应用）→ 自动检测登录 → 抓取课表
 * → 学期信息确认 → 进入现有导入预览（冲突裁决/确认写入）。
 */
export function SchoolFetchDialog({ onResult, onCancel }: SchoolFetchDialogProps) {
  const school = useSchoolFetch({ onResult, onClose: onCancel });
  const { handleMouseDown, handleOverlayClick } = useMouseDownOutside(
    '.school-fetch-dialog',
    onCancel
  );

  const { status, fetching, error, pendingResult, semesterDraft } = school;
  const isDev = !!window.api.school.fetchScheduleMock;

  return (
    <div className="smart-paste-overlay" onMouseDown={handleMouseDown} onClick={handleOverlayClick}>
      <div className="school-fetch-dialog">
        <div className="smart-paste-header">
          <h3>从官网获取课表</h3>
          <p className="text-muted">登录学校教务系统，自动抓取本学期课表（仅连接学校官方域名）</p>
        </div>

        <div className="smart-paste-body">
          {pendingResult && semesterDraft ? (
            /* 学期信息确认步骤 */
            <div className="school-fetch-semester">
              <h4>抓取成功，确认学期信息</h4>
              <div className="school-fetch-summary">
                <span className="summary-item success">
                  ✓ 共 {pendingResult.total_count} 条课程安排
                </span>
                {pendingResult.unscheduled_courses.length > 0 && (
                  <span className="summary-item info">
                    ℹ {pendingResult.unscheduled_courses.length} 门无固定时间课程
                  </span>
                )}
                {pendingResult.errors.length > 0 && (
                  <span className="summary-item warning">
                    ⚠ {pendingResult.errors.length} 条解析错误
                  </span>
                )}
              </div>
              <div className="form-group">
                <label>学期名称</label>
                <input
                  type="text"
                  value={semesterDraft.name}
                  onChange={(e) => school.setSemesterDraft({ ...semesterDraft, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>开学日期（周一）</label>
                <input
                  type="date"
                  value={semesterDraft.start_date}
                  onChange={(e) =>
                    school.setSemesterDraft({ ...semesterDraft, start_date: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>总周数</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={semesterDraft.weeks_count}
                  onChange={(e) =>
                    school.setSemesterDraft({
                      ...semesterDraft,
                      weeks_count: Number(e.target.value) || 18,
                    })
                  }
                />
              </div>
            </div>
          ) : (
            /* 登录 / 抓取步骤 */
            <div className="school-fetch-login">
              {fetching && <p className="text-muted">正在获取课表...</p>}

              {error && !fetching && <p className="error-message school-error-detail">✗ {error}</p>}

              {!fetching && !status?.windowOpen && !status?.loggedIn && (
                <div className="school-fetch-hint">
                  <p>尚未登录学校系统。点击下方按钮打开登录窗口：</p>
                  <ul>
                    <li>支持扫码登录 / 账号密码登录 / 微信登录</li>
                    <li>密码不经过本软件，登录后自动接管会话并抓取课表</li>
                    <li>
                      校内选"校内入口"；<strong>校外选"WebVPN 入口"</strong>（在窗口门户中点击
                      "教务处-学生系统"进入课表页面）
                    </li>
                  </ul>
                  <div className="school-entry-buttons">
                    <button className="btn btn-primary" onClick={() => school.openLoginWindow('portal')}>
                      校内入口
                    </button>
                    <button className="btn btn-primary" onClick={() => school.openLoginWindow('webvpn')}>
                      WebVPN 入口（校外）
                    </button>
                  </div>
                </div>
              )}

              {!fetching && status?.windowOpen && (
                <div className="school-fetch-hint">
                  <p>登录窗口已打开，请在窗口中完成登录（建议扫码登录）。</p>
                  <p className="text-muted">
                    登录后进入"课表"页面（WebVPN 门户点"教务处-学生系统"），窗口右下角会显示就绪工具条。
                  </p>
                  <p className="school-fetch-ready">
                    切到课表页面后，点击工具条上的
                    <strong>「我已就绪，开始抓取」</strong>按钮，软件确认后自动抓取并回到本窗口预览。
                  </p>
                </div>
              )}

              {!fetching && !status?.windowOpen && status?.loggedIn && (
                <div className="school-fetch-hint">
                  <p className="success-text">
                    ✓ 已登录学校系统{status.domain ? `（${status.domain}）` : ''}
                  </p>
                  <p className="text-muted">点击"获取课表"抓取本学期课程安排。</p>
                  {status.domains.length > 1 && (
                    <p className="text-muted school-domains">
                      检测到候选域：{status.domains.join('、')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="smart-paste-actions">
          {pendingResult && semesterDraft ? (
            <>
              <button className="btn btn-secondary" onClick={school.cancelSemester}>
                返回
              </button>
              <button className="btn btn-primary" onClick={school.confirmSemester}>
                确认并预览导入
              </button>
            </>
          ) : (
            <>
              <label className="school-remember">
                <input
                  type="checkbox"
                  checked={status?.rememberLogin ?? true}
                  onChange={(e) => school.setRememberLogin(e.target.checked)}
                />
                记住登录（加密保存会话，不保存密码）
              </label>

              {status?.windowOpen && (
                <button className="btn btn-sm" onClick={() => window.api.school.refreshLogin()}>
                  重新检测
                </button>
              )}

              {!status?.windowOpen && status?.loggedIn && (
                <>
                  <button className="btn btn-primary" onClick={school.fetchSchedule} disabled={fetching}>
                    {fetching ? '获取中...' : '获取课表'}
                  </button>
                  <button className="btn btn-secondary" onClick={school.logout}>
                    清除登录
                  </button>
                </>
              )}

              {isDev && (
                <button className="btn btn-sm" onClick={school.fetchScheduleMock} disabled={fetching}>
                  模拟数据（开发）
                </button>
              )}
            </>
          )}

          <button className="btn btn-secondary" onClick={onCancel}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
