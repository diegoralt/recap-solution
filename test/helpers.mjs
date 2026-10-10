import { Store } from '../src/store.mjs';
import { FixtureProvider } from '../src/providers/fixture.mjs';
import { PurchaseFlow } from '../src/agent.mjs';
export const requester = { id: 'solicitante', role: 'requester' };
export const approver = { id: 'responsable', role: 'approver' };
export const config = { mode: 'fixture', origin: 'http://localhost:3000', returnUrl: 'http://localhost:3000/return',
  requesterPassword: 'requester-test-secret-123', approverPassword: 'approver-test-secret-456', secure: false, dbPath: ':memory:', email: 'demo@example.com' };
export const address = { firstName: 'Demo', lastName: 'Prueba', phone: '+525500000000', addressLine1: 'Calle de Prueba 123', city: 'Ciudad de México', region: 'CDMX', postalCode: '01000', country: 'MX' };
export const body = (overrides = {}) => ({ candidateKey: 'coffee', quantity: 2, budget: '800', currency: 'MXN', address: { ...address }, requiredAttributes: ['250g'], description: 'Reposición de prueba.', ...overrides });
export function rig(options = {}) {
  const store = options.store || new Store();
  const provider = options.provider || new FixtureProvider(store, config, options.now);
  const flow = new PurchaseFlow(store, provider, options.config || config, options.now);
  return { store, provider, flow };
}
export async function approved(flow, input = body()) {
  const r = flow.create(input, requester); const q = await flow.quote(r.id, requester);
  return flow.approve(r.id, q.termsHash, approver);
}
