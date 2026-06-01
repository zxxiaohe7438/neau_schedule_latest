import { useState } from 'react';

interface LoginPanelProps {
  onLogin: (username: string) => void;
  onCancel: () => void;
  savedUsername?: string;
}

export function LoginPanel({ onLogin, onCancel, savedUsername }: LoginPanelProps) {
  const [username, setUsername] = useState(savedUsername ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('请输入学号');
      return;
    }

    setIsLoading(true);
    try {
      // Save username locally (not password)
      onLogin(username.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-panel">
      <div className="login-header">
        <h3>连接学校系统</h3>
        <p className="text-muted">用于获取你的课表数据</p>
      </div>

      <form onSubmit={handleSubmit} className="login-form">
        <div className="form-group">
          <label>学号</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="请输入学号"
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label>密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码（不保存）"
            disabled={isLoading}
          />
          <p className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
            密码仅用于本次登录，不会保存到本地
          </p>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="login-info">
          <h4>说明</h4>
          <ul>
            <li>本软件不保存你的密码</li>
            <li>登录后会打开浏览器，你需要手动完成验证码</li>
            <li>登录成功后会自动获取课表数据</li>
            <li>所有数据仅保存在本地</li>
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
    </div>
  );
}
