const humanizeDuration = require('humanize-duration');
const { IncomingWebhook } = require('@slack/client');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

// webhook is the Slack client, it will be initialized in the main function.
module.exports.webhook;

// Get Webhook URL from Secret Manager.
async function getWebhookUrl() {
  const client = new SecretManagerServiceClient();
  // TODO(philmod): projects/110661976237/secrets/slack-kernelops-webhook-url/versions/latest
  const res = await client.accessSecretVersion({name: process.env.SECRET_MANAGER_VERSION});
  return res && res[0] && res[0].payload.data.toString('utf8');
}

module.exports.createWebhookClient = async () => {
  const slackWebhookUrl = await getWebhookUrl();
  return new IncomingWebhook(slackWebhookUrl);
}

// subscribe is the main function called by GCF.
module.exports.subscribe = async (event) => {
  try {
    const build = module.exports.eventToBuild(event.data);
    console.log(`Build: ${JSON.stringify(build)}`);

    // Filter out builds that don't have a "notification" tag.
    if (!build.tags || !build.tags.includes('notification')) {
      console.log(`Build ${build.id} doesn't have a 'notification' tag, ignoring.`)
      return;
    }

    // Skip if the current status is not in the status list.
    const status = ['SUCCESS', 'FAILURE', 'INTERNAL_ERROR', 'TIMEOUT'];
    if (status.indexOf(build.status) === -1) {
      return;
    }

    const message = module.exports.createSlackMessage(build);

    // Create Slack client.
    module.exports.webhook = await module.exports.createWebhookClient();

    // Send message to slack.
    module.exports.webhook.send(message);
  } catch (err) {
    module.exports.webhook.send(`Error: ${err}`);
  }
};

// eventToBuild transforms pubsub event message to a build object.
module.exports.eventToBuild = data => JSON.parse(Buffer.from(data, 'base64').toString());

const DEFAULT_COLOR = '#4285F4'; // blue
const STATUS_COLOR = {
  QUEUED: DEFAULT_COLOR,
  WORKING: DEFAULT_COLOR,
  SUCCESS: '#34A853',        // green
  FAILURE: '#EA4335',        // red
  TIMEOUT: '#FBBC05',        // yellow
  INTERNAL_ERROR: '#EA4335', // red
};

// createSlackMessage create a message from a build object.
module.exports.createSlackMessage = (build) => {
  const buildFinishTime = new Date(build.finishTime);
  const buildStartTime = new Date(build.startTime);

  const isQueued = build.status === 'QUEUED';
  const isWorking = build.status === 'WORKING';
  const timestamp = Math.round(((isWorking) ? buildStartTime : buildFinishTime).getTime() / 1000);

  let verb = 'is queued';
  switch (build.status) {
    case 'WORKING':
      verb = 'started';
      break;
    case 'SUCCESS':
      verb = 'succeeded';
      break;
    case 'FAILURE':
    case 'INTERNAL_ERROR':
    case 'TIMEOUT':
      verb = 'failed';
      break;
  }

  let text = `Build \`${build.id}\` ${verb}`;

  if (!isQueued && !isWorking) {
    const buildTime = humanizeDuration(buildFinishTime - buildStartTime);
    text += ` (in ${buildTime})`;
  }

  const message = {
    text,
    mrkdwn: true,
    attachments: [
      {
        color: STATUS_COLOR[build.status] || DEFAULT_COLOR,
        title: 'Build logs',
        title_link: build.logUrl,
        fields: [],
        footer: 'Google Cloud Build',
        footer_icon: 'https://cloud.google.com/container-registry/images/builder.png',
        ts: timestamp,
      },
    ],
  };

  let repoName, branchName;
  if (build.source && build.source.repoSource) {
    ({ repoName, branchName } = build.source.repoSource);
  }
  else if (build.substitutions) {
    repoName = build.substitutions.REPO_NAME;
    branchName = build.substitutions.BRANCH_NAME;
  }

  // Add source information to the message.
  if (repoName && branchName) {
    message.attachments[0].fields.push({
      title: 'Repository',
      value: `${repoName} (${branchName})`,
    });
  }

  // Add tag(s) to the message.
  const tags = build.tags || [];
  if (tags.length) {
    message.attachments[0].fields.push({
      title: `Tag${(tags.length > 1) ? 's' : ''}`,
      value: tags.join(', '),
    });
  }

  // Add image(s) to the message.
  const images = build.images || [];
  if (images.length) {
    message.attachments[0].fields.push({
      title: `Image${(images.length > 1) ? 's' : ''}`,
      value: images.join(', '),
    });
  }
  return message;
};
