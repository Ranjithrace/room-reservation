export async function getJson<T>(
    path: string,
    signal?: AbortSignal,
): Promise<T> {
    const response = await fetch(path, { signal })

    if (!response.ok) {
        let message = `Request failed (${response.status}).`

        try {
            const error = await response.json()
            message = error.message ?? message
        } catch {
            // Keep the fallback message for non-JSON responses.
        }

        throw new Error(message)
    }

    return response.json() as Promise<T>
}

export async function sendJson<T>(
    path: string,
    method: 'POST' | 'PUT',
    body?: unknown,
): Promise<T> {
    const response = await fetch(path, {
        method,
        headers: body === undefined
            ? undefined
            : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    })

    if (!response.ok) {
        let message = `Request failed (${response.status}).`

        try {
            const error = await response.json()

            const details = error.errors
                ? Object.values(error.errors)
                    .flat()
                    .filter((value): value is string =>
                        typeof value === 'string')
                    .join(' ')
                : ''

            message = [error.message, details]
                .filter(Boolean)
                .join(' ') || message
        } catch {
            // Keep the fallback message for non-JSON responses.
        }

        throw new Error(message)
    }

    return response.json() as Promise<T>
}