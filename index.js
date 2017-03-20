const IncomingWebhook = require('@slack/client').IncomingWebhook;
const humanizeDuration = require('humanize-duration');
const config = require('./config.json');

module.exports.webhook = new IncomingWebhook(config.SLACK_WEBHOOK_URL);
module.exports.status = config.GC_SLACK_STATUS;

// subscribe is the main function called by GCF.
module.exports.subscribe = (event, callback) => {
  let build = module.exports.eventToBuild(event.data.data);

  // Skip if the current status is not in the status list.
  let status = module.exports.status || ['SUCCESS', 'FAILURE', 'INTERNAL_ERROR', 'TIMEOUT'];
  if (status.indexOf(build.status) == -1) {
    return callback();
  }

  // Send message to slack.
  let message = module.exports.createSlackMessage(build);
  module.exports.webhook.send(message, (err, res) => {
    if (err) console.log('Error:', err);
    callback(err);
  });
};

// eventToBuild transforms pubsub event message to a build object.
module.exports.eventToBuild = data => {
  return JSON.parse(new Buffer(data, 'base64').toString());
}

// createSlackMessage create a
module.exports.createSlackMessage = build => {
  let message = {
    text: "Build `" + build.id + "` finished",
    mrkdwn: true,
    attachments: [
      {
        color: "#4285f4",
        title: "Build logs",
        title_link: build.logUrl,
        fields: [{
          title: "Status",
          value: build.status
        }, {
          title: "Duration",
          value: humanizeDuration(new Date(build.finishTime) - new Date(build.startTime))
        }],
        footer: "Google Cloud Container Builder",
        footer_icon: "https://3.bp.blogspot.com/-gAgUjSdOTXk/VkJIor02vkI/AAAAAAAAB78/YjOw_3Rk1Qw/s1600/container%2Bregistry%2B2.png",
        ts: Math.round(new Date(build.finishTime).getTime()/1000)
      }
    ]
  };

  // Add images to the message.
  let images = build.images || [];
  for (var i = 0, len = images.length; i < len; i++) {
    message.attachments[0].fields.push({
      title: "Image",
      value: images[i]
    });
  }
  return message
}
