import { Service, validateService } from "./service_schema";
import { validate_all_services } from "./service_validator";
import { readYAMLJSONs } from "../yaml/util_read";

/** Read all yaml files to service objects */
export async function readServices(
  path: string,
): Promise<{ path: string; service: Service }[]> {
  const services: { path: string; obj: unknown }[] = await readYAMLJSONs(path);
  if (!validate_all_services(services, false)) {
    throw new Error(
      "There are invalid service files. Try 'pnpm validate-services' first.",
    );
  }

  return services.map(({ path, obj }) => ({ path, service: obj }));
}

/** Read a single yaml file to a service object */
export async function readService(path: string): Promise<Service> {
  const { obj } = (await readYAMLJSONs(path))[0];
  if (!validateService(obj)) {
    throw new Error(`YAML file ${path} does not match the schema`);
  }
  return obj;
}
