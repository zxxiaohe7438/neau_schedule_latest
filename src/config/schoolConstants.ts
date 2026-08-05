/**
 * 学校官网课表抓取相关常量。
 *
 * 联网边界：仅允许连接 *.neau.edu.cn 官方域名下的课表接口，
 * 不接入任何第三方服务，不保存密码。
 */

/** 学生系统入口页（自动跳转统一身份认证登录页） */
export const SCHOOL_PORTAL_URL = 'https://jwc.neau.edu.cn/xsfw1/xsxt.htm';

/** 校外 WebVPN 入口页（登录后门户内有各系统链接，教务系统映射为 {内网主机}-{端口}.webvpn.neau.edu.cn） */
export const SCHOOL_WEBVPN_URL = 'https://webvpn.neau.edu.cn/';

/** 本学期课表接口（相对路径，域名随登录窗口实际所在域自适应） */
export const SCHOOL_API_PATH =
  '/student/courseSelect/thisSemesterCurriculum/ajaxStudentSchedule/callback';

/** 学校官方域名后缀（含子域匹配） */
export const SCHOOL_DOMAIN_SUFFIX = 'neau.edu.cn';

/** 统一身份认证域名（不作为课表 API 域，仅用于识别登录页） */
export const SCHOOL_AUTH_HOSTS = ['authserver.neau.edu.cn', 'cas.neau.edu.cn'];

/** WebVPN 认证映射域前缀（如 authserver-443.webvpn.neau.edu.cn，非课表 API 域） */
export const WEBVPN_AUTH_HOST_PREFIXES = ['authserver-', 'cas-'];

/** 会话文件（safeStorage 加密备份，位于 {userData}/data/） */
export const SCHOOL_SESSION_FILE_NAME = 'school-session.json';

/** 学校设置文件（记住登录开关，位于 {userData}/data/） */
export const SCHOOL_SETTINGS_FILE_NAME = 'school-settings.json';

/**
 * 抓取/登录窗口统一使用的浏览器 UA。
 * 学校 WebVPN 对非标准浏览器 UA 敏感（Edge 可登录、Chrome 内核可能被拒），
 * 登录窗口（Electron/Chromium 内核）与课表接口请求必须使用一致的 Edge 风格 UA。
 */
export const SCHOOL_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0';

/** 是否为学校官方域名（含子域） */
export function isSchoolDomain(host: string): boolean {
  const h = host.toLowerCase();
  return h === SCHOOL_DOMAIN_SUFFIX || h.endsWith(`.${SCHOOL_DOMAIN_SUFFIX}`);
}

/** 是否为统一身份认证登录域名或 WebVPN 认证映射域（不算作课表 API 域） */
export function isAuthServerHost(host: string): boolean {
  const h = host.toLowerCase();
  if (SCHOOL_AUTH_HOSTS.some((auth) => h === auth)) return true;
  // WebVPN 映射域：authserver-443.webvpn.neau.edu.cn 之类（{内网主机}-{端口}.webvpn.neau.edu.cn）
  if (h.endsWith('.webvpn.neau.edu.cn')) {
    return WEBVPN_AUTH_HOST_PREFIXES.some((prefix) => h.startsWith(prefix));
  }
  return false;
}
