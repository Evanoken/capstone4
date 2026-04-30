import * as cdk from 'aws-cdk-lib';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as iam from 'aws-cdk-lib/aws-iam';

export class PipelineStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ─── Source Artifact ──────────────────────────────────────────────────────
    const sourceArtifact = new codepipeline.Artifact('SourceArtifact');
    const buildArtifact = new codepipeline.Artifact('BuildArtifact');

    // ─── CodeBuild Project ────────────────────────────────────────────────────
    const buildProject = new codebuild.PipelineProject(this, 'CdkBuildProject', {
      projectName: 'capstone4-cdk-build',
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': { nodejs: '18' },
            commands: [
              'echo Installing dependencies...',
              'npm ci',
            ],
          },
          build: {
            commands: [
              'echo Build started on `date`',
              'npm run build',
              'npx cdk synth',
            ],
          },
          post_build: {
            commands: [
              'echo Deploying CDK stacks...',
              'npx cdk deploy WorkflowStack --require-approval never',
            ],
          },
        },
        artifacts: {
          'base-directory': 'cdk.out',
          files: ['**/*'],
        },
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: false,
      },
    });

    // Grant CodeBuild permission to deploy CloudFormation stacks
    buildProject.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'cloudformation:*',
        'iam:*',
        'lambda:*',
        'ssm:*',
        'states:*',
        'logs:*',
        's3:*',
      ],
      resources: ['*'],
    }));

    // ─── Pipeline ─────────────────────────────────────────────────────────────
    new codepipeline.Pipeline(this, 'Capstone4Pipeline', {
      pipelineName: 'capstone4-iac-pipeline',
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipeline_actions.GitHubSourceAction({
              actionName: 'GitHub_Source',
              owner: process.env.GITHUB_OWNER || '<YOUR_GITHUB_USERNAME>',
              repo: process.env.GITHUB_REPO || 'capstone4',
              branch: 'main',
              oauthToken: cdk.SecretValue.secretsManager('github-token'),
              output: sourceArtifact,
            }),
          ],
        },
        {
          stageName: 'BuildAndDeploy',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'CDK_Build_Deploy',
              project: buildProject,
              input: sourceArtifact,
              outputs: [buildArtifact],
            }),
          ],
        },
      ],
    });
  }
}
