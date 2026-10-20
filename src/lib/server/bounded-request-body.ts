/** Read a small request body without trusting Content-Length or buffering an unbounded stream. */
export async function readBoundedRequestBody(
  request: Request,
  maxBytes: number
) {
  if (Number(request.headers.get("content-length")) > maxBytes)
    return { tooLarge: true as const };
  const reader = request.body?.getReader();
  if (!reader) return { tooLarge: false as const, bytes: new Uint8Array() };
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return { tooLarge: true as const };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { tooLarge: false as const, bytes };
  } finally {
    reader.releaseLock();
  }
}
