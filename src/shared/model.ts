import { t } from "elysia";

export const pagedModel = t.Object({
  page: t.Numeric({
    minimum: 1
  }),
  take: t.Numeric({
    maximum: 300
  })
});
