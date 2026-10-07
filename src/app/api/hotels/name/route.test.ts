import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("production hotel-name route wiring", () => {
  it("is disabled by default and does not require Google configuration", async () => {
    const response = await POST(
      new Request("http://localhost/api/hotels/name", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ placeId: "ChIJTestHotel123", locale: "ar" }),
      })
    );

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error.code).toBe("HOTEL_SEARCH_DISABLED");
    expect(JSON.stringify(body)).not.toContain("ChIJTestHotel123");
  });
});
