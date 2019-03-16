const token = process.env.GITHUB_TOKEN;
const Octokit = require('@octokit/rest');

const octokit = new Octokit({
  auth: `token ${token}`,
});

async function getCommitAuthor(build) {
  const cloudSourceRepo = build.source.repoSource.repoName;
  const { commitSha } = build.sourceProvenance.resolvedRepoSource;

  // format github_ownerName_repoName
  // requires cloudsourcerepos to have underscores
  const [, githubOwner, githubRepo] = cloudSourceRepo.split('_');

  // get github commit object
  const githubCommit = await octokit.git.getCommit({
    commit_sha: commitSha,
    owner: githubOwner,
    repo: githubRepo,
  });

  // get github commit author e-mail
  const commitAuthor = githubCommit.data.author.email;
  return commitAuthor;
}
exports.getCommitAuthor = getCommitAuthor;
