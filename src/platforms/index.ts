import { PlatformClient, PlatformContext, PlatformId } from './types';
import { createGiteaClient } from './gitea';
import { createGithubClient } from './github';

export function createPlatformClient(platform: PlatformId, ctx: PlatformContext): PlatformClient {
  switch (platform) {
    case 'gitea':
      return createGiteaClient(ctx);
    case 'github':
      return createGithubClient(ctx);
    default:
      throw new Error(`Unsupported platform: ${platform satisfies never}`);
  }
}

