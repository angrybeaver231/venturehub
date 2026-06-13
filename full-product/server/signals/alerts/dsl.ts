import type { SignalEvent, Startup } from "@shared/schema";

export type DslOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "in";
export type DslCondition = { field: string; op: DslOp; value: any };
export type DslExpr = { all?: DslExprChild[]; any?: DslExprChild[] };
export type DslExprChild = DslCondition | DslExpr;

function isExpr(x: any): x is DslExpr {
  return x && typeof x === "object" && (Array.isArray(x.all) || Array.isArray(x.any));
}

function getPath(obj: any, path: string): any {
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function compare(left: any, op: DslOp, right: any): boolean {
  switch (op) {
    case "eq":
      return left === right;
    case "neq":
      return left !== right;
    case "gt":
      return Number(left) > Number(right);
    case "gte":
      return Number(left) >= Number(right);
    case "lt":
      return Number(left) < Number(right);
    case "lte":
      return Number(left) <= Number(right);
    case "contains":
      if (Array.isArray(left)) return left.includes(right);
      if (typeof left === "string") return left.toLowerCase().includes(String(right).toLowerCase());
      return false;
    case "in":
      return Array.isArray(right) && right.includes(left);
    default:
      return false;
  }
}

export type EvalContext = { event: SignalEvent; startup?: Startup | null };

export function evaluate(expr: any, ctx: EvalContext): boolean {
  if (!expr) return false;
  if (isExpr(expr)) {
    if (expr.all && expr.all.length > 0) {
      return expr.all.every((c) => evaluate(c, ctx));
    }
    if (expr.any && expr.any.length > 0) {
      return expr.any.some((c) => evaluate(c, ctx));
    }
    return false;
  }
  const cond = expr as DslCondition;
  const value = getPath({ event: ctx.event, startup: ctx.startup ?? {} }, cond.field);
  return compare(value, cond.op, cond.value);
}

export function describe(expr: any): string {
  if (!expr) return "(empty)";
  if (isExpr(expr)) {
    const join = expr.all ? " AND " : " OR ";
    const arr = expr.all ?? expr.any ?? [];
    return "(" + arr.map(describe).join(join) + ")";
  }
  const c = expr as DslCondition;
  return `${c.field} ${c.op} ${JSON.stringify(c.value)}`;
}
