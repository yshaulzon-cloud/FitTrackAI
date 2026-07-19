// Small presentational building blocks shared across sidebar sections.

export function Section({ title, hint, children }) {
  return (
    <section className="hz-sec">
      <div className="hz-sec__head">
        <span className="hz-sec__title">{title}</span>
        {hint && <span className="hz-sec__hint">{hint}</span>}
      </div>
      <div className="hz-sec__body">{children}</div>
    </section>
  );
}

export function Row({ children }) {
  return <div className="hz-row">{children}</div>;
}

export function Btn({ children, onClick, tone = 'default', disabled, title }) {
  return (
    <button
      type="button"
      className={`hz-btn hz-btn--${tone}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}

// A pair/group of segmented options (theme, language, …).
export function Seg({ options, value, onChange }) {
  return (
    <div className="hz-seg">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`hz-seg__opt${value === o.value ? ' hz-seg__opt--on' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
