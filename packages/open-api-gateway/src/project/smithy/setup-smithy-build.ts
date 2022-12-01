/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import * as path from "path";
import { Project } from "projen";
import { SmithyApiGatewayProjectOptions } from "../types";
import { SmithyBuildProject } from "./smithy-build-project";
import { SmithyModelProject } from "./smithy-model-project";

/**
 * Result from setting up a smithy based project
 */
export interface SmithyBuildProjectResult {
  /**
   * Directory in which the model (main.smithy) was written, relative to the project outdir
   */
  readonly modelDir: string;
  /**
   * Path to the generated OpenAPI spec to use as input for an OpenApiGateway<Language>Project
   */
  readonly generatedSpecFilePath: string;
}

/**
 * Adds the common subprojects for building a Smithy model into an OpenAPI spec
 */
export const setupSmithyBuild = (
  project: Project,
  options: SmithyApiGatewayProjectOptions
): SmithyBuildProjectResult => {
  const modelDir = options.modelDir ?? "model";
  const { namespace: serviceNamespace, serviceName } = options.serviceName;
  const fullyQualifiedServiceName = `${serviceNamespace}#${serviceName}`;

  const smithyBuildDir = "smithy-build";

  // Create a smithy model (eg main.smithy)
  const smithyModel = new SmithyModelProject({
    name: `${project.name}-smithy`,
    outdir: modelDir,
    parent: project,
    serviceNamespace,
    serviceName,
  });
  smithyModel.synth();

  const smithyBuildOutputSubDir = "output";

  // Create the smithy build project, responsible for transforming the model into an OpenAPI spec
  const smithyBuild = new SmithyBuildProject({
    name: `${project.name}-smithy-build`,
    parent: project,
    outdir: smithyBuildDir,
    fullyQualifiedServiceName,
    smithyBuildOptions: options.smithyBuildOptions,
    modelPath: path.join(project.outdir, modelDir),
    buildOutputDir: smithyBuildOutputSubDir,
    gradleWrapperPath: options.gradleWrapperPath
      ? path.resolve(project.outdir, options.gradleWrapperPath)
      : undefined,
  });
  smithyBuild.synth();

  const smithyBuildOutputDir = path.join(
    smithyBuildDir,
    smithyBuildOutputSubDir
  );

  // Ignore smithy build output by default
  if (options.ignoreSmithyBuildOutput ?? true) {
    project.gitignore.addPatterns(smithyBuildOutputDir);
  }
  // Ignore the .gradle directory
  project.gitignore.addPatterns(path.join(smithyBuildDir, ".gradle"));

  return {
    modelDir,
    // Generated spec is written to output/<projection id>/<plugin id>/<service name>.openapi.json
    generatedSpecFilePath: path.join(
      smithyBuild.smithyBuildOutputPath,
      "openapi",
      "openapi",
      `${serviceName}.openapi.json`
    ),
  };
};