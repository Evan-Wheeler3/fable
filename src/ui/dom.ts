type Kid = Node | string | null | undefined | false;

/** Tiny element builder: h('div', { class: 'x', onclick: fn }, child, 'text'). */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, unknown> = {}, ...kids: Kid[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (k === 'style') el.setAttribute('style', String(v));
    else if (k in el && k !== 'list') (el as unknown as Record<string, unknown>)[k] = v;
    else el.setAttribute(k, String(v));
  }
  for (const kid of kids) if (kid) el.append(kid);
  return el;
}

/** Labelled range slider with a live value read-out. */
export function slider(label: string, min: number, max: number, step: number, value: number, onInput: (v: number) => void, fmt: (v: number) => string = (v) => v.toFixed(2)): HTMLElement {
  const out = h('span', { class: 'val' }, fmt(value));
  const input = h('input', {
    type: 'range',
    min: String(min),
    max: String(max),
    step: String(step),
    'aria-label': label,
    oninput: () => {
      const v = Number(input.value);
      out.textContent = fmt(v);
      onInput(v);
    },
  });
  input.value = String(value);
  return h('label', { class: 'ctl' }, h('span', { class: 'lbl' }, label), input, out);
}

export function select(label: string, options: string[], value: string, onChange: (v: string) => void): HTMLElement {
  const sel = h('select', { 'aria-label': label, onchange: () => onChange(sel.value) }, ...options.map((o) => h('option', { value: o }, o)));
  sel.value = value;
  return h('label', { class: 'ctl sel' }, h('span', { class: 'lbl' }, label), sel);
}
