import { parseRepoTarget } from '../config';

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


