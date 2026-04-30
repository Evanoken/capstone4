# Capstone 4: Advanced IaC & Automated Workflows

A fully automated, infrastructure-as-code driven cloud platform using **AWS CDK**, **CodePipeline**, **Step Functions**, **Lambda**, and **SSM Parameter Store**.

---

## Architecture

```
GitHub Push
    │
    ▼
CodePipeline (Source → BuildAndDeploy)
    │
    ▼
CodeBuild → cdk synth → cdk deploy
    │
    ▼
WorkflowStack (CloudFormation)
    ├── SSM Parameter: /app/config/greeting
    ├── Lambda Function (reads SSM at runtime)
    └── Step Functions State Machine
            Pass → Wait → Task (Lambda) → Succeed
                                └─ Catch → Fail
```

---

## Repository Structure

```
capstone4/
├── bin/
│   └── app.ts                    # CDK app entrypoint
├── lib/
│   ├── workflow-stack.ts         # SSM + Lambda + Step Functions stack
│   └── pipeline-stack.ts        # CodePipeline + CodeBuild stack
├── lambda/
│   └── index.js                  # Lambda function code
├── statemachine-definition.json  # Step Functions ASL (reference)
├── cdk.json
├── package.json
├── tsconfig.json
└── README.md
```

---

## Prerequisites

- AWS CLI configured (`aws configure`)
- Node.js 18+ and npm installed
- AWS CDK installed: `npm install -g aws-cdk`
- CDK bootstrapped in your account/region: `cdk bootstrap`

---

## Setup & Deployment

### 1. Clone & Install
```bash
git clone https://github.com/<your-username>/capstone4.git
cd capstone4
npm install
```

### 2. Store GitHub Token in Secrets Manager
```bash
aws secretsmanager create-secret \
  --name github-token \
  --secret-string "<YOUR_GITHUB_PERSONAL_ACCESS_TOKEN>"
```

### 3. Deploy WorkflowStack First
```bash
npm run build
npx cdk deploy WorkflowStack --require-approval never
```

### 4. Deploy PipelineStack
```bash
npx cdk deploy PipelineStack --require-approval never
```

### 5. Push to GitHub to Trigger Pipeline
Any subsequent push to the `main` branch will automatically trigger the pipeline.

---

## Screenshots

### Screenshot 1: Successful CodePipeline Execution
> Shows Source and BuildAndDeploy stages both green (succeeded)

![CodePipeline Execution](screenshots/pipeline-success.png)

---

### Screenshot 2: Step Functions Visual Graph (Successful Execution)
> Shows the state machine graph with all states highlighted green

![Step Functions Graph](screenshots/stepfunctions-graph.png)

---

### Screenshot 3: CloudWatch Logs — Lambda SSM Retrieval
> Shows Lambda logs confirming the SSM parameter was retrieved successfully

![CloudWatch Logs](screenshots/cloudwatch-logs.png)

---

## How It Works

1. **SSM Parameter Store** — Stores the greeting string `/app/config/greeting` as infrastructure-defined config (no hardcoding in Lambda).
2. **Lambda Function** — At runtime, fetches the SSM parameter using the AWS SDK and logs the value. IAM permissions are granted by CDK using least-privilege `grantRead()`.
3. **Step Functions** — Orchestrates a 4-state workflow:
   - `Pass` — initializes workflow context
   - `Wait` — 3-second delay simulating dependency wait
   - `Task` — invokes Lambda (with 2 retries + catch/fail fallback)
   - `Succeed` or `Fail` — terminal states
4. **CodePipeline + CodeBuild** — On every GitHub push, CodeBuild runs `cdk synth` and `cdk deploy`, keeping your infrastructure always in sync with your code.
