import { useState, useEffect, useRef } from 'react';

interface AccountSwitcherProps {
  activeUsername: string | null;
  onSwitch: (username: string) => void;
  onLogout: () => void;
  onAddAccount: () => void;
}

export function AccountSwitcher({
  activeUsername,
  onSwitch,
  onLogout,
  onAddAccount,
}: AccountSwitcherProps) {
  const [accounts, setAccounts] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAccounts();
  }, [activeUsername]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadAccounts() {
    try {
      const list = await window.api.auth.listAccounts();
      setAccounts(list);
    } catch {
      setAccounts([]);
    }
  }

  if (!activeUsername) return null;

  return (
    <div className="account-switcher" ref={dropdownRef}>
      <button
        className="account-switcher-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="account-avatar">
          {activeUsername.charAt(0).toUpperCase()}
        </span>
        <span className="account-name">{activeUsername}</span>
        <span className="account-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="account-dropdown">
          <div className="account-dropdown-header">已保存的账号</div>
          {accounts.map((username) => (
            <button
              key={username}
              className={`account-dropdown-item ${username === activeUsername ? 'active' : ''}`}
              onClick={() => {
                if (username !== activeUsername) {
                  onSwitch(username);
                }
                setIsOpen(false);
              }}
            >
              <span className="account-avatar-small">
                {username.charAt(0).toUpperCase()}
              </span>
              <span>{username}</span>
              {username === activeUsername && (
                <span className="account-check">✓</span>
              )}
            </button>
          ))}
          <div className="account-dropdown-divider" />
          <button
            className="account-dropdown-item"
            onClick={() => {
              onAddAccount();
              setIsOpen(false);
            }}
          >
            <span className="account-icon">+</span>
            <span>添加账号</span>
          </button>
          <button
            className="account-dropdown-item danger"
            onClick={() => {
              onLogout();
              setIsOpen(false);
            }}
          >
            <span className="account-icon">↗</span>
            <span>退出当前账号</span>
          </button>
        </div>
      )}
    </div>
  );
}
