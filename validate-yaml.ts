// usage: validate [schema file] [target]
//        target can be a directory or a file
//   e.g. validate ./service-schema.json ./services

import { readYAMLs } from "./util.ts";
import { validate_and_print } from "./yaml-validator.ts";
import { Service } from "./service-schema.ts";

async function main(schemaPath: string, targetPath: string) {
  // 1. read schemaObject, read targetObject[]
  const schema: unknown = (await readYAMLs(schemaPath))[0].obj;
  const targets: { path: string; obj: unknown }[] = await readYAMLs(targetPath);

  // 2. General YAML validation
  const isValidYAML = validate_and_print(schema, targets);
  if (!isValidYAML) {
    process.exit(1);
  }

  // 3. Check for duplicate service names, subdomains, and ports
  const duplicates = checkDuplicates(targets);
  const hasDuplicates = printDuplicates(duplicates);

  // Exit with error if duplicates were found
  process.exit(hasDuplicates ? 1 : 0);
}

type DuplicateCheck = {
  containerNames: Map<string, string[]>;
  subdomains: Map<string, string[]>;
  ports: Map<number, string[]>;
};

function checkDuplicates(services: { path: string; obj: Service }[]) {
  const check: DuplicateCheck = {
    containerNames: new Map(),
    subdomains: new Map(),
    ports: new Map(),
  };

  for (const { path, obj } of services) {
    const service = obj;

    // Check container name
    const name = service.container.name;
    const paths = check.containerNames.get(name) || [];
    check.containerNames.set(name, [...paths, path]);

    // Check subdomain
    const subdomain = service.nginx.subdomain;
    const subdomainPaths = check.subdomains.get(subdomain) || [];
    check.subdomains.set(subdomain, [...subdomainPaths, path]);

    // Check port
    const port = service.container.port;
    const portPaths = check.ports.get(port) || [];
    check.ports.set(port, [...portPaths, path]);
  }

  return check;
}

function printDuplicates(check: DuplicateCheck) {
  let hasDuplicates = false;

  // Print container name duplicates
  for (const [name, paths] of check.containerNames.entries()) {
    if (paths.length > 1) {
      hasDuplicates = true;
      console.error();
      console.error(`Duplicate container name "${name}":`);
      paths.forEach((path: string) => console.error(`- ${path}`));
    }
  }

  // Print subdomain duplicates
  for (const [subdomain, paths] of check.subdomains) {
    if (paths.length > 1) {
      hasDuplicates = true;
      console.error();
      console.error(`Duplicate subdomain "${subdomain}":`);
      paths.forEach((path: string) => console.error(`- ${path}`));
    }
  }

  // Print port duplicates
  for (const [port, paths] of check.ports) {
    if (paths.length > 1) {
      hasDuplicates = true;
      console.error();
      console.error(`Duplicate port "${port}":`);
      paths.forEach((path: string) => console.error(`- ${path}`));
    }
  }

  return hasDuplicates;
}

main(process.argv[2], process.argv[3]);
