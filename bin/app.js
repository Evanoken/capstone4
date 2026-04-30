#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const cdk = __importStar(require("aws-cdk-lib"));
const workflow_stack_1 = require("../lib/workflow-stack");
const pipeline_stack_1 = require("../lib/pipeline-stack");
const app = new cdk.App();
// Deploy the workflow resources (SSM + Lambda + Step Functions)
new workflow_stack_1.WorkflowStack(app, 'WorkflowStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
    },
    description: 'Capstone 4 - Serverless Workflow with SSM, Lambda, and Step Functions',
});
// Deploy the CI/CD pipeline
new pipeline_stack_1.PipelineStack(app, 'PipelineStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
    },
    description: 'Capstone 4 - CI/CD Pipeline using CodePipeline + CodeBuild',
});
app.synth();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsdUNBQXFDO0FBQ3JDLGlEQUFtQztBQUNuQywwREFBc0Q7QUFDdEQsMERBQXNEO0FBRXRELE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBRTFCLGdFQUFnRTtBQUNoRSxJQUFJLDhCQUFhLENBQUMsR0FBRyxFQUFFLGVBQWUsRUFBRTtJQUN0QyxHQUFHLEVBQUU7UUFDSCxPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUI7UUFDeEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLElBQUksV0FBVztLQUN0RDtJQUNELFdBQVcsRUFBRSx1RUFBdUU7Q0FDckYsQ0FBQyxDQUFDO0FBRUgsNEJBQTRCO0FBQzVCLElBQUksOEJBQWEsQ0FBQyxHQUFHLEVBQUUsZUFBZSxFQUFFO0lBQ3RDLEdBQUcsRUFBRTtRQUNILE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQjtRQUN4QyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsSUFBSSxXQUFXO0tBQ3REO0lBQ0QsV0FBVyxFQUFFLDREQUE0RDtDQUMxRSxDQUFDLENBQUM7QUFFSCxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG5pbXBvcnQgJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3Rlcic7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgV29ya2Zsb3dTdGFjayB9IGZyb20gJy4uL2xpYi93b3JrZmxvdy1zdGFjayc7XG5pbXBvcnQgeyBQaXBlbGluZVN0YWNrIH0gZnJvbSAnLi4vbGliL3BpcGVsaW5lLXN0YWNrJztcblxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcblxuLy8gRGVwbG95IHRoZSB3b3JrZmxvdyByZXNvdXJjZXMgKFNTTSArIExhbWJkYSArIFN0ZXAgRnVuY3Rpb25zKVxubmV3IFdvcmtmbG93U3RhY2soYXBwLCAnV29ya2Zsb3dTdGFjaycsIHtcbiAgZW52OiB7XG4gICAgYWNjb3VudDogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfQUNDT1VOVCxcbiAgICByZWdpb246IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX1JFR0lPTiB8fCAndXMtZWFzdC0xJyxcbiAgfSxcbiAgZGVzY3JpcHRpb246ICdDYXBzdG9uZSA0IC0gU2VydmVybGVzcyBXb3JrZmxvdyB3aXRoIFNTTSwgTGFtYmRhLCBhbmQgU3RlcCBGdW5jdGlvbnMnLFxufSk7XG5cbi8vIERlcGxveSB0aGUgQ0kvQ0QgcGlwZWxpbmVcbm5ldyBQaXBlbGluZVN0YWNrKGFwcCwgJ1BpcGVsaW5lU3RhY2snLCB7XG4gIGVudjoge1xuICAgIGFjY291bnQ6IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX0FDQ09VTlQsXG4gICAgcmVnaW9uOiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9SRUdJT04gfHwgJ3VzLWVhc3QtMScsXG4gIH0sXG4gIGRlc2NyaXB0aW9uOiAnQ2Fwc3RvbmUgNCAtIENJL0NEIFBpcGVsaW5lIHVzaW5nIENvZGVQaXBlbGluZSArIENvZGVCdWlsZCcsXG59KTtcblxuYXBwLnN5bnRoKCk7XG4iXX0=