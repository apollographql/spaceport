import { mockGlobal } from "../mock";
import fetchMock from "fetch-mock";
jest.mock("@zeit/fetch-retry", () => (f: any) => f);
jest.mock("uuid-browser", () => ({
  v4: jest.fn(() => `mock_uuid`),
}));

const GITHUB_RELEASE = "https://github.com/apollographql/rust/releases";
beforeEach(() => {
  mockGlobal();
  jest.resetModules();
});

afterEach(fetchMock.resetBehavior);
it("sends an event to segment when a command is run", async () => {
  const segment = fetchMock.post("https://api.segment.io/v1/track", 200);

  require("../index");

  const request = new Request("/telemetry", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "rover/0.0.1",
    },
    body: JSON.stringify({
      command: {
        name: "schema push",
        arguments: {
          sensitive: true,
        },
      },
      machine_id: "1234",
      session_id: "12345",
      platform: {
        os: "linux",
        continuous_integration: null,
      },
      cli_version: "0.0.1",
      cwd_hash: "890123",
    }),
  });

  const response: any = await self.trigger("fetch", request);
  expect(response.status).toEqual(200);
  const call = segment.lastCall();
  if (!call) throw new Error("Last call not returned");

  const [url, options] = call;
  expect(url).toContain("segment.io");
  expect(JSON.parse(options!.body as any)).toMatchInlineSnapshot(`
    Object {
      "anonymousId": "1234",
      "context": Object {
        "app": Object {
          "name": "rover",
          "version": "0.0.1",
        },
        "library": "CLI Worker",
        "os": Object {
          "name": "linux",
        },
        "userAgent": "rover/0.0.1",
      },
      "event": "rover invocation",
      "messageId": "12345",
      "properties": Object {
        "arguments": Object {
          "sensitive": true,
        },
        "command": "schema push",
        "continuous_integration": null,
        "cwd_hash": "890123",
      },
    }
  `);
});

it("doesn't report invalid messages", async () => {
  const segment = fetchMock.post("https://api.segment.io/v1/track", 200);

  require("../index");

  const request = new Request("/telemetry", {
    method: "POST",
    headers: {
      // no content-type header
      "user-agent": "rover/0.0.1",
    },
    body: JSON.stringify({
      command: {
        name: "schema push",
        arguments: {
          sensitive: true,
        },
      },
      machine_id: "1234",
      session_id: "12345",
      platform: {
        os: "linux",
        continuous_integration: null,
      },
      cli_version: "0.0.1",
      properties: "890123",
    }),
  });

  const response: any = await self.trigger("fetch", request);
  expect(response.status).toEqual(400);
  const call = segment.lastCall();
  if (!call) throw new Error("Last call not returned");

  const [url, options] = call;
  expect(url).toContain("segment.io");
  expect(JSON.parse(options!.body as any)).toMatchInlineSnapshot(`
    Object {
      "anonymousId": "1234",
      "context": Object {
        "app": Object {
          "name": "rover",
          "version": "0.0.1",
        },
        "library": "CLI Worker",
        "os": Object {
          "name": "linux",
        },
        "userAgent": "rover/0.0.1",
      },
      "event": "rover invocation",
      "messageId": "12345",
      "properties": Object {
        "arguments": Object {
          "sensitive": true,
        },
        "command": "schema push",
        "continuous_integration": null,
        "cwd_hash": "890123",
      },
    }
  `);
});
