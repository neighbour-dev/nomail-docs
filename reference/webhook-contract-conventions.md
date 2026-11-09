---
title: Webhook field constraints, versions, and algorithm conventions | NoMail
description: Read required, optional, conditional, documented, and example-only fields consistently, with precise definitions for raw bytes, signature encodings, evidence, and receiver policies.
---

# How to read the Webhook contracts

## Documentation boundaries

| Item | Convention |
|---|---|
| Purpose | Backend parsing, signature verification, and responses; App platform configuration forms and event displays |
| Subject | Upstream protocols, independent of this project's implementation, supported platforms, or development status |
| Inbound | Platform → Webhook receiver |
| Outbound | Receiver → platform API; listed separately only for required business responses or follow-up queries |
| Coverage | Configuration, HTTP encoding, authentication, envelopes, event variants, responses, delivery semantics |
| Non-goal | Duplicating all platform resources into a new, independently maintained full API schema |

## Constraint markers

| Marker | Exact meaning | Direct required-field validation? |
|---|---|---|
| R | Officially Required, or explicitly present in every request | Yes, only for the associated request type/version |
| O | Officially Optional | No |
| C | Applicable under an explicit condition stated in the same row | Follow that condition |
| D | Officially described, without a uniform requiredness statement | No; examples cannot promote it to R |
| E | Structure or value confirmed only by an official example | No; not a complete validation schema |
| — | Not applicable to this request type | No |

`nullable` differs from omittable: `R, nullable` requires the field to exist but permits null. A field missing from an example is not, without evidence, forbidden by the protocol.

## Sources and versions

| Item | Rule |
|---|---|
| Source IDs | S1, S2, etc. are local to each platform page and cited in its tables |
| Official documentation | Evidence for requirements, field semantics, response deadlines, and delivery behavior |
| Official implementation | Evidence for encoding or algorithms not detailed in documentation; pinned to a version, not a promise for all versions |
| Examples | Illustrate encoding and structure; omitted fields in excerpts are not necessarily omittable in real requests |
| Unspecified | Listed sources do not specify the constraint; this neither permits arbitrary values nor proves the platform has no limit |
| Completeness | Complete envelopes, enum scopes, and resource projections are distinguished; projections are not full resource schemas |
| Version selection | Business payload versions, event-name suffixes, SDK versions, and HTTP authentication versions are recorded separately |

## Algorithm notation

| Symbol | Definition |
|---|---|
| `B` | Received HTTP entity body bytes, before JSON parsing/reserialization or form decoding |
| `UTF8(s)` | Text s encoded as UTF-8 bytes |
| `\|\|` | Byte concatenation, without implicit separators |
| `HEX(x)` | Lowercase hexadecimal encoding of bytes |
| `B64(x)` / `B64DEC(s)` | Standard Base64 encoding / decoding, not Base64URL |
| `HMAC256(K, M)` | HMAC-SHA256 of bytes M using key bytes K |
| `SHA256(M)` / `SHA1(M)` | Plain digests, not HMAC |
| `CT_EQ(a, b)` | Constant-time comparison |
| `t` | Original timestamp text from the signature header; do not convert or reformat before signing |

## Implementation boundaries

| Layer | Nature | Constraint |
|---|---|---|
| Signature verification | Security requirement | Preserve raw bytes, sign the specified scope, compare signatures and tokens in constant time |
| Type dispatch | Protocol rule | Parse Content-Type, outer type, event type, and action as separate layers |
| Authentication policy | Receiver policy | Fix authentication mode per endpoint; never downgrade based on a missing signature |
| Deduplication | Receiver policy | Use platform IDs with their scope; HTTP delivery IDs are not universally business event IDs |
| Acknowledgement | Receiver policy | Complete agreed reliable receipt before success; ACK does not mean business execution succeeded |
| Unknown fields | Compatibility policy | Receivers decide whether to ignore them; unlisted fields are not automatically invalid upstream fields |
| Sensitive data | Security requirement | Do not expose keys, tokens, temporary response URLs, or full personal data in public logs or fixtures |

## Page structure

1. Protocol scope and versions.
2. Configuration parameters.
3. Request registry, referencing authentication, body, and response contracts.
4. Authentication: input bytes, key interpretation, algorithm, signature format, freshness.
5. Bodies: types, presence conditions, event variants, official schemas.
6. Responses: status, headers, body, deadlines, follow-up business responses.
7. Delivery: deduplication, retries, ordering, tests versus live events.
8. Official sources.
