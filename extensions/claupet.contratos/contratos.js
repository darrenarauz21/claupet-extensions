"use strict";
// Contratos Claupet, sin dependencias: lee los minicontratos de un proyecto (.claupet/contratos), del perfil de la
// persona y los paquetes de Claupet que trae esta extensión (paquetes/), y los resuelve por capas como «cpt». El formato
// está en docs/contratos/especificacion.md del repositorio de Claupet.
const fs = require("fs");
const path = require("path");
const os = require("os");

const TYPES = ["base", "calidad", "estilo", "capacidad", "mapa", "leccion", "perfil"];
/** Carpetas del proyecto que no son contratos. */
const NOT_CONTRACTS = [".generado", "cambios", "propuestas", "feedback"];
const LAYER_NAMES = { claupet: "Claupet", perfil: "perfil", proyecto: "proyecto" };
const RULE = /^\s*[-*]\s+\[([a-z0-9][a-z0-9-]*)\]\s*(.*)$/;
const CHECK = /`check:\s*([a-z0-9][a-z0-9-]*)`/g;

// ── Leer un minicontrato ──────────────────────────────────────────────────────────────────────

/** La línea sin su comentario («# …» fuera de comillas). */
function stripComment(line) {
  let quote = "";
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) { if (c === quote) quote = ""; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === "#" && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}

function unquote(value) {
  return value.length >= 2 && ((value[0] === '"' && value.endsWith('"')) || (value[0] === "'" && value.endsWith("'")))
    ? value.slice(1, -1) : value;
}

/** «a, "b, c", d» → ["a", "b, c", "d"]. */
function splitList(inner) {
  const items = [];
  let current = "";
  let quote = "";
  const add = () => { const item = current.trim(); if (item) items.push(item); current = ""; };
  for (const c of inner) {
    if (quote) { if (c === quote) quote = ""; else current += c; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === ",") { add(); continue; }
    current += c;
  }
  add();
  return items;
}

/** La cabecera YAML que usa el formato: «clave: valor», listas «[a, b]» o con guiones, comillas y comentarios. */
function readHeader(lines, file, issues) {
  const result = {};
  let listKey = null;
  for (const raw of lines) {
    const line = stripComment(raw);
    if (!line.trim()) continue;
    const trimmed = line.trimStart();
    if (trimmed.startsWith("- ") || trimmed === "-") {
      if (listKey === null || !Array.isArray(result[listKey])) {
        issues.push({ file, message: `Elemento de lista sin clave: «${raw.trim()}».` });
        continue;
      }
      result[listKey].push(unquote(trimmed.slice(1).trim()));
      continue;
    }
    const colon = line.indexOf(":");
    if (colon <= 0 || /\s/.test(line[0])) {
      issues.push({ file, message: `Línea de la cabecera que no se entiende: «${raw.trim()}».` });
      listKey = null;
      continue;
    }
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (!value) { result[key] = []; listKey = key; }
    else if (value.startsWith("[")) { result[key] = splitList(value.replace(/^\[+/, "").replace(/\]+$/, "")); listKey = null; }
    else { result[key] = unquote(value); listKey = null; }
  }
  return result;
}

const MODES = { nuevo: "nuevo", new: "nuevo", amplia: "amplia", "amplía": "amplia", extend: "amplia", reemplaza: "reemplaza", replace: "reemplaza", apaga: "apaga", off: "apaga" };

/** Un minicontrato tal como está en su archivo, antes de juntar las capas. */
function parse(text, file, layer) {
  const doc = { file, layer, id: "", type: "", title: "", summary: "", appliesTo: [], tags: [], required: null, mode: "nuevo", offRules: [], body: "", rules: [], issues: [] };
  text = text.replace(/\r\n/g, "\n").replace(/^﻿/, "");
  const lines = text.split("\n");
  let start = 0;
  while (start < lines.length && !lines[start].trim()) start++;
  if (start >= lines.length || lines[start].trim() !== "---") {
    doc.issues.push({ file, message: "Falta la cabecera entre «---»." });
    doc.body = text;
    return doc;
  }
  let end = -1;
  for (let i = start + 1; i < lines.length; i++) if (lines[i].trim() === "---") { end = i; break; }
  if (end < 0) {
    doc.issues.push({ file, message: "La cabecera no se cierra con «---»." });
    doc.body = text;
    return doc;
  }
  const header = readHeader(lines.slice(start + 1, end), file, doc.issues);
  for (const [key, value] of Object.entries(header)) {
    const text1 = typeof value === "string" ? value : "";
    const list = Array.isArray(value) ? value : text1 ? [text1] : [];
    switch (key) {
      case "id": doc.id = text1.trim(); break;
      case "tipo": doc.type = text1.trim().toLowerCase(); break;
      case "titulo": doc.title = text1; break;
      case "resumen": doc.summary = text1; break;
      case "aplica": doc.appliesTo = list; break;
      case "etiquetas": doc.tags = list; break;
      case "apaga_reglas": doc.offRules = list; break;
      case "prioridad": {
        const p = text1.toLowerCase();
        doc.required = p === "obligatoria" || p === "required" ? true : p === "recomendada" || p === "recommended" ? false : null;
        if (doc.required === null) doc.issues.push({ file, message: `«prioridad» debe ser obligatoria o recomendada, no «${text1}».` });
        break;
      }
      case "modo": {
        const m = MODES[text1.toLowerCase()];
        if (m) doc.mode = m;
        else doc.issues.push({ file, message: `«modo» debe ser nuevo, amplia, reemplaza o apaga, no «${text1}».` });
        break;
      }
      default: break;
    }
  }
  doc.body = lines.slice(end + 1).join("\n").replace(/^\n+|\n+$/g, "");
  // Las reglas: «- [id] texto `check: nombre`», fuera de los bloques de código.
  let fence = false;
  const seen = new Set();
  for (const line of doc.body.split("\n")) {
    if (line.trimStart().startsWith("```")) { fence = !fence; continue; }
    if (fence) continue;
    const m = RULE.exec(line);
    if (!m) continue;
    const id = m[1];
    const checks = [...m[2].matchAll(CHECK)].map((c) => c[1]);
    const ruleText = m[2].replace(CHECK, "").trim();
    if (seen.has(id)) { doc.issues.push({ file, message: `La regla «${id}» está repetida.` }); continue; }
    seen.add(id);
    doc.rules.push({ id, text: ruleText, checks, layer, off: false });
  }
  if (!doc.id) doc.issues.push({ file, message: "Falta «id»." });
  return doc;
}

// ── Las capas ─────────────────────────────────────────────────────────────────────────────────

/** La carpeta de contratos del proyecto: .claupet/contratos desde aquí hacia arriba, como git. */
function findProject(from) {
  let dir = path.resolve(from);
  for (;;) {
    const candidate = path.join(dir, ".claupet", "contratos");
    try { if (fs.statSync(candidate).isDirectory()) return candidate; } catch { /* sigue subiendo */ }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** Los contratos de la persona: CLAUPET_CONTRATOS_PERFIL, o %APPDATA%\Claupet\contratos (macOS y Linux: ~/.config/claupet/contratos). */
function profileFolder(env = process.env) {
  if (env.CLAUPET_CONTRATOS_PERFIL) return env.CLAUPET_CONTRATOS_PERFIL;
  if (process.platform === "win32") return path.join(env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "Claupet", "contratos");
  return path.join(env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"), "claupet", "contratos");
}

/** Los .md de una carpeta y sus subcarpetas, salvo lo que no son contratos. label: cómo se nombra el archivo. */
function loadFolder(folder, layer, label) {
  const docs = [];
  if (!folder) return docs;
  const files = [];
  const walk = (dir) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.endsWith(".md")) files.push(full);
    }
  };
  walk(folder);
  files.sort();
  for (const file of files) {
    const relative = path.relative(folder, file).split(path.sep).join("/");
    if (NOT_CONTRACTS.some((n) => relative.startsWith(n + "/"))) continue;
    if (relative.startsWith(".") || relative.toLowerCase() === "readme.md") continue;
    if (path.basename(file, ".md").includes(".")) continue;
    let text;
    try { text = fs.readFileSync(file, "utf8"); } catch { continue; }
    docs.push(parse(text, label ? label(relative) : file, layer));
  }
  return docs;
}

function fromDoc(doc) {
  return {
    id: doc.id, type: doc.type, title: doc.title, summary: doc.summary, appliesTo: [...doc.appliesTo], tags: [...doc.tags],
    required: doc.required ?? false, enabled: true, layer: doc.layer, rules: doc.rules.map((r) => ({ ...r })), body: doc.body,
    sources: [{ layer: doc.layer, file: doc.file, mode: doc.mode }],
  };
}

/** Junta las capas (Claupet, perfil, proyecto): gana la de arriba según su modo. */
function resolve(builtIn, profile, project) {
  const set = { contracts: [], issues: [] };
  const byId = new Map();
  const order = [];
  for (const layer of [builtIn, profile, project]) {
    const seenInLayer = new Set();
    for (const doc of layer) {
      set.issues.push(...doc.issues);
      if (!doc.id) continue;
      const key = doc.id.toLowerCase();
      if (seenInLayer.has(key)) { set.issues.push({ file: doc.file, message: `El id «${doc.id}» ya está en otro archivo de la misma capa.` }); continue; }
      seenInLayer.add(key);
      const existing = byId.get(key);
      if (doc.mode === "nuevo" && existing) {
        set.issues.push({ file: doc.file, message: `El id «${doc.id}» ya existe en la capa ${LAYER_NAMES[existing.layer]}: usa «modo: amplia», «reemplaza» o «apaga», o cambia el id.` });
      } else if (doc.mode === "nuevo" || doc.mode === "reemplaza") {
        const fresh = fromDoc(doc);
        if (existing) fresh.sources.unshift(...existing.sources);
        else order.push(key);
        byId.set(key, fresh);
      } else if (!existing) {
        set.issues.push({ file: doc.file, message: `«modo: ${doc.mode}» pero no hay un «${doc.id}» debajo: no hace nada.` });
      } else if (doc.mode === "amplia") {
        if (doc.title) existing.title = doc.title;
        if (doc.summary) existing.summary = doc.summary;
        if (doc.appliesTo.length) existing.appliesTo = [...doc.appliesTo];
        for (const tag of doc.tags) if (!existing.tags.includes(tag)) existing.tags.push(tag);
        if (doc.required !== null) existing.required = doc.required;
        for (const rule of doc.rules) {
          const i = existing.rules.findIndex((r) => r.id === rule.id);
          if (i >= 0) existing.rules[i] = { ...rule }; else existing.rules.push({ ...rule });
        }
        if (doc.body) existing.body = (existing.body + "\n\n" + doc.body).trim();
        existing.sources.push({ layer: doc.layer, file: doc.file, mode: doc.mode });
      } else if (doc.mode === "apaga") {
        existing.enabled = false;
        existing.offBy = doc.layer;
        existing.sources.push({ layer: doc.layer, file: doc.file, mode: doc.mode });
      }
      const target = byId.get(key);
      if (target && doc.offRules.length) {
        for (const id of doc.offRules) {
          const i = target.rules.findIndex((r) => r.id === id);
          if (i < 0) set.issues.push({ file: doc.file, message: `«apaga_reglas» nombra «${id}», que no está en «${target.id}».` });
          else target.rules[i] = { ...target.rules[i], off: true };
        }
      }
    }
  }
  const rank = (type) => { const i = TYPES.indexOf(type); return i >= 0 ? i : TYPES.length; };
  set.contracts = order.map((k) => byId.get(k))
    .sort((a, b) => rank(a.type) - rank(b.type) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return set;
}

/** Los contratos de la carpeta donde trabaja el agente: los paquetes de Claupet, el perfil y el proyecto. */
function load(cwd, packagesFolder, env = process.env) {
  const project = findProject(cwd);
  const set = resolve(
    loadFolder(packagesFolder, "claupet", (rel) => "claupet:" + rel),
    loadFolder(profileFolder(env), "perfil"),
    loadFolder(project, "proyecto"));
  set.projectFolder = project;
  return set;
}

// ── Lo que ven los agentes ──────────────────────────────────────────────────────────────────

const activeRules = (c) => c.rules.filter((r) => !r.off);

/** Una estimación de los tokens que ocupa leerlo (unos 4 caracteres por token), como cpt. */
function tokens(c) {
  return Math.floor((c.title.length + c.summary.length + c.body.length + c.rules.reduce((n, r) => n + r.text.length + r.id.length + 6, 0)) / 4) + 20;
}

/** El índice: el mismo de «cpt contracts index». */
function index(set) {
  return {
    formato: 1,
    contratos: set.contracts.map((c) => ({
      id: c.id, tipo: c.type, titulo: c.title, resumen: c.summary, aplica: c.appliesTo, etiquetas: c.tags,
      prioridad: c.required ? "obligatoria" : "recomendada", capa: LAYER_NAMES[c.layer], activo: c.enabled,
      reglas: activeRules(c).length, tokens: tokens(c),
    })),
  };
}

/** Minúsculas y sin tildes. */
function fold(text) {
  return text.toLowerCase().replace(/[áàäâ]/g, "a").replace(/[éèëê]/g, "e").replace(/[íìïî]/g, "i")
    .replace(/[óòöô]/g, "o").replace(/[úùüû]/g, "u").replace(/ñ/g, "n");
}

/** Busca por id, título, etiqueta, resumen o texto de las reglas; lo más parecido primero. */
function search(set, query) {
  const words = fold(query).split(/[ ,;]+/).filter(Boolean);
  if (!words.length) return [];
  const hits = [];
  for (const c of set.contracts) {
    let score = 0;
    const rules = [];
    for (const w of words) {
      if (fold(c.id).includes(w) || fold(c.title).includes(w)) score += 3;
      if (c.tags.some((t) => fold(t).includes(w))) score += 2;
      if (fold(c.summary).includes(w)) score += 2;
      for (const r of activeRules(c).filter((r) => fold(r.text).includes(w) || r.id.includes(w))) {
        score += 1;
        if (!rules.includes(r)) rules.push(r);
      }
    }
    if (score > 0) hits.push({ contract: c, score, rules });
  }
  return hits.sort((a, b) => b.score - a.score || (a.contract.id < b.contract.id ? -1 : 1));
}

/** El cuerpo sin las reglas (ya van en su lista) ni un «## Reglas» que quedó vacío. */
function bodyWithoutRules(body) {
  const lines = body.split("\n").filter((l) => !/^\s*[-*]\s+\[[a-z0-9][a-z0-9-]*\]/.test(l));
  for (let i = lines.length - 1; i >= 0; i--) {
    const t = lines[i].trimStart();
    if (!/^## (reglas|rules)/i.test(t)) continue;
    const next = lines.slice(i + 1).find((l) => l.trim());
    if (next === undefined || next.trimStart().startsWith("## ")) lines.splice(i, 1);
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Un contrato completo, como «cpt contracts read». */
function render(c, es) {
  const S = (a, b) => (es ? a : b);
  let out = `# ${c.title} (${c.id})\n${c.summary}\n`;
  out += c.required ? S("Obligatorio", "Required") : S("Recomendado", "Recommended");
  if (!c.enabled) out += S(" · apagado", " · off");
  out += ` · ${S("aplica a ", "applies to ")}${c.appliesTo.join(", ")}\n\n`;
  const rules = activeRules(c);
  if (rules.length) out += S("## Reglas\n", "## Rules\n") + rules.map((r) => `- [${r.id}] ${r.text}\n`).join("") + "\n";
  const body = bodyWithoutRules(c.body);
  if (body) out += body + "\n";
  return out.trimEnd();
}

/** Hasta dónde llegan las instrucciones: lo que sobra se lee con las herramientas. */
const MAX_INSTRUCTIONS = 8000;

/**
 * Lo que el agente lee al conectarse: cómo usar los contratos y, si la carpeta es de un proyecto con contratos, sus
 * reglas obligatorias para todos los archivos, completas, para que las cumpla desde el primer paso. Las obligatorias de
 * algunas rutas van solo por nombre: se leen al tocar esos archivos.
 */
function instructions(set, es) {
  const S = (a, b) => (es ? a : b);
  let text = S(
    "Contratos Claupet: las reglas de este proyecto. No leas todo: usa contract_search con el tema de la tarea y contract_read con los ids que necesites. Los obligatorios se cumplen siempre.",
    "Claupet Contracts: the rules of this project. Don't read everything: use contract_search with the task's topic and contract_read with the ids you need. Required ones always apply.");
  if (!set.projectFolder) return text;
  const required = set.contracts.filter((c) => c.enabled && c.required);
  const everywhere = required.filter((c) => !c.appliesTo.length || c.appliesTo.some((p) => p === "**/*" || p === "**" || p === "*"));
  const someFiles = required.filter((c) => !everywhere.includes(c));
  if (everywhere.length) {
    text += "\n\n" + S("Reglas obligatorias de este proyecto: cúmplelas siempre, sin que te lo pidan.", "Required rules of this project: always follow them, without being asked.");
    for (const c of everywhere) {
      text += `\n\n${c.title} (${c.id})`;
      for (const r of activeRules(c)) text += `\n- [${r.id}] ${r.text}`;
    }
  }
  if (someFiles.length) {
    text += "\n\n" + S("Obligatorias al tocar ciertos archivos (léelas con contract_read antes):", "Required when you touch certain files (read them with contract_read first):");
    for (const c of someFiles) text += `\n- ${c.id}: ${c.title} · ${c.appliesTo.join(", ")}`;
  }
  if (text.length <= MAX_INSTRUCTIONS) return text;
  const cut = text.slice(0, MAX_INSTRUCTIONS);
  return cut.slice(0, Math.max(0, cut.lastIndexOf("\n"))) + "\n" + S("(Siguen más: contract_list.)", "(More follow: contract_list.)");
}

module.exports = { parse, resolve, load, loadFolder, findProject, profileFolder, index, search, render, instructions, fold, MAX_INSTRUCTIONS };
