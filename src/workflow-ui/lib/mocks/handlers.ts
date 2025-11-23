import { http, HttpResponse } from 'msw';

export const handlers = [
  // Placeholder - will add real handlers in Phase 2
  http.get('/api/v1/workflows', () => {
    return HttpResponse.json({ workflows: [] });
  }),
];
