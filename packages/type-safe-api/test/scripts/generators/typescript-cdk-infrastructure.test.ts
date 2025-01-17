/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import * as path from "path";
import { exec } from "projen/lib/util";
import { OpenApiToolsJsonFile } from "../../../src/project/codegen/components/open-api-tools-json-file";
import { GeneratedTypescriptCdkInfrastructureProject } from "../../../src/project/codegen/infrastructure/cdk/generated-typescript-cdk-infrastructure-project";
import { GeneratedTypescriptRuntimeProject } from "../../../src/project/codegen/runtime/generated-typescript-runtime-project";
import { withTmpDirSnapshot } from "../../project/snapshot-utils";

describe("Typescript Infrastructure Code Generation Script Unit Tests", () => {
  it.each(["single.yaml"])("Generates With %s", (spec) => {
    const specPath = path.resolve(__dirname, `../../resources/specs/${spec}`);

    const snapshot = withTmpDirSnapshot(path.resolve(__dirname), (outdir) => {
      const clientOutdir = path.join(outdir, "client");
      const client = new GeneratedTypescriptRuntimeProject({
        name: "test-client",
        defaultReleaseBranch: "main",
        outdir: clientOutdir,
        specPath: path.relative(clientOutdir, specPath),
      });
      const infraOutdir = path.join(outdir, "infra");
      const project = new GeneratedTypescriptCdkInfrastructureProject({
        name: "test-infra",
        defaultReleaseBranch: "main",
        outdir: infraOutdir,
        specPath: path.relative(infraOutdir, specPath),
        generatedTypescriptTypes: client,
      });
      // Synth the openapitools.json since it's used by the generate command
      OpenApiToolsJsonFile.of(project)!.synthesize();
      const command = project.buildGenerateCommand();
      exec(`TYPE_SAFE_API_DEBUG=1 ${command.command}`, {
        cwd: command.workingDir,
      });
    });

    expect(snapshot["infra/src/api.ts"]).toMatchSnapshot();
    expect(snapshot["infra/src/mock-integrations.ts"]).toMatchSnapshot();
    expect(snapshot["infra/src/index.ts"]).toMatchSnapshot();
  });
});
