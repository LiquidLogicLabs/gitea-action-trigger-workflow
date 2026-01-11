"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPlatformClient = createPlatformClient;
const gitea_1 = require("./gitea");
const github_1 = require("./github");
function createPlatformClient(platform, ctx) {
    switch (platform) {
        case 'gitea':
            return (0, gitea_1.createGiteaClient)(ctx);
        case 'github':
            return (0, github_1.createGithubClient)(ctx);
        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }
}
//# sourceMappingURL=index.js.map