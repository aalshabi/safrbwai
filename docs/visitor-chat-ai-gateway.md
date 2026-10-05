# Visitor chat through AI Gateway

Scope: سافر بوعي. ROVEA is explicitly excluded.

## What this change does

Adds an opt-in Arabic visitor chat widget, a same-origin server endpoint, fixed source links and public-site handoff. This first version uses curated site descriptions, not live retrieval, live inventory, shipment data or a booking engine. Sources are navigation references, not claims that a page was fetched. Do not describe this as verified live pricing or live tracking.

Messages are kept only in browser memory. Visitors must consent before their transcript is sent via AI Gateway to a model provider. We do not write transcripts or IP addresses to our database or analytics. Gateway/provider retention is governed by their settings; review those before launch. Only HMAC-hashed IP counters are sent to Redis.

## Configuration (server only, per project and environment)

- VISITOR_CHAT_ENABLED=true: opt-in feature flag. Defaults off; turns off API and UI together.
- VISITOR_CHAT_MODEL: an available text chat model ID selected from the current AI Gateway catalog; format provider/model. No guessed model default.
- AI_GATEWAY_API_KEY: sensitive Gateway credential. On Vercel, OIDC through VERCEL_OIDC_TOKEN can be used instead when configured and tested. Do not manually copy a short-lived OIDC token into deployment settings.
- VISITOR_CHAT_REDIS_URL and VISITOR_CHAT_REDIS_TOKEN: a Redis REST endpoint supporting EVAL (Upstash compatible). Shared counters are required; missing or unavailable Redis fails closed.
- VISITOR_CHAT_HASH_SECRET: a random server-only secret to HMAC IPs. Use a different secret for each environment.

Never prefix these values with NEXT_PUBLIC_. Never commit or print credentials. Use separate keys for each project/environment when API keys are required. Existing provider integrations are unchanged.

Rate limits are atomic: 8 requests per trusted client IP per minute and 300 calls per UTC day per project/environment. Redis failures stop paid calls. Input is limited to 16KB, 9 alternating messages and 8,000 characters total; each message is limited to 1,600 characters. Output is capped at 500 model tokens. This is a request cap, not a dollar budget; configure the Gateway credit/spend controls before enabling. Model costs vary. There is no automatic paid retry or top-up.

## Validation and release

Run: node --test tests/visitor-chat.test.mjs

Check the project's normal typecheck, lint and build in CI. On a configured Preview, verify mobile/desktop sizing, keyboard focus/Escape, new conversation reset, no duplicate widgets, handoff links, consent, first reply, a follow-up, provider failure and quota exhaustion. Verify the actual response in AI Gateway usage before claiming the connection works.

The feature remains disabled until credentials, the selected model and Redis are verified. No real provider call or full project build was possible in the authoring environment. Server unit tests use mocked provider/Redis services; the shared React component was typechecked. A draft PR is reviewable preparation, not production activation. Promote only through the project's release owner.

API reference: https://vercel.com/docs/ai-gateway/sdks-and-apis/openai-chat-completions
