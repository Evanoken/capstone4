import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';

export class WorkflowStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ─── 1. SSM Parameter ────────────────────────────────────────────────────
    const configParam = new ssm.StringParameter(this, 'AppGreeting', {
      parameterName: '/app/config/greeting',
      stringValue: 'Hello from CI/CD Automated Infrastructure! - Capstone 4',
      description: 'Greeting message retrieved dynamically by Lambda at runtime',
    });

    // ─── 2. Lambda Execution Role ─────────────────────────────────────────────
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // ─── 3. Lambda Function ───────────────────────────────────────────────────
    const workflowLambda = new lambda.Function(this, 'WorkflowTask', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda'),
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
      environment: {
        SSM_PARAM_NAME: '/app/config/greeting',
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Grant Lambda permission to read the SSM parameter (least-privilege)
    configParam.grantRead(workflowLambda);

    // ─── 4. Step Functions States ─────────────────────────────────────────────

    // State 1: Pass state — acts as a workflow initializer
    const initState = new stepfunctions.Pass(this, 'InitializeWorkflow', {
      comment: 'Workflow started — initializing context',
      result: stepfunctions.Result.fromObject({
        workflowStarted: true,
        message: 'Proceeding to fetch SSM config via Lambda',
      }),
      resultPath: '$.init',
    });

    // State 2: Wait state — simulates a short delay (e.g., waiting for a dependency)
    const waitState = new stepfunctions.Wait(this, 'WaitBeforeTask', {
      comment: 'Simulating a brief wait before invoking Lambda',
      time: stepfunctions.WaitTime.duration(cdk.Duration.seconds(3)),
    });

    // State 3: Task state — invokes Lambda with retry and catch
    const invokeTask = new tasks.LambdaInvoke(this, 'InvokeLambdaTask', {
      lambdaFunction: workflowLambda,
      outputPath: '$.Payload',
      comment: 'Invoke Lambda to retrieve SSM parameter',
    });

    // Retry: up to 2 retries with exponential backoff
    invokeTask.addRetry({
      maxAttempts: 2,
      interval: cdk.Duration.seconds(2),
      backoffRate: 2,
      errors: ['States.TaskFailed', 'Lambda.ServiceException'],
    });

    // Catch: if all retries fail, go to failure state
    const failState = new stepfunctions.Fail(this, 'WorkflowFailed', {
      cause: 'Lambda invocation failed after retries',
      error: 'LambdaInvocationError',
    });

    invokeTask.addCatch(failState, {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });

    // State 4: Success state
    const successState = new stepfunctions.Succeed(this, 'WorkflowSucceeded', {
      comment: 'Workflow completed successfully',
    });

    // ─── 5. Chain States ──────────────────────────────────────────────────────
    const definition = initState
      .next(waitState)
      .next(invokeTask)
      .next(successState);

    // ─── 6. CloudWatch Log Group for Step Functions ───────────────────────────
    const sfnLogGroup = new logs.LogGroup(this, 'StateMachineLogs', {
      logGroupName: '/aws/states/workflow-state-machine',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ─── 7. State Machine ─────────────────────────────────────────────────────
    new stepfunctions.StateMachine(this, 'WorkflowStateMachine', {
      stateMachineName: 'capstone4-workflow',
      definitionBody: stepfunctions.DefinitionBody.fromChainable(definition),
      timeout: cdk.Duration.minutes(5),
      logs: {
        destination: sfnLogGroup,
        level: stepfunctions.LogLevel.ALL,
        includeExecutionData: true,
      },
      tracingEnabled: true,
    });

    // ─── 8. Outputs ───────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: workflowLambda.functionName,
      description: 'Lambda function name',
    });

    new cdk.CfnOutput(this, 'SSMParameterName', {
      value: configParam.parameterName,
      description: 'SSM parameter name read by Lambda',
    });
  }
}
