import { describe, expect, it } from 'vitest';
import { applyPadKey, parsePadText } from './keypad';

const weight = { allowDecimal: true, fresh: false };
const reps = { allowDecimal: false, fresh: false };

describe('applyPadKey', () => {
  it('adds digits to the end', () => {
    expect(applyPadKey('4', '2', weight)).toBe('42');
  });

  it('replaces the pre-filled number on the first key', () => {
    expect(applyPadKey('95', '1', { ...weight, fresh: true })).toBe('1');
  });

  it('deletes the last character, even when fresh', () => {
    expect(applyPadKey('42.5', 'back', weight)).toBe('42.');
    expect(applyPadKey('95', 'back', { ...weight, fresh: true })).toBe('9');
    expect(applyPadKey('', 'back', weight)).toBe('');
  });

  it('allows one decimal point on weights', () => {
    expect(applyPadKey('42', '.', weight)).toBe('42.');
    expect(applyPadKey('42.', '.', weight)).toBe('42.');
    expect(applyPadKey('', '.', weight)).toBe('0.');
  });

  it('has no decimal point on reps', () => {
    expect(applyPadKey('8', '.', reps)).toBe('8');
  });

  it('limits decimals and length', () => {
    expect(applyPadKey('42.25', '1', weight)).toBe('42.25');
    expect(applyPadKey('123456', '7', weight)).toBe('123456');
  });

  it('does not keep a leading zero', () => {
    expect(applyPadKey('0', '5', weight)).toBe('5');
    expect(applyPadKey('0.', '5', weight)).toBe('0.5');
  });
});

describe('parsePadText', () => {
  it('reads numbers', () => {
    expect(parsePadText('42.5')).toBe(42.5);
    expect(parsePadText('42.')).toBe(42);
  });

  it('treats an empty field as zero', () => {
    expect(parsePadText('')).toBe(0);
  });
});
