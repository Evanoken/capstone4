#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WorkflowStack } from '../lib/workflow-stack';
import { PipelineStack } from '../lib/pipeline-stack';

const app = new cdk.App();

// Deploy the workflow resources (SSM + Lambda + Step Functions)
new WorkflowStack(app, 'WorkflowStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'Capstone 4 - Serverless Workflow with SSM, Lambda, and Step Functions',
});

// Deploy the CI/CD pipeline
new PipelineStack(app, 'PipelineStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'Capstone 4 - CI/CD Pipeline using CodePipeline + CodeBuild',
});

app.synth();
