import {
  createAnalyticsEvent,
  type AnalyticsEvent,
  type AnalyticsEventName,
} from "./events";

export interface AnalyticsTransport {
  send(event: AnalyticsEvent): void | Promise<void>;
}

/** External delivery is intentionally disabled until a provider is approved. */
export function trackAnalyticsEvent(
  name: AnalyticsEventName,
  properties: unknown,
  transport?: AnalyticsTransport
): "rejected" | "disabled" | "sent" {
  const event = createAnalyticsEvent(name, properties);
  if (!event) return "rejected";
  if (!transport) return "disabled";
  void transport.send(event);
  return "sent";
}
