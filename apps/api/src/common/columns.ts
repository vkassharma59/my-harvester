import { ColumnOptions, ValueTransformer } from 'typeorm';

/**
 * MySQL DECIMAL is returned as a string by the driver; convert to a JS number
 * on read so the API keeps sending plain numbers (and money math stays exact in
 * the DB instead of floating-point DOUBLE).
 */
export const decimalTransformer: ValueTransformer = {
  to: (v?: number | null) => v,
  from: (v?: string | null) => (v === null || v === undefined ? v : parseFloat(v)),
};

/** Money / rate / area column: DECIMAL(12,2), returned as a number. */
export const money = (opts: ColumnOptions = {}): ColumnOptions => ({
  type: 'decimal',
  precision: 12,
  scale: 2,
  transformer: decimalTransformer,
  ...opts,
});

/**
 * A 24-char hex id column (ObjectId-style). Fixed-width CHAR with an ascii
 * collation keeps indexes small and lets foreign keys reference it. All id
 * columns (PKs and reference columns) use the SAME charset/collation so FK
 * constraints are valid. `as const` keeps it usable for both @PrimaryColumn
 * (which requires nullable !== true) and @Column.
 */
export const idColumn = {
  type: 'char',
  length: 24,
  charset: 'ascii',
  collation: 'ascii_bin',
} as const;

export const idColumnNullable = {
  ...idColumn,
  nullable: true,
  default: null,
} as const;
