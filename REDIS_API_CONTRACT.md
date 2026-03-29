# Redis API Contract

The frontend Redis Search page requires the following REST APIs from your backend.

---

## 1. Get by String Key

**`GET /api/redis/get?key={key}`**

Query Redis using a normal string key.

| Param | Type   | Required | Description        |
|-------|--------|----------|--------------------|
| key   | string | yes      | The Redis key name |

**Response `200`:**
```json
{
  "key": "my:key:name",
  "value": "{\"name\":\"John\"}",
  "type": "string",
  "ttl": 3600,
  "encoding": "raw",
  "size": 42
}
```

| Field    | Type           | Description                                      |
|----------|----------------|--------------------------------------------------|
| key      | string         | The key that was queried                         |
| value    | string         | The stored value (stringified)                   |
| type     | string         | Redis key type: `string`, `hash`, `list`, `set`, `zset` |
| ttl      | number         | TTL in seconds. `-1` = no expiry, `-2` = key not found |
| encoding | string         | Internal Redis encoding (e.g. `raw`, `int`, `ziplist`) |
| size     | number         | Size in bytes                                    |

**Response `404`:**
```json
{ "error": "Key not found" }
```

---

## 2. Get by Byte Array Key

**`GET /api/redis/get-by-bytes?key={string}`**

User inputs a normal string. Backend converts it to a byte array key and queries Redis.

| Param | Type   | Required | Description                              |
|-------|--------|----------|------------------------------------------|
| key   | string | yes      | Normal string to convert to byte array key |

**Response:** Same format as endpoint #1.

---

## 3. Search Keys by Pattern

**`GET /api/redis/search?pattern={pattern}&cursor={cursor}&count={count}`**

Search Redis keys using a glob-style pattern. Uses SCAN for pagination.

| Param   | Type   | Required | Default | Description                    |
|---------|--------|----------|---------|--------------------------------|
| pattern | string | yes      |         | Glob pattern (e.g. `user:*`)  |
| cursor  | string | no       | `"0"`   | Cursor for pagination          |
| count   | number | no       | `50`    | Number of keys per page        |

**Response `200`:**
```json
{
  "cursor": "23",
  "keys": [
    { "key": "user:1", "type": "string", "ttl": -1 },
    { "key": "user:2", "type": "hash", "ttl": 300 }
  ]
}
```

| Field       | Type   | Description                                    |
|-------------|--------|------------------------------------------------|
| cursor      | string | Next cursor. `"0"` means no more results       |
| keys[]      | array  | List of matched keys                           |
| keys[].key  | string | Key name                                       |
| keys[].type | string | Redis key type                                 |
| keys[].ttl  | number | TTL in seconds (`-1` = no expiry)              |

---

## 4. Delete Key

**`DELETE /api/redis/delete?key={key}`**

Delete a key from Redis.

| Param | Type   | Required | Description        |
|-------|--------|----------|--------------------|
| key   | string | yes      | The Redis key name |

**Response `200`:**
```json
{ "deleted": true }
```

---

## 5. Update TTL

**`PUT /api/redis/ttl`**

Update the TTL (time-to-live) for a key.

**Request body (`application/json`):**
```json
{
  "key": "my:key:name",
  "ttl": 7200
}
```

| Field | Type   | Required | Description                           |
|-------|--------|----------|---------------------------------------|
| key   | string | yes      | The Redis key name                    |
| ttl   | number | yes      | New TTL in seconds. `-1` to remove expiry |

**Response `200`:**
```json
{ "success": true }
```

---

## Error Format

All endpoints return errors in this format:

```json
{ "error": "Error message here" }
```

HTTP status codes: `400` for bad request, `404` for not found, `500` for server error.
