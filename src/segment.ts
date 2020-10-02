import setup from "@zeit/fetch-retry";
export const f = setup(fetch);

type SegmentEvent = {
  userId?: string;
  anonymousId?: string | null;
  event: string | null;
  properties?: any;
  context: {
    app: {
      name: string;
      version?: string;
    } | string;
    library?: string;
    os?: {
      name: string;
    } | string;
    userAgent?: string;
  };
  messageId?: string;
}

export async function track(payload: SegmentEvent) {
  if (typeof SEGMENT_API_KEY === "undefined") return;
  const { v4 } = require("uuid-browser");
  const message = Object.assign({}, payload);
  message.context.library = "CLI Worker";
  if (!message.userId && !message.anonymousId) message.anonymousId = v4();
  if (!message.messageId) message.messageId = `${message.context.library}-${v4()}`;
  try {
    await f("https://api.segment.io/v1/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${SEGMENT_API_KEY}:`)}`,
      },
      body: JSON.stringify(message),
    });
  } catch (e) {
    console.error(e);
  }
}
