import { useState, useEffect } from 'react';
import { Search, Star } from 'lucide-react';
import { CATALOG, type CatalogItem } from '../../domain/catalog';
export function CatalogPanel({
  onAdd,
  initialCategory,
  notify,
}: {
  onAdd: (item: CatalogItem) => void;
  initialCategory: string;
  notify: (s: string) => void;
}) {
  const [search, setSearch] = useState(''),
    [category, setCategory] = useState(initialCategory),
    [favorites, setFavorites] = useState<string[]>(() => {
      try {
        const saved = JSON.parse(localStorage.getItem('officeflow.catalog.favorites') ?? '[]');
        return Array.isArray(saved) ? saved.filter((id: unknown) => typeof id === 'string') : [];
      } catch {
        return [];
      }
    }),
    [onlyFavorites, setOnlyFavorites] = useState(false);
  useEffect(() => setCategory(initialCategory), [initialCategory]);
  return (
    <div className="inspector-section">
      <div className="inspector-heading">
        <h3>Objektbibliothek</h3>
        <button
          aria-label="Nur Favoriten"
          aria-pressed={onlyFavorites}
          onClick={() => setOnlyFavorites((v) => !v)}
        >
          <Star size={16} fill={onlyFavorites ? 'currentColor' : 'none'} />
        </button>
      </div>
      <p className="muted">Vektorobjekte für Ihre Büroetage</p>
      <label className="search-field">
        <Search size={16} />
        <input
          aria-label="Objektkatalog durchsuchen"
          placeholder="Objekt suchen …"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <select aria-label="Katalogkategorie" value={category} onChange={(e) => setCategory(e.target.value)}>
        {['Alle', ...new Set(CATALOG.map((c) => c.category))].map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <div className="catalog-grid">
        {CATALOG.filter(
          (c) =>
            (category === 'Alle' || c.category === category) &&
            (!onlyFavorites || favorites.includes(c.id)) &&
            c.name.toLocaleLowerCase('de-DE').includes(search.toLocaleLowerCase('de-DE')),
        ).map((c) => (
          <div key={c.id} className="catalog-item">
            <button className="catalog-add" aria-label={`${c.name} hinzufügen`} onClick={() => onAdd(c)}>
              <span className={`catalog-glyph glyph-${c.type}`}>
                <CatalogGlyph item={c} />
              </span>
              <strong>{c.name}</strong>
              <small>{c.type === 'resource' || c.type === 'cluster' ? 'Buchbar' : c.category}</small>
            </button>
            <button
              className="catalog-favorite"
              aria-label={`${c.name} als Favorit`}
              aria-pressed={favorites.includes(c.id)}
              onClick={() => {
                const next = favorites.includes(c.id)
                  ? favorites.filter((id) => id !== c.id)
                  : [...favorites, c.id];
                setFavorites(next);
                try {
                  localStorage.setItem('officeflow.catalog.favorites', JSON.stringify(next));
                } catch {
                  notify('Favoriten konnten nicht gespeichert werden.');
                }
              }}
            >
              <Star size={12} fill={favorites.includes(c.id) ? 'currentColor' : 'none'} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
function CatalogGlyph({ item }: { item: CatalogItem }) {
  return (
    <svg viewBox="0 0 100 60" aria-hidden="true">
      <g fill="#d7e1df" stroke="#657e83" strokeWidth="1.5">
        {item.type === 'cluster' ? (
          Array.from({ length: item.count ?? 2 }, (_, i) => (
            <g
              key={i}
              transform={`translate(${50 - ((item.count === 2 ? 2 : (item.count ?? 4) / 2) * 24) / 2 + (i % (item.count === 2 ? 2 : (item.count ?? 4) / 2)) * 24},${12 + Math.floor(i / (item.count === 2 ? 2 : (item.count ?? 4) / 2)) * 25})`}
            >
              <rect width="21" height="14" rx="2" />
              <path d="M6 5h9m-5 0v4" />
              <rect x="7" y="16" width="8" height="5" rx="2" />
            </g>
          ))
        ) : item.type === 'resource' ? (
          <>
            {item.kind === 'corner' ? (
              <path d="M20 10h60v25H48v17H20z" />
            ) : (
              <rect x="20" y="12" width="60" height="30" rx={item.kind === 'meeting' ? 12 : 3} />
            )}
            <path d="M39 21h22m-11 0v7" />
            <rect x="38" y="46" width="24" height="9" rx="3" />
          </>
        ) : item.kind === 'stairs' ? (
          <>
            {Array.from({ length: 7 }, (_, i) => (
              <path key={i} d={`M25 ${10 + i * 7}h50`} />
            ))}
            <path d="M50 50V7m-5 6 5-6 5 6" />
          </>
        ) : item.kind === 'elevator' ? (
          <>
            <rect x="25" y="5" width="50" height="50" />
            <path d="M30 10h40v40H30zM50 10v40m-10-15V20m20 0v15" />
          </>
        ) : item.type === 'zone' ? (
          <>
            <rect x="15" y="8" width="70" height="45" strokeDasharray="4 3" />
            <path d="M32 25h36M40 32h20" />
          </>
        ) : item.kind.includes('plant') ? (
          <>
            <circle cx="50" cy="30" r="20" />
            <path d="m35 15 30 30m-30 0 30-30M50 8v44M28 30h44" />
          </>
        ) : (
          <>
            <rect
              x="20"
              y="10"
              width="60"
              height="40"
              rx={['sofa', 'armchair', 'round-table'].includes(item.kind) ? 14 : 4}
            />
            <path d="M30 17h40v25H30zM50 17v25" />
          </>
        )}
      </g>
    </svg>
  );
}
