// Usage: tsx main.ts [command] [args]

import { main as validate_services } from "./src/service/service_validator.ts";
import { main as update_config_files } from "./src/update_conf_files.ts";
import { main as update_containers } from "./src/update_on_server.ts";

const command = process.argv[2];

// TODO: usage and help
if (command === "validate-services") {
  validate_services(process.argv[3]);
} else if (command === "update-conf-files") {
  update_config_files(process.argv[3], process.argv[4]);
} else if (command === "update-on-server") {
  update_containers(process.argv[3], process.argv[4]);
}
