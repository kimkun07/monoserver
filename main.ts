// Usage: tsx main.ts [command] [args]

import { main as validate_services } from "./src/service/service_validator.ts";
import { main as update_config_files } from "./src/conf_generator.ts";
import { main as update_containers } from "./src/updater.ts";

const command = process.argv[2];

// TODO: usage and help
if (command === "validate-services") {
  validate_services(process.argv[3]);
} else if (command === "update-config-files") {
  update_config_files(process.argv[3], process.argv[4]);
} else if (command === "update-containers") {
  update_containers(process.argv[3], process.argv[4]);
}
