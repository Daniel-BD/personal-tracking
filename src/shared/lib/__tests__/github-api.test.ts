import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We test the apiRequest behavior indirectly through the exported functions
// since apiRequest is not exported. We use validateToken as a simple proxy.

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

// Must import after mocking fetch
const { validateToken } = await import('../github');

function jsonResponse(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

describe('GitHub API timeout and retry', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		fetchMock.mockReset();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('passes AbortSignal to fetch', async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse({ login: 'test' }));

		await validateToken('test-token');

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const callArgs = fetchMock.mock.calls[0][1] as RequestInit;
		expect(callArgs.signal).toBeInstanceOf(AbortSignal);
	});

	it('retries on network error (TypeError)', async () => {
		fetchMock
			.mockRejectedValueOnce(new TypeError('Failed to fetch'))
			.mockRejectedValueOnce(new TypeError('Failed to fetch'))
			.mockResolvedValueOnce(jsonResponse({ login: 'test' }));

		const promise = validateToken('test-token');

		// Advance past retry delays (1s, then 2s)
		await vi.advanceTimersByTimeAsync(1000);
		await vi.advanceTimersByTimeAsync(2000);

		const result = await promise;
		expect(result).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it('retries on 5xx server error', async () => {
		fetchMock
			.mockResolvedValueOnce(new Response('Internal Server Error', { status: 500 }))
			.mockResolvedValueOnce(jsonResponse({ login: 'test' }));

		const promise = validateToken('test-token');
		await vi.advanceTimersByTimeAsync(1000);

		const result = await promise;
		expect(result).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('does not retry on 4xx client error', async () => {
		fetchMock.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));

		const result = await validateToken('test-token');
		expect(result).toBe(false);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('gives up after max retries', async () => {
		fetchMock
			.mockRejectedValueOnce(new TypeError('Failed to fetch'))
			.mockRejectedValueOnce(new TypeError('Failed to fetch'))
			.mockRejectedValueOnce(new TypeError('Failed to fetch'));

		const promise = validateToken('test-token');
		await vi.advanceTimersByTimeAsync(1000);
		await vi.advanceTimersByTimeAsync(2000);

		const result = await promise;
		expect(result).toBe(false); // validateToken catches and returns false
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});
});
