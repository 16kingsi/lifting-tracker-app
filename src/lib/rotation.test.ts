import { describe, expect, it } from 'vitest';
import { nextTemplateId } from './rotation';

describe('nextTemplateId', () => {
  it('starts with Day A', () => {
    expect(nextTemplateId(null)).toBe('A');
  });

  it('alternates', () => {
    expect(nextTemplateId('A')).toBe('B');
    expect(nextTemplateId('B')).toBe('A');
  });
});
