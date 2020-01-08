// goog.provide("a.b.c");

/**
 * @enum {number}
 */
export const Enum = {
  A: 1,
  B: 2,
  C: 3,
  D: 4
} as const;

export type Enum = number;
