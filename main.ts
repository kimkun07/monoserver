// Usage: tsx main.ts [command] [args]

import { main as validate_services } from "./src/service_validator.ts";

const command = process.argv[2];

if (command === "validate-services") {
  validate_services(process.argv[3]);
}
