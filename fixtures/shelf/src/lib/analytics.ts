type Properties = Record<string, string | number | boolean>;

export const analytics = {
  track(event: string, properties: Properties = {}): void {
    void fetch("https://events.analytics.example/v1/track", {
      method: "POST",
      body: JSON.stringify({ event, properties, at: Date.now() }),
    });
  },
};
