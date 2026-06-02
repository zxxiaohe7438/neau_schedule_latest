import { useState, useEffect } from 'react';

interface LoginPanelProps {
  onLogin: (username: string) => void;
  onCancel: () => void;
  savedUsername?: string;
}

type LoginStep = 'credentials' | 'fetching' | 'confirm';

export function LoginPanel({ onLogin, onCancel, savedUsername }: LoginPanelProps) {
  const [username, setUsername] = useState(savedUsername ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<LoginStep>('credentials');

  // Check for saved session on mount
  useEffect(() => {
    const checkSavedSession = async () => {
      try {
        const status = await window.api.auth.status();
        if (status.loggedIn && status.username) {
          setUsername(status.username);
        }
      } catch {
        // Auth API not available — ignore
      }
    };
    checkSavedSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setWarning('');

    if (!username.trim()) {
      setError('请输入学号');
      return;
    }
    if (!password.trim()) {
      setError('请输入密码');
      return;
    }

    setIsLoading(true);
    try {
      const result = await window.api.auth.login(username.trim(), password);

      if (result.success) {
        if (result.warning) {
          setWarning(result.warning);
        }
        // Login succeeded — move to fetch step
        setStep('fetching');
        await handleFetchSchedule(username.trim());
      } else {
        setError(result.error ?? '登录失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请检查网络');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchSchedule = async (user: string) => {
    try {
      const importResult = await window.api.auth.fetchSchedule(user);

      if (importResult.errors.length > 0) {
        const realErrors = importResult.errors.filter(e => e.field !== 'timeAndPlaceList');
        if (realErrors.length > 0) {
          setError(`获取课表失败: ${realErrors[0].message}`);
          setStep('credentials');
          return;
        }
      }

      if (importResult.total_count === 0 && (!importResult.unscheduled_courses || importResult.unscheduled_courses.length === 0)) {
        setError('未能获取到课表数据');
        setStep('credentials');
        return;
      }

      // Success — pass to import preview via onLogin
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取课表失败');
      setStep('credentials');
    }
  };

  const handleLogout = async () => {
    try {
      await window.api.auth.logout();
      setUsername('');
      setPassword('');
      setStep('credentials');
    } catch {
      // Ignore
    }
  };

  return (
    <div className="login-panel">
      <div className="login-header">
        <h3>连接学校系统</h3>
        <p className="text-muted">登录后自动获取你的课表数据</p>
      </div>

      {step === 'credentials' && (
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="login-username">学号</label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入学号"
              disabled={isLoading}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">密码</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              disabled={isLoading}
              autoComplete="current-password"
            />
            <p className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
              密码使用系统加密存储，或仅本次会话有效
            </p>
          </div>

          {error && <p className="form-error">{error}</p>}
          {warning && <p className="form-warning">{warning}</p>}

          <div className="login-info">
            <h4>说明</h4>
            <ul>
              <li>登录后会自动获取课表数据</li>
              <li>密码使用系统加密存储（如支持）</li>
              <li>如不支持加密，密码仅本次会话保存</li>
              <li>所有数据仅保存在本地</li>
              <li className="text-muted" style={{ fontSize: 12 }}>
                开发模式：使用 test_student / test_pass_123
              </li>
            </ul>
          </div>

          <div className="login-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? '登录中...' : '登录'}
            </button>
          </div>
        </form>
      )}

      {step === 'fetching' && (
        <div className="login-fetching">
          <p>正在获取课表数据...</p>
          <div className="loading-spinner" />
        </div>
      )}

      {step === 'confirm' && (
        <div className="login-confirm">
          <p>课表数据获取成功！</p>
          <div className="login-actions">
            <button className="btn btn-secondary" onClick={handleLogout}>
              切换账号
            </button>
            <button className="btn btn-primary" onClick={() => onLogin(username)}>
              查看课表
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
