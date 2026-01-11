import { __internal, parseRepoTarget } from '../config';

describe('parseRepoTarget', () => {
  test('parses owner/repo', () => {
    expect(parseRepoTarget('alice/project')).toEqual({ owner: 'alice', repo: 'project' });
  });

  test('parses repo URL and derives baseUrl', () => {
    expect(parseRepoTarget('https://gitea.example.com/alice/project')).toEqual({
      baseUrl: 'https://gitea.example.com',
      owner: 'alice',
      repo: 'project',
    });
  });

  test('strips .git suffix', () => {
    expect(parseRepoTarget('https://gitea.example.com/alice/project.git')).toEqual({
      baseUrl: 'https://gitea.example.com',
      owner: 'alice',
      repo: 'project',
    });
  });
});

describe('platform detection + api base', () => {
  const { detectPlatform, computeApiBase, normalizeOrigin } = __internal;

  test('detects github by host', () => {
    expect(detectPlatform('https://github.com', undefined)).toBe('github');
  });

  test('detects gitea by default', () => {
    expect(detectPlatform('https://gitea.example.com', undefined)).toBe('gitea');
  });

  test('computes github api base for dotcom', () => {
    expect(computeApiBase('github', 'https://github.com')).toBe('https://api.github.com');
  });

  test('computes github api base for GHES', () => {
    expect(computeApiBase('github', 'https://github.company.com')).toBe('https://github.company.com/api/v3');
  });

  test('normalizes origin only', () => {
    expect(normalizeOrigin('https://github.com/foo/bar')).toBe('https://github.com');
  });
});


