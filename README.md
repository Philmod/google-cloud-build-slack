# google-cloud-build-slack

Slack integration for Google Cloud Build, using Google Cloud Functions to post messages to Slack when a build reaches a specific state.

## Setup

1. Create a Slack app, and copy the webhook URL:
```
export SLACK_WEBHOOK_URL=my-slack-webhook-url
```
2. Set the `PROJECT_ID` variable:
```
export PROJECT_ID=my-project-id
```
3. [Optionally] Set a github token to obtain github commit author info in slack messages if applicable. Please refer to the [current limitations](#limitations).
```
export GITHUB_TOKEN=my-token
```
4. [Optionally] Set the status you want a message for, here are the default ones:
```
export GC_SLACK_STATUS="SUCCESS FAILURE TIMEOUT INTERNAL_ERROR"
```
5. Create the function with [setup.sh (Option 1)](#script) OR [serverless framework (Option 2)](#serverless)

<a name="script"/></a>
### Option 1: Deploy with script
- [Optionally] Set a specific `BUCKET_NAME` and a `FUNCTION_NAME`.
- Create the function:
```
. ./setup.sh
# OR
npm run setup
```
<a name="serverless"/></a>
### Option 2: Deploy with serverless framework
1. Install `serverless`
```
npm install serverless -g
```
2. Ensure that the value of `project.credentials` in `serverless.yml` points to [credentials with appropriate roles Serverless can use to create resources in your Project](https://serverless.com/framework/docs/providers/google/guide/credentials#get-credentials--assign-roles).

3. [Deploy](https://serverless.com/framework/docs/providers/google/cli-reference/deploy/)
```
serverless deploy
```

## Teardown

### If deployed with script
The teardown script will delete the function `FUNCTION_NAME`, and the bucket `BUCKET_NAME`.
```
. ./teardown.sh
# OR
npm run teardown
```

### If deployed with serverless framework
[Remove](https://serverless.com/framework/docs/providers/google/cli-reference/remove/)
```
serverless remove
```

## FAQ

### How much does it cost?
Each build invokes 3 times the function:
- when the build is queued
- when the build starts
- when the build reaches a final status.

Here is the [GCF pricing](https://cloud.google.com/functions/pricing) for calculation.
### Can I use an existing bucket?
Yes if [deploying with the setup script](#script), specify the `BUCKET_NAME`:
```
exports BUCKET_NAME=my-bucket
```

If [deploying with the serverless framework](#serverless) however, this option is not yet available in the [Google Cloud Functions provider plugin](https://github.com/serverless/serverless-google-cloudfunctions), but hopefully will be in the near future as [an issue has been opened](https://github.com/serverless/serverless-google-cloudfunctions/issues/158).

### How can I update a function?
If you use the setup script with the same `FUNCTION_NAME`, it will update the existing function.

If you use serverless, simply re running `serverless deploy` will update the existing function.

### Where can I find the `SLACK_WEBHOOK_URL`?
After creating an application on Slack, active the Incoming Webhooks. You'll find the url on that page:
![slack webhook](https://cldup.com/aQVqcFCuAH.png)

### Why do I have to source the script?
In the case where a `BUCKET_NAME` is not defined, a random one is generated. And in order to delete it during the teardown, the variable has to be exported from the setup script.

<a name="limitations"/></a>

### What are the limitations of using github token to get github commit author info?

For github commit author info to be displayed, the cloud source repositories must be in the form of `github_<OWNER>_<REPO>` and there cannot be underscores in either `<OWNER>` or `<REPO>`. A possible solution to bypass this limitation would be to retrieve owner and repo info directly from [GitHubEventsConfig](https://cloud.google.com/cloud-build/docs/api/reference/rest/v1/projects.triggers#githubeventsconfig).
