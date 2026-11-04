import { describe, it, expect } from 'vitest';
import { pointInPolygon, validCoords } from '../src/domain/geo.js';

const square = { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] };
const donut = { type: 'Polygon', coordinates: [square.coordinates[0], [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]] };

describe('pointInPolygon', () => {
  it('detects inside and outside', () => {
    expect(pointInPolygon(5, 5, square)).toBe(true);
    expect(pointInPolygon(11, 5, square)).toBe(false);
    expect(pointInPolygon(5, -1, square)).toBe(false);
  });
  it('respects holes', () => {
    expect(pointInPolygon(5, 5, donut)).toBe(false);
    expect(pointInPolygon(2, 2, donut)).toBe(true);
  });
  it('uses lng,lat order', () => {
    const w = { type: 'Polygon', coordinates: [[[74.87, 21.34], [74.89, 21.34], [74.89, 21.36], [74.87, 21.36], [74.87, 21.34]]] };
    expect(pointInPolygon(74.88, 21.35, w)).toBe(true);
    expect(pointInPolygon(21.35, 74.88, w)).toBe(false);
  });
});

describe('validCoords', () => {
  it('rejects NaN and out of range', () => {
    expect(validCoords(21, 74)).toBe(true);
    expect(validCoords(91, 0)).toBe(false);
    expect(validCoords(0, 181)).toBe(false);
    expect(validCoords(NaN, 0)).toBe(false);
  });
});
