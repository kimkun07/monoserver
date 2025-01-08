// usage: service-validator [target]
//        target can be a directory or a file
//   e.g. service-validator ./services

import { schema, type Service } from "@repo/service/service";
import { readYAMLJSONs } from "../yaml/util_read";
import { validate, validate_all } from "../yaml/yaml_validator";

export function validate_service(service: unknown): service is Service {
  return validate<Service>(schema, service);
}

export function validate_all_services(
  targets: { path: string; obj: unknown }[],
  print_errors: boolean,
): targets is { path: string; obj: Service }[] {
  // 1. General YAML-schema validation
  const validYAML = validate_all<Service>(schema, targets, print_errors);
  if (!validYAML) {
    return false;
  }

  // 2. Check for duplicate service names, subdomains, and ports
  const occurrence = count_occurrences(targets);
  const no_duplicates = !has_duplicates(occurrence, print_errors);

  return validYAML && no_duplicates;
}

export async function main(targetPath: string) {
  const targets: { path: string; obj: unknown }[] =
    await readYAMLJSONs(targetPath);

  const valid = validate_all_services(targets, true);
  if (!valid) {
    process.exit(1);
  }
}

type Occurrence = {
  containerNames: Map<string, string[]>;
  subdomains: Map<string, string[]>;
  ports: Map<number, string[]>;
};

function count_occurrences(services: { path: string; obj: Service }[]) {
  const occurrence: Occurrence = {
    containerNames: new Map(),
    subdomains: new Map(),
    ports: new Map(),
  };

  for (const { path, obj } of services) {
    const service = obj;

    // Check container name
    const name = service.container.name;
    const paths = occurrence.containerNames.get(name) || [];
    occurrence.containerNames.set(name, [...paths, path]);

    // Check subdomain
    const subdomain = service.nginx.subdomain;
    const subdomainPaths = occurrence.subdomains.get(subdomain) || [];
    occurrence.subdomains.set(subdomain, [...subdomainPaths, path]);

    // Check port
    const port = service.container.port;
    const portPaths = occurrence.ports.get(port) || [];
    occurrence.ports.set(port, [...portPaths, path]);
  }

  return occurrence;
}

/**
 * Check for duplicate service names, subdomains, and ports.
 * @returns True if duplicates were found
 */
function has_duplicates(
  occurrence: Occurrence,
  print_errors: boolean,
): boolean {
  let hasDuplicates = false;

  function iterate_map(
    map: Map<string, string[]> | Map<number, string[]>,
    type: string,
  ) {
    for (const [value, paths] of map.entries()) {
      if (paths.length > 1) {
        hasDuplicates = true;
        if (print_errors) {
          console.error();
          console.error(`Duplicate ${type} "${value}":`);
          paths.forEach((path: string) => console.error(`- ${path}`));
        }
      }
    }
  }

  iterate_map(occurrence.containerNames, "container names");
  iterate_map(occurrence.subdomains, "subdomains");
  iterate_map(occurrence.ports, "ports");

  return hasDuplicates;
}
