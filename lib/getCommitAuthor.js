const token = process.env.GITHUB_TOKEN;
const Octokit = require('@octokit/rest');

const octokit = new Octokit({
  auth: `token ${token}`,
});

async function getCommitAuthor(build) {
  const cloudSourceRepo = build.source.repoSource.repoName;
  const { commitSha } = build.sourceProvenance.resolvedRepoSource;

  // format github_ownerName_repoName
  const [, githubOwner, githubRepo] = cloudSourceRepo.split('_');

  try {
    // get github commit object
    const githubCommit = await octokit.git.getCommit({
      commit_sha: commitSha,
      owner: githubOwner,
      repo: githubRepo,
    });
    // return github commit author name
    const commitAuthor = githubCommit.data.author.name;
    return commitAuthor;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}
exports.getCommitAuthor = getCommitAuthor;
