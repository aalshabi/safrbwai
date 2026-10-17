/**
 * Minimal robots.txt reading (RFC 9309): the reader honours a site's wish not
 * to be fetched automatically. Groups for our user agent take precedence over
 * "*"; within a group the longest matching rule wins and Allow wins a tie.
 * Supports the `*` wildcard and the `$` end anchor.
 */

export const READER_AGENT = "SafrBwaiBot";

interface Rule {
  allow: boolean;
  pattern: string;
}

function parseGroups(robotsTxt: string): { agents: string[]; rules: Rule[] }[] {
  const groups: { agents: string[]; rules: Rule[] }[] = [];
  let current: { agents: string[]; rules: Rule[] } | null = null;
  let lastWasAgent = false;
  for (const rawLine of robotsTxt.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    const match = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!match) continue;
    const key = match[1].toLowerCase();
    const value = match[2].trim();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) groups.push((current = { agents: [], rules: [] }));
      // The product token only: "SafrBwaiBot/1.0" → "safrbwaibot".
      const token = value.split("/")[0].trim().toLowerCase();
      if (token) current.agents.push(token);
      lastWasAgent = true;
    } else if ((key === "allow" || key === "disallow") && current) {
      // An empty Disallow allows everything; it adds no rule.
      if (value) current.rules.push({ allow: key === "allow", pattern: value });
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }
  return groups;
}

function patternLength(pattern: string): number {
  return pattern.replace(/\*/g, "").replace(/\$$/, "").length;
}

function matches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const regex = new RegExp(
    "^" + body.split("*").map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + (anchored ? "$" : "")
  );
  return regex.test(path);
}

/** Whether `pathWithQuery` may be fetched by `agent` under this robots.txt. */
export function isAllowedByRobots(robotsTxt: string, pathWithQuery: string, agent = READER_AGENT): boolean {
  const groups = parseGroups(robotsTxt);
  const name = agent.toLowerCase();
  // Exact, case-insensitive product-token match (RFC 9309), not a substring.
  const own = groups.filter((g) => g.agents.includes(name));
  const applicable = own.length > 0 ? own : groups.filter((g) => g.agents.includes("*"));
  let best: Rule | null = null;
  for (const rule of applicable.flatMap((g) => g.rules)) {
    if (!matches(rule.pattern, pathWithQuery)) continue;
    const longer = !best || patternLength(rule.pattern) > patternLength(best.pattern);
    const tieAllow = best && patternLength(rule.pattern) === patternLength(best.pattern) && rule.allow;
    if (longer || tieAllow) best = rule;
  }
  return best ? best.allow : true;
}
