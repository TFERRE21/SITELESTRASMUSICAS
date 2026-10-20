import test from "node:test";
import assert from "node:assert/strict";
import { institutional } from "../src/config/institutional.js";

test("institutional config uses the owner-provided CNPJ and does not invent unconfirmed details", () => {
  assert.equal(institutional.cnpj, "69.623.245/0001-71");
  assert.equal(institutional.tradeName, "");
  assert.equal(institutional.legalName, "");
  assert.equal(institutional.institutionalEmail, "");
  assert.equal(institutional.businessAddress, "");
  assert.equal(institutional.copyrightContactEmail, "");
});
