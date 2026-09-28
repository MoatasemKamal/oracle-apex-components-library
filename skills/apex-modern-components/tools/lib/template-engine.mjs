// Minimal offline renderer for APEX template-component markup, for previews only.
// Supports #NAME#, #NAME!ATTR#, #NAME!RAW#, {if [!][?]NAME/}{elseif ...}{else/}{endif/},
// {case NAME/}{when v/}{otherwise/}{endcase/}. APEX itself remains the real renderer.

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" };
const escHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

function tokenize(src) {
  const re = /\{(if|elseif|else|endif|case|when|otherwise|endcase)(?:\s+([^/}]*))?\/\}/g;
  const out = [];
  let last = 0;
  let m;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push({ t: "text", v: src.slice(last, m.index) });
    out.push({ t: m[1], v: (m[2] || "").trim() });
    last = re.lastIndex;
  }
  if (last < src.length) out.push({ t: "text", v: src.slice(last) });
  return out;
}

function parse(tokens, i = 0, stop = []) {
  const nodes = [];
  while (i < tokens.length) {
    const tok = tokens[i];
    if (stop.includes(tok.t)) return [nodes, i];
    if (tok.t === "text") {
      nodes.push(tok);
      i += 1;
    } else if (tok.t === "if") {
      const branches = [];
      let cond = tok.v;
      i += 1;
      for (;;) {
        const [body, j] = parse(tokens, i, ["elseif", "else", "endif"]);
        branches.push({ cond, body });
        const end = tokens[j];
        if (!end) throw new Error("unterminated {if}");
        i = j + 1;
        if (end.t === "endif") break;
        cond = end.t === "else" ? null : end.v;
      }
      nodes.push({ t: "if", branches });
    } else if (tok.t === "case") {
      const node = { t: "case", name: tok.v, whens: [], otherwise: [] };
      i += 1;
      const [, j0] = parse(tokens, i, ["when", "otherwise", "endcase"]);
      i = j0;
      while (tokens[i] && tokens[i].t !== "endcase") {
        const head = tokens[i];
        const [body, j] = parse(tokens, i + 1, ["when", "otherwise", "endcase"]);
        if (head.t === "when") node.whens.push({ value: head.v, body });
        else node.otherwise = body;
        i = j;
      }
      nodes.push(node);
      i += 1;
    } else {
      throw new Error(`unexpected {${tok.t}/}`);
    }
  }
  return [nodes, i];
}

function test(cond, values) {
  let negate = false;
  let exists = false;
  let name = cond;
  if (name.startsWith("!")) { negate = true; name = name.slice(1); }
  if (name.startsWith("?")) { exists = true; name = name.slice(1); }
  const v = values[name];
  const empty = v === undefined || v === null || v === "";
  const result = exists ? !empty : !(empty || v === "N" || v === "false");
  return negate ? !result : result;
}

function substitute(text, values, escapes) {
  return text.replace(/#([A-Z][A-Z0-9_$]*)(?:!([A-Z]+))?#/g, (all, name, mod) => {
    if (!(name in values)) return all;
    const raw = values[name] ?? "";
    if (mod === "RAW" || name.startsWith("APEX$")) return String(raw);
    return escHtml(raw); // HTML and ATTR escaping are equivalent for preview purposes
  });
}

function render(nodes, values) {
  return nodes
    .map((n) => {
      if (n.t === "text") return substitute(n.v, values);
      if (n.t === "if") {
        const hit = n.branches.find((b) => b.cond === null || test(b.cond, values));
        return hit ? render(hit.body, values) : "";
      }
      const v = String(values[n.name] ?? "");
      const hit = n.whens.find((w) => w.value === v);
      return render(hit ? hit.body : n.otherwise, values);
    })
    .join("");
}

export function renderTemplate(src, values) {
  return render(parse(tokenize(src))[0], values);
}

export function renderComponent(templates, { mode, settings = {}, rows = [] }) {
  if (mode === "partial") return renderTemplate(templates.partial, settings);
  const body = rows
    .map((row) => {
      const values = { ...settings, ...row };
      const partial = renderTemplate(templates.partial, values);
      return renderTemplate(templates.reportRow, { ...values, APEX$PARTIAL: partial });
    })
    .join("\n");
  return renderTemplate(templates.reportBody, { ...settings, APEX$ROWS: body });
}
