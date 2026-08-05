/**
 * 动态字段 UPDATE 拼接工具。
 * 收敛 semester/course/courseEvent/cellAnnotation 四个 repository
 * 中重复的 "逐字段检查 undefined → 拼接 SET 片段" 样板。
 */

export interface UpdateClause {
  clause: string;
  values: unknown[];
}

/**
 * 拼接 UPDATE SET 片段。
 *
 * @param fields 可更新字段的 [列名, 值] 列表，值为 undefined 的字段会被跳过
 * @param expressions 无条件追加的完整 SQL 表达式片段（如 "updated_at = datetime('now')"）
 * @returns 无可更新字段时返回 null，调用方应直接返回现有行
 */
export function buildUpdateClause(
  fields: Array<[column: string, value: unknown] | undefined>,
  expressions: string[] = []
): UpdateClause | null {
  const parts: string[] = [];
  const values: unknown[] = [];

  for (const field of fields) {
    // 整个字段未提供（undefined），或字段值为 undefined（单字段更新场景，
    // 如 { color } 更新时其余字段为 undefined）都要跳过——
    // sql.js 绑定 undefined 参数会抛 "Wrong API use: tried to bind a value of an unknown type"
    if (field === undefined || field[1] === undefined) continue;
    parts.push(`${field[0]} = ?`);
    values.push(field[1]);
  }
  for (const expr of expressions) {
    parts.push(expr);
  }

  if (parts.length === 0) return null;
  return { clause: parts.join(', '), values };
}
