import jwt from "@elysiajs/jwt";

import { readConfigOrDie } from "@root/helpers/read-config";

export const accessJwt = jwt({
  secret: readConfigOrDie("JWT_ACCESS_SECRET"),
  exp: "3d"
});

export const renewJwt = jwt({
  secret: readConfigOrDie("JWT_RENEW_SECRET"),
  exp: "1y",
  name: "renew"
});
