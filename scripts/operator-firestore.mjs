import { operatorCredential } from "./operator-credential.mjs";
import { randomUUID } from "node:crypto";
/** Firestore REST adapter for the operator CLI login; no credential files are written. */
export async function operatorFirestore(project) {
  const credential = await operatorCredential(true),
    base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(project)}/databases/(default)/documents`;
  const encode = (v) =>
    v === null
      ? { nullValue: null }
      : typeof v === "string"
        ? { stringValue: v }
        : typeof v === "boolean"
          ? { booleanValue: v }
          : typeof v === "number"
            ? { doubleValue: v }
            : Array.isArray(v)
              ? { arrayValue: { values: v.map(encode) } }
              : {
                  mapValue: {
                    fields: Object.fromEntries(
                      Object.entries(v).map(([k, value]) => [k, encode(value)]),
                    ),
                  },
                };
  const decode = (v) =>
    "stringValue" in v
      ? v.stringValue
      : "booleanValue" in v
        ? v.booleanValue
        : "integerValue" in v
          ? Number(v.integerValue)
          : "doubleValue" in v
            ? v.doubleValue
            : "arrayValue" in v
              ? (v.arrayValue.values || []).map(decode)
              : "mapValue" in v
                ? Object.fromEntries(
                    Object.entries(v.mapValue.fields || {}).map(([k, x]) => [
                      k,
                      decode(x),
                    ]),
                  )
                : null;
  async function request(path, method = "GET", body) {
    const token = await credential.getAccessToken();
    const r = await fetch(base + path, {
      method,
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (r.status === 404) return null;
    const result = await r.json();
    if (!r.ok)
      throw Error(
        `Firestore request failed (${r.status}): ${result.error?.message || "unknown error"}`,
      );
    return result;
  }
  const document = (collection, id) => ({
    id,
    get: async () => {
      const d = await request(`/${collection}/${encodeURIComponent(id)}`);
      return {
        exists: !!d,
        id,
        data: () =>
          d
            ? Object.fromEntries(
                Object.entries(d.fields || {}).map(([k, v]) => [k, decode(v)]),
              )
            : undefined,
      };
    },
    set: async (data, options) => {
      const query = options?.merge
        ? "?" +
          Object.keys(data)
            .map((k) => "updateMask.fieldPaths=" + encodeURIComponent(k))
            .join("&")
        : "";
      await request(
        `/${collection}/${encodeURIComponent(id)}${query}`,
        "PATCH",
        {
          fields: Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, encode(v)]),
          ),
        },
      );
    },
  });
  function collection(name, filter, limit) {
    return {
      doc: (id) => document(name, id),
      add: async (data) => {
        const d = document(name, randomUUID());
        await d.set(data);
        return d;
      },
      where: (field, op, value) => {
        if (op !== "==") throw Error("Operator query supports equality only.");
        return collection(
          name,
          {
            fieldFilter: {
              field: { fieldPath: field },
              op: "EQUAL",
              value: encode(value),
            },
          },
          limit,
        );
      },
      limit: (n) => collection(name, filter, n),
      get: async () => {
        const result = await request(":runQuery", "POST", {
          structuredQuery: {
            from: [{ collectionId: name }],
            ...(filter ? { where: filter } : {}),
            ...(limit ? { limit } : {}),
          },
        });
        const docs = (result || [])
          .filter((x) => x.document)
          .map((x) => ({
            id: x.document.name.split("/").pop(),
            data: () =>
              Object.fromEntries(
                Object.entries(x.document.fields || {}).map(([k, v]) => [
                  k,
                  decode(v),
                ]),
              ),
          }));
        return { docs, empty: docs.length === 0 };
      },
    };
  }
  return { collection };
}
