# google-container-slack

Slack integration for Google Cloud Container Builder, using Google Cloud Functions to post messages to Slack when a build reaches a specific state.

## Setup
- Create a Slack app, and copy the webhook URL:
`export SLACK_WEBHOOK_URL=my-slack-webhook-url`
- Set the `PROJECT_ID` variable:
`export PROJECT_ID=my-project-id`
- [Optionally] Set a specific `BUCKET_NAME` and a `FUNCTION_NAME`.
- [Optionally] Set the status you want a message for, here are the default ones:
`export GC_SLACK_STATUS="SUCCESS FAILURE TIMEOUT INTERNAL_ERROR"`
- Create the function:
`. ./setup.sh` (or `npm run setup`)

## Teardown
`. ./teardown.sh` (or `npm run teardown`) will delete the function `FUNCTION_NAME`, and the bucket `BUCKET_NAME`.
