const { IncomingWebhook } = require('@slack/client');
const humanizeDuration = require('humanize-duration');
const config = require('./config.json');

const token = process.env.GITHUB_TOKEN;
const { getCommitAuthor } = require('./lib/getCommitAuthor');

module.exports.webhook = new IncomingWebhook(config.SLACK_WEBHOOK_URL);
module.exports.status = config.GC_SLACK_STATUS;

// subscribe is the main function called by GCF.
module.exports.subscribe = async (event) => {
  const build = module.exports.eventToBuild(event.data);

  // Skip if the current status is not in the status list.
  const status = module.exports.status || ['SUCCESS', 'FAILURE', 'INTERNAL_ERROR', 'TIMEOUT'];
  if (status.indexOf(build.status) === -1) {
    return;
  }

  // Send message to slack.
  const message = await module.exports.createSlackMessage(build);
  module.exports.webhook.send(message, async (err, res) => {
    if (err) {
      console.log('Error:', err);
    } else {
      console.log('Message sent: ', res);
    }
  });
};

// eventToBuild transforms pubsub event message to a build object.
module.exports.eventToBuild = data => JSON.parse(Buffer.from(data, 'base64').toString());

const DEFAULT_COLOR = '#4285F4'; // blue
const STATUS_COLOR = {
  QUEUED: DEFAULT_COLOR,
  WORKING: DEFAULT_COLOR,
  SUCCESS: '#34A853', // green
  FAILURE: '#EA4335', // red
  TIMEOUT: '#FBBC05', // yellow
  INTERNAL_ERROR: '#EA4335', // red
};

// createSlackMessage create a message from a build object.
module.exports.createSlackMessage = async (build) => {
  const buildFinishTime = new Date(build.finishTime);
  const buildStartTime = new Date(build.startTime);

  const isWorking = build.status === 'WORKING';
  const timestamp = Math.round(((isWorking) ? buildStartTime : buildFinishTime).getTime() / 1000);

  const text = (isWorking)
    ? `Build \`${build.id}\` started`
    : `Build \`${build.id}\` finished`;

  const fields = [{
    title: 'Status',
    value: build.status,
  }];

  if (!isWorking) {
    const buildTime = humanizeDuration(buildFinishTime - buildStartTime);

    fields.push({
      title: 'Duration',
      value: buildTime,
    });
  }

  const message = {
    text,
    mrkdwn: true,
    attachments: [{
      color: STATUS_COLOR[build.status] || DEFAULT_COLOR,
      title: 'Build logs',
      title_link: build.logUrl,
      fields,
      footer: 'Google Cloud Container Builder',
      footer_icon: 'https://ssl.gstatic.com/pantheon/images/containerregistry/container_registry_color.png',
      ts: timestamp,
    }],
  };

  // Add source information to the message.
  const source = build.source || null;
  if (source) {
    message.attachments[0].fields.push({
      title: 'Repository',
      value: build.source.repoSource.repoName,
    });

    message.attachments[0].fields.push({
      title: 'Branch',
      value: build.source.repoSource.branchName,
    });

    const commitAuthor = (token)
      ? await getCommitAuthor(build)
      : null;

    if (commitAuthor) {
      message.attachments[0].fields.push({
        title: 'Commit Author',
        value: commitAuthor,
      });
    }
  }

  // Add images to the message.
  const images = build.images || [];
  for (let i = 0, len = images.length; i < len; i += 1) {
    message.attachments[0].fields.push({
      title: 'Image',
      value: images[i],
    });
  }
  return message;
};
