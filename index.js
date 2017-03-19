const IncomingWebhook = require('@slack/client').IncomingWebhook;

const SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/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';
module.exports.webhook = new IncomingWebhook(SLACK_WEBHOOK_URL);

// subscribe is the main function called by GCF.
module.exports.subscribe = (event, callback) => {
  let build = module.exports.eventToBuild(event.data.data);

  // Skip if not a termination status.
  if (build.status === 'QUEUED' || build.status === 'WORKING') {
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
        }],
        footer: "Google Container Builder",
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
