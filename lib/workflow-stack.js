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
exports.WorkflowStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const ssm = __importStar(require("aws-cdk-lib/aws-ssm"));
const stepfunctions = __importStar(require("aws-cdk-lib/aws-stepfunctions"));
const tasks = __importStar(require("aws-cdk-lib/aws-stepfunctions-tasks"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
class WorkflowStack extends cdk.Stack {
    constructor(scope, id, props) {
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
exports.WorkflowStack = WorkflowStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2Zsb3ctc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3b3JrZmxvdy1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQywrREFBaUQ7QUFDakQseURBQTJDO0FBQzNDLDZFQUErRDtBQUMvRCwyRUFBNkQ7QUFDN0QsMkRBQTZDO0FBQzdDLHlEQUEyQztBQUUzQyxNQUFhLGFBQWMsU0FBUSxHQUFHLENBQUMsS0FBSztJQUMxQyxZQUFZLEtBQWMsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDNUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsNEVBQTRFO1FBQzVFLE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQy9ELGFBQWEsRUFBRSxzQkFBc0I7WUFDckMsV0FBVyxFQUFFLHlEQUF5RDtZQUN0RSxXQUFXLEVBQUUsNkRBQTZEO1NBQzNFLENBQUMsQ0FBQztRQUVILDZFQUE2RTtRQUM3RSxNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO1lBQzNELFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQztZQUMzRCxlQUFlLEVBQUU7Z0JBQ2YsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQywwQ0FBMEMsQ0FBQzthQUN2RjtTQUNGLENBQUMsQ0FBQztRQUVILDZFQUE2RTtRQUM3RSxNQUFNLGNBQWMsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUMvRCxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENB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Q0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQzNELGdCQUFnQixFQUFFLG9CQUFvQjtZQUN0QyxjQUFjLEVBQUUsYUFBYSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDO1lBQ3RFLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDaEMsSUFBSSxFQUFFO2dCQUNKLFdBQVcsRUFBRSxXQUFXO2dCQUN4QixLQUFLLEVBQUUsYUFBYSxDQUFDLFFBQVEsQ0FBQyxHQUFHO2dCQUNqQyxvQkFBb0IsRUFBRSxJQUFJO2FBQzNCO1lBQ0QsY0FBYyxFQUFFLElBQUk7U0FDckIsQ0FBQyxDQUFDO1FBRUgsNkVBQTZFO1FBQzdFLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDNUMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxZQUFZO1lBQ2xDLFdBQVcsRUFBRSxzQkFBc0I7U0FDcEMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUMxQyxLQUFLLEVBQUUsV0FBVyxDQUFDLGFBQWE7WUFDaEMsV0FBVyxFQUFFLG1DQUFtQztTQUNqRCxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUF6SEQsc0NBeUhDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIHNzbSBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc3NtJztcbmltcG9ydCAqIGFzIHN0ZXBmdW5jdGlvbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXN0ZXBmdW5jdGlvbnMnO1xuaW1wb3J0ICogYXMgdGFza3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLXN0ZXBmdW5jdGlvbnMtdGFza3MnO1xuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5cbmV4cG9ydCBjbGFzcyBXb3JrZmxvd1N0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IGNkay5BcHAsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIC8vIOKUgOKUgOKUgCAxLiBTU00gUGFyYW1ldGVyIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuICAgIGNvbnN0IGNvbmZpZ1BhcmFtID0gbmV3IHNzbS5TdHJpbmdQYXJhbWV0ZXIodGhpcywgJ0FwcEdyZWV0aW5nJywge1xuICAgICAgcGFyYW1ldGVyTmFtZTogJy9hcHAvY29uZmlnL2dyZWV0aW5nJyxcbiAgICAgIHN0cmluZ1ZhbHVlOiAnSGVsbG8gZnJvbSBDSS9DRCBBdXRvbWF0ZWQgSW5mcmFzdHJ1Y3R1cmUhIC0gQ2Fwc3RvbmUgNCcsXG4gICAgICBkZXNjcmlwdGlvbjogJ0dyZWV0aW5nIG1lc3NhZ2UgcmV0cmlldmVkIGR5bmFtaWNhbGx5IGJ5IExhbWJkYSBhdCBydW50aW1lJyxcbiAgICB9KTtcblxuICAgIC8vIOKUgOKUgOKUgCAyLiBMYW1iZGEgRXhlY3V0aW9uIFJvbGUg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG4gICAgY29uc3QgbGFtYmRhUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnTGFtYmRhRXhlY3V0aW9uUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdsYW1iZGEuYW1hem9uYXdzLmNvbScpLFxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZScpLFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIC8vIOKUgOKUgOKUgCAzLiBMYW1iZGEgRnVuY3Rpb24g4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG4gICAgY29uc3Qgd29ya2Zsb3dMYW1iZGEgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdXb3JrZmxvd1Rhc2snLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhJyksXG4gICAgICByb2xlOiBsYW1iZGFSb2xlLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgU1NNX1BBUkFNX05BTUU6ICcvYXBwL2NvbmZpZy9ncmVldGluZycsXG4gICAgICB9LFxuICAgICAgbG9nUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUssXG4gICAgfSk7XG5cbiAgICAvLyBHcmFudCBMYW1iZGEgcGVybWlzc2lvbiB0byByZWFkIHRoZSBTU00gcGFyYW1ldGVyIChsZWFzdC1wcml2aWxlZ2UpXG4gICAgY29uZmlnUGFyYW0uZ3JhbnRSZWFkKHdvcmtmbG93TGFtYmRhKTtcblxuICAgIC8vIOKUgOKUgOKUgCA0LiBTdGVwIEZ1bmN0aW9ucyBTdGF0ZXMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5cbiAgICAvLyBTdGF0ZSAxOiBQYXNzIHN0YXRlIOKAlCBhY3RzIGFzIGEgd29ya2Zsb3cgaW5pdGlhbGl6ZXJcbiAgICBjb25zdCBpbml0U3RhdGUgPSBuZXcgc3RlcGZ1bmN0aW9ucy5QYXNzKHRoaXMsICdJbml0aWFsaXplV29ya2Zsb3cnLCB7XG4gICAgICBjb21tZW50OiAnV29ya2Zsb3cgc3RhcnRlZCDigJQgaW5pdGlhbGl6aW5nIGNvbnRleHQnLFxuICAgICAgcmVzdWx0OiBzdGVwZnVuY3Rpb25zLlJlc3VsdC5mcm9tT2JqZWN0KHtcbiAgICAgICAgd29ya2Zsb3dTdGFydGVkOiB0cnVlLFxuICAgICAgICBtZXNzYWdlOiAnUHJvY2VlZGluZyB0byBmZXRjaCBTU00gY29uZmlnIHZpYSBMYW1iZGEnLFxuICAgICAgfSksXG4gICAgICByZXN1bHRQYXRoOiAnJC5pbml0JyxcbiAgICB9KTtcblxuICAgIC8vIFN0YXRlIDI6IFdhaXQgc3RhdGUg4oCUIHNpbXVsYXRlcyBhIHNob3J0IGRlbGF5IChlLmcuLCB3YWl0aW5nIGZvciBhIGRlcGVuZGVuY3kpXG4gICAgY29uc3Qgd2FpdFN0YXRlID0gbmV3IHN0ZXBmdW5jdGlvbnMuV2FpdCh0aGlzLCAnV2FpdEJlZm9yZVRhc2snLCB7XG4gICAgICBjb21tZW50OiAnU2ltdWxhdGluZyBhIGJyaWVmIHdhaXQgYmVmb3JlIGludm9raW5nIExhbWJkYScsXG4gICAgICB0aW1lOiBzdGVwZnVuY3Rpb25zLldhaXRUaW1lLmR1cmF0aW9uKGNkay5EdXJhdGlvbi5zZWNvbmRzKDMpKSxcbiAgICB9KTtcblxuICAgIC8vIFN0YXRlIDM6IFRhc2sgc3RhdGUg4oCUIGludm9rZXMgTGFtYmRhIHdpdGggcmV0cnkgYW5kIGNhdGNoXG4gICAgY29uc3QgaW52b2tlVGFzayA9IG5ldyB0YXNrcy5MYW1iZGFJbnZva2UodGhpcywgJ0ludm9rZUxhbWJkYVRhc2snLCB7XG4gICAgICBsYW1iZGFGdW5jdGlvbjogd29ya2Zsb3dMYW1iZGEsXG4gICAgICBvdXRwdXRQYXRoOiAnJC5QYXlsb2FkJyxcbiAgICAgIGNvbW1lbnQ6ICdJbnZva2UgTGFtYmRhIHRvIHJldHJpZXZlIFNTTSBwYXJhbWV0ZXInLFxuICAgIH0pO1xuXG4gICAgLy8gUmV0cnk6IHVwIHRvIDIgcmV0cmllcyB3aXRoIGV4cG9uZW50aWFsIGJhY2tvZmZcbiAgICBpbnZva2VUYXNrLmFkZFJldHJ5KHtcbiAgICAgIG1heEF0dGVtcHRzOiAyLFxuICAgICAgaW50ZXJ2YWw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDIpLFxuICAgICAgYmFja29mZlJhdGU6IDIsXG4gICAgICBlcnJvcnM6IFsnU3RhdGVzLlRhc2tGYWlsZWQnLCAnTGFtYmRhLlNlcnZpY2VFeGNlcHRpb24nXSxcbiAgICB9KTtcblxuICAgIC8vIENhdGNoOiBpZiBhbGwgcmV0cmllcyBmYWlsLCBnbyB0byBmYWlsdXJlIHN0YXRlXG4gICAgY29uc3QgZmFpbFN0YXRlID0gbmV3IHN0ZXBmdW5jdGlvbnMuRmFpbCh0aGlzLCAnV29ya2Zsb3dGYWlsZWQnLCB7XG4gICAgICBjYXVzZTogJ0xhbWJkYSBpbnZvY2F0aW9uIGZhaWxlZCBhZnRlciByZXRyaWVzJyxcbiAgICAgIGVycm9yOiAnTGFtYmRhSW52b2NhdGlvbkVycm9yJyxcbiAgICB9KTtcblxuICAgIGludm9rZVRhc2suYWRkQ2F0Y2goZmFpbFN0YXRlLCB7XG4gICAgICBlcnJvcnM6IFsnU3RhdGVzLkFMTCddLFxuICAgICAgcmVzdWx0UGF0aDogJyQuZXJyb3InLFxuICAgIH0pO1xuXG4gICAgLy8gU3RhdGUgNDogU3VjY2VzcyBzdGF0ZVxuICAgIGNvbnN0IHN1Y2Nlc3NTdGF0ZSA9IG5ldyBzdGVwZnVuY3Rpb25zLlN1Y2NlZWQodGhpcywgJ1dvcmtmbG93U3VjY2VlZGVkJywge1xuICAgICAgY29tbWVudDogJ1dvcmtmbG93IGNvbXBsZXRlZCBzdWNjZXNzZnVsbHknLFxuICAgIH0pO1xuXG4gICAgLy8g4pSA4pSA4pSAIDUuIENoYWluIFN0YXRlcyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcbiAgICBjb25zdCBkZWZpbml0aW9uID0gaW5pdFN0YXRlXG4gICAgICAubmV4dCh3YWl0U3RhdGUpXG4gICAgICAubmV4dChpbnZva2VUYXNrKVxuICAgICAgLm5leHQoc3VjY2Vzc1N0YXRlKTtcblxuICAgIC8vIOKUgOKUgOKUgCA2LiBDbG91ZFdhdGNoIExvZyBHcm91cCBmb3IgU3RlcCBGdW5jdGlvbnMg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG4gICAgY29uc3Qgc2ZuTG9nR3JvdXAgPSBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnU3RhdGVNYWNoaW5lTG9ncycsIHtcbiAgICAgIGxvZ0dyb3VwTmFtZTogJy9hd3Mvc3RhdGVzL3dvcmtmbG93LXN0YXRlLW1hY2hpbmUnLFxuICAgICAgcmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUssXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgLy8g4pSA4pSA4pSAIDcuIFN0YXRlIE1hY2hpbmUg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG4gICAgbmV3IHN0ZXBmdW5jdGlvbnMuU3RhdGVNYWNoaW5lKHRoaXMsICdXb3JrZmxvd1N0YXRlTWFjaGluZScsIHtcbiAgICAgIHN0YXRlTWFjaGluZU5hbWU6ICdjYXBzdG9uZTQtd29ya2Zsb3cnLFxuICAgICAgZGVmaW5pdGlvbkJvZHk6IHN0ZXBmdW5jdGlvbnMuRGVmaW5pdGlvbkJvZHkuZnJvbUNoYWluYWJsZShkZWZpbml0aW9uKSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxuICAgICAgbG9nczoge1xuICAgICAgICBkZXN0aW5hdGlvbjogc2ZuTG9nR3JvdXAsXG4gICAgICAgIGxldmVsOiBzdGVwZnVuY3Rpb25zLkxvZ0xldmVsLkFMTCxcbiAgICAgICAgaW5jbHVkZUV4ZWN1dGlvbkRhdGE6IHRydWUsXG4gICAgICB9LFxuICAgICAgdHJhY2luZ0VuYWJsZWQ6IHRydWUsXG4gICAgfSk7XG5cbiAgICAvLyDilIDilIDilIAgOC4gT3V0cHV0cyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTGFtYmRhRnVuY3Rpb25OYW1lJywge1xuICAgICAgdmFsdWU6IHdvcmtmbG93TGFtYmRhLmZ1bmN0aW9uTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnTGFtYmRhIGZ1bmN0aW9uIG5hbWUnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1NTTVBhcmFtZXRlck5hbWUnLCB7XG4gICAgICB2YWx1ZTogY29uZmlnUGFyYW0ucGFyYW1ldGVyTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnU1NNIHBhcmFtZXRlciBuYW1lIHJlYWQgYnkgTGFtYmRhJyxcbiAgICB9KTtcbiAgfVxufVxuIl19