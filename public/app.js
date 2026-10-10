const $ = id => document.getElementById(id);
let session = null, candidates = [], requests = [], selected = null, poll = null, editing = null, quoteTimer = null;
const money = (minor, currency) => new Intl.NumberFormat('es-MX', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).format(minor / 100) + ' ' + currency;
const labels = { DRAFT: 'Por cotizar', BLOCKED: 'Bloqueada', QUOTED: 'Por revisar', APPROVED: 'Autorizada', SUBMITTING: 'Enviando', UNKNOWN: 'Resultado incierto', REQUIRES_ACTION: 'Esperando aprobación de pago', PROCESSING: 'En proceso', COMPLETED: 'Compra confirmada', FAILED: 'Falló', EXPIRED: 'Expiró', RECONCILIATION_REQUIRED: 'Requiere conciliación' };
const statusLabel = r => r.status === 'COMPLETED' ? r.attempt?.anomaly ? 'Finalizada con discrepancia' : r.mode === 'sandbox' ? 'Pago confirmado' : 'Compra fixture confirmada' : labels[r.status] || r.status;
const events = { REQUEST_CREATED: 'Solicitud creada', TERMS_CHANGED: 'Términos modificados; autorización anterior invalidada', QUOTE_VALIDATED: 'Cotización verificada', POLICY_BLOCKED: 'Compra bloqueada por restricciones', INTERNAL_APPROVAL: 'Responsable autorizó los términos', CHECKOUT_DISPATCH: 'Intento registrado y enviado', CHECKOUT_RECEIVED: 'Respuesta inicial del proveedor', PROVIDER_STATUS_CONFIRMED: 'Estado consultado con proveedor', CHECKOUT_UNCERTAIN: 'Resultado incierto; no se creó otro intento', STATUS_UNCERTAIN: 'Consulta pendiente', RECONCILIATION_REQUIRED: 'Requiere revisión con proveedor' };
function message(text, error = false) { $('notice').hidden = !text; $('notice').textContent = text; $('notice').classList.toggle('error', error); }
async function api(path, method = 'GET', body) {
  const headers = {}; if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && session?.csrf) headers['X-CSRF-Token'] = session.csrf;
  const res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json();
  if (res.status === 401 && session?.user) { clearTimeout(poll); session = null; requests = []; selected = null; $('workspace').hidden = true; $('login-view').hidden = false; $('logout').hidden = true; $('identity').textContent = ''; }
  if (!res.ok) throw Object.assign(new Error(data.error?.message || 'No se pudo completar la operación.'), { code: data.error?.code, status: res.status }); return data;
}
function node(tag, text, className) { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (className) n.className = className; return n; }
function button(text, fn, className = 'secondary') { const b = node('button', text, className); b.type = 'button'; b.addEventListener('click', () => run(b, fn)); return b; }
async function run(b, fn) { if (b) b.disabled = true; message(''); try { await fn(); } catch (e) { message(e.message, true); } finally { if (b) b.disabled = false; } }
function link(text, href) { const a = node('a', text, 'button-link primary'); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; }
async function load() {
  requests = await api('/api/requests');
  if (!selected || !requests.some(x => x.id === selected)) selected = requests[0]?.id || null;
  renderList(); renderDetail();
}
function renderList() {
  $('stat-total').textContent = requests.length;
  $('stat-review').textContent = requests.filter(x => x.status === 'QUOTED').length;
  $('stat-blocked').textContent = requests.filter(x => x.status === 'BLOCKED').length;
  $('stat-complete').textContent = requests.filter(x => x.attempt?.completeConform).length;
  $('list-count').textContent = requests.length;
  const list = $('requests-list'); list.replaceChildren();
  if (!requests.length) list.append(node('p', 'Tu bandeja está vacía.', 'small muted'));
  for (const r of requests) {
    const c = candidates.find(x => x.key === r.candidateKey);
    const item = button('', async () => { selected = r.id; renderList(); renderDetail(); }, 'request-item' + (selected === r.id ? ' active' : ''));
    item.setAttribute('aria-pressed', String(selected === r.id)); item.append(node('strong', c?.label + ' · ' + r.quantity + ' unidad(es)'));
    const row = node('small'); row.append(node('span', statusLabel(r)), node('span', money(r.budgetMinor, r.currency))); item.append(row); list.append(item);
  }
}
function term(dl, title, value, wide = false) { const d = node('div', undefined, wide ? 'wide' : ''); d.append(node('dt', title), node('dd', value)); dl.append(d); }
function renderDetail() {
  clearTimeout(poll); clearTimeout(quoteTimer); const panel = $('request-detail'), r = requests.find(x => x.id === selected);
  if (!r) return;
  const c = candidates.find(x => x.key === r.candidateKey), q = r.quote, responsible = session.user.role === 'approver', expired = q && Date.parse(q.expiresAt) <= Date.now();
  panel.replaceChildren();
  const top = node('div', undefined, 'detail-top'); top.append(node('span', c.label.toUpperCase(), 'mini-label'), node('span', statusLabel(r), 'status' + (r.status === 'BLOCKED' ? ' blocked' : r.attempt?.completeConform ? ' complete' : ''))); panel.append(top);
  panel.append(node('h2', c.product, 'detail-title'), node('p', r.description, 'muted detail-description'));
  const steps = node('ol', undefined, 'purchase-steps'); steps.setAttribute('aria-label', 'Etapas de la compra');
  const stage = r.attempt ? 3 : expired ? 1 : r.approval ? 2 : q && r.status !== 'BLOCKED' ? 1 : 0;
  ['Solicitud', 'Cotización', 'Autorización', 'Pago'].forEach((label, i) => { const step = node('li', label, i < stage || i === 3 && r.attempt?.completeConform ? 'done' : i === stage ? 'current' : ''); if (i === stage) step.setAttribute('aria-current', 'step'); steps.append(step); }); panel.append(steps);
  const dl = node('dl', undefined, 'terms'); term(dl, 'Comercio', c.domain); term(dl, 'Cantidad', r.quantity + ' unidad(es)');
  term(dl, 'Características', r.requiredAttributes.join(', ') || 'Variante seleccionada'); term(dl, 'Límite autorizado al revisar', money(r.budgetMinor, r.currency));
  term(dl, 'Entrega', `${r.address.firstName} ${r.address.lastName} · ${[r.address.addressLine1, r.address.addressLine2, r.address.city, r.address.region, r.address.postalCode, r.address.country].filter(Boolean).join(', ')} · ${r.address.phone}`, true);
  term(dl, 'Solicita', r.requesterId); term(dl, 'Autoriza', r.approverId); panel.append(dl);
  if (q) {
    if (q.productEvidence === 'request-only') { const scope = node('details', undefined, 'quote-scope'); scope.append(node('summary', 'Qué confirma esta cotización'), node('p', 'Reap confirma el total y la vigencia. Producto, variante y cantidad corresponden a tu solicitud; Reap no confirma el contenido del carrito en esta respuesta.', 'small muted')); panel.append(scope); }
    const costs = node('div', undefined, 'costs');
    for (const [name, minor] of [['Productos', q.subtotalMinor], ['Envío', q.shippingMinor], ['Impuestos', q.taxMinor], ['Total final', q.totalMinor]]) {
      if (minor == null) continue; const row = node('div', undefined, 'cost-row' + (name === 'Total final' ? ' total' : ''));
      row.append(node('span', name), node('span', money(minor, q.currency))); costs.append(row);
    }
    costs.append(node('p', (expired ? 'Cotización vencida a las ' : 'Cotización vigente hasta ') + new Date(q.expiresAt).toLocaleTimeString('es-MX') + '. Cualquier cambio requiere aprobación nueva.', 'small muted')); panel.append(costs);
  }
  if (expired && !r.attempt) panel.append(node('p', 'La cotización venció. Recotiza para revisar y autorizar el total actualizado.', 'block-message'));
  if (r.blockedReason) panel.append(node('p', r.blockedReason.message + ' La compra no se enviará a checkout.', 'block-message'));
  if (r.approval) panel.append(node('p', expired && !r.attempt ? 'La autorización anterior venció con esta cotización. Revisa y autoriza los términos nuevos.' : `Solicitud autorizada por ${r.approval.approverId}. ${r.mode === 'sandbox' ? 'El pago se confirma por separado en Reap.' : 'El siguiente paso es una simulación local de pago.'}`, 'approval-message'));
  if (r.attempt?.anomaly) panel.append(node('p', 'El resultado tiene una discrepancia y requiere revisión. No se cuenta como compra conforme.', 'block-message'));
  const actions = node('div', undefined, 'actions');
  const act = async path => { if (path === 'quote') message(r.mode === 'sandbox' ? 'Consultando el total y el envío con Reap…' : 'Calculando la cotización local…'); await api(`/api/requests/${r.id}/${path}`, 'POST', {}); await load(); message(''); };
  if (!r.attempt) {
    if (!responsible) actions.append(button('Modificar solicitud', () => editRequest(r)));
    actions.append(button(q ? 'Recotizar' : 'Obtener cotización', () => act('quote')));
    if (q && !expired && r.status !== 'BLOCKED' && responsible && !r.approval) actions.append(button('Autorizar estos términos', async () => {
      if (!confirm(`Autorizar ${r.quantity} unidad(es) de ${c.product}, entrega ${r.address.country}, total ${money(q.totalMinor, q.currency)} y límite ${money(r.budgetMinor, r.currency)}?` + (q.productEvidence === 'request-only' ? '\nProducto, variante, cantidad y características enviados; no confirmados por Reap.' : ''))) return;
      await api(`/api/requests/${r.id}/approve`, 'POST', { termsHash: r.termsHash }); await load();
    }, 'primary'));
    if (r.approval && !expired && responsible) actions.append(button('Preparar pago' + (r.mode === 'sandbox' ? ' en Reap ↗' : ' de prueba'), () => act('checkout'), 'primary'));
    if (responsible) actions.append(button('Cambiar límite', async () => {
      const budget = prompt('Nuevo límite en ' + r.currency + '. Invalida la aprobación anterior.', String(r.budgetMinor / 100));
      if (budget === null) return; await api(`/api/requests/${r.id}`, 'PATCH', { version: r.version, budget }); await load();
    }, 'text-button'));
  } else {
    if (responsible && r.attempt.approvalUrl && r.mode === 'sandbox') actions.append(link('Aprobar pago en Reap ↗', r.attempt.approvalUrl));
    if (responsible && r.mode === 'fixture' && r.status === 'REQUIRES_ACTION') actions.append(button('Simular pago · prueba local', () => act('fixture-approve'), 'primary'));
    if (responsible && !['COMPLETED', 'FAILED', 'EXPIRED'].includes(r.status)) {
      actions.append(button('Consultar estado', () => act('refresh')));
      if ((r.status === 'SUBMITTING' || r.attempt.recoverable) && !r.attempt.providerId) actions.append(button('Recuperar el mismo intento', () => act('recover')));
    }
    if (r.attempt.completeConform) panel.append(node('p', (r.mode === 'fixture' ? 'Compra confirmada en fixture local. No se llamó a Reap.' : 'Reap confirmó el pago por el importe y la moneda autorizados.') + ' Referencia: ' + r.attempt.orderId, 'approval-message'));
    if (['FAILED', 'EXPIRED'].includes(r.status)) panel.append(node('p', 'Este intento terminó. Para volver a intentar, crea una solicitud nueva y obtén aprobación nueva.', 'small muted'));
  }
  panel.append(actions);
  if (r.mode === 'fixture') panel.append(node('p', 'Simulación local: este resultado no proviene de Reap.', 'small muted')); 
  const record = node('details', undefined, 'record'); record.append(node('summary', 'Registro de la compra'));
  const ol = node('ol'); for (const event of r.events) ol.append(node('li', new Date(event.time).toLocaleTimeString('es-MX') + ' · ' + (events[event.type] || event.type) + ' · ' + event.actor)); record.append(ol); panel.append(record);
  if (q && !expired && !r.attempt) quoteTimer = setTimeout(() => { renderList(); renderDetail(); }, Math.min(Date.parse(q.expiresAt) - Date.now() + 50, 2147483647));
  if (responsible && ['REQUIRES_ACTION', 'PROCESSING'].includes(r.status)) {
    if (!window.pollStarted || window.pollRequest !== r.id) { window.pollStarted = Date.now(); window.pollRequest = r.id; }
    if (Date.now() - window.pollStarted < 120000) poll = setTimeout(async () => { try { await api(`/api/requests/${r.id}/refresh`, 'POST', {}); await load(); } catch { /* manual consultation remains available */ } }, 5000);
  }
}
function preset() {
  const c = candidates.find(x => x.key === $('candidate').value); if (!c) return;
  $('quantity').value = c.quantity; $('budget').value = c.budget; $('currency').value = c.currency; $('attributes').value = c.attributes.join(', ');
  $('description').value = { cafeteria: 'Reposición puntual para la cafetería.', equipo: 'Equipo para un colaborador, con aprobación del responsable.', hogar: 'Compra para un familiar, respetando variante y dirección.', respaldo: 'Recorrido de respaldo en Estados Unidos.' }[c.scenario];
  if (!c.shipsTo.includes($('country').value) || (c.market === 'US' && $('country').value !== 'US')) {
    $('country').value = c.shipsTo.includes(c.market) ? c.market : c.shipsTo[0];
    if ($('country').value === 'US') { $('city').value = 'New York'; $('region').value = 'NY'; $('postalCode').value = '10001'; $('addressLine1').value = '123 Test Street'; $('phone').value = '+12125550100'; }
    else if ($('country').value === 'MX') { $('city').value = 'Ciudad de México'; $('region').value = 'CDMX'; $('postalCode').value = '01000'; $('addressLine1').value = 'Calle de Prueba 123'; $('phone').value = '+525500000000'; }
  }
  $('product-reference').textContent = c.product + ' · ' + c.domain + '. Precio de referencia: ' + c.referencePrice + ' ' + c.currency + ', antes de envío e impuestos.';
}
function resetEditor() {
  editing = null; $('request-form-title').textContent = 'Nueva solicitud'; $('request-submit').textContent = 'Crear solicitud →'; $('cancel-edit').hidden = true;
  for (const id of ['candidate', 'description', 'attributes', 'currency', 'budget']) $(id).disabled = false; preset();
}
function editRequest(r) {
  editing = { id: r.id, version: r.version, addressLine2: r.address.addressLine2 };
  $('candidate').value = r.candidateKey; preset(); $('quantity').value = r.quantity; $('budget').value = String(r.budgetMinor / 100); $('currency').value = r.currency; $('description').value = r.description; $('attributes').value = r.requiredAttributes.join(', ');
  for (const field of ['firstName', 'lastName', 'phone', 'addressLine1', 'city', 'region', 'postalCode', 'country']) $(field).value = r.address[field] || '';
  for (const id of ['candidate', 'description', 'attributes', 'currency', 'budget']) $(id).disabled = true;
  $('request-form-title').textContent = 'Modificar solicitud'; $('request-submit').textContent = 'Guardar cambios →'; $('cancel-edit').hidden = false; $('quantity').focus();
  message('Modificar cantidad o entrega invalida la cotización y la autorización anteriores.');
}
$('cancel-edit').addEventListener('click', resetEditor);
async function enrollment(create = false) {
  const info = await api('/api/enrollment', create ? 'POST' : 'GET', create ? {} : undefined);
  $('enrollment-status').textContent = { ACTIVE: 'Método de pago listo', NOT_ENROLLED: 'Registro pendiente', REQUIRES_ACTION: 'Continúa el registro en Reap', REVOKED: 'Registro revocado', FAILED: 'Registro fallido: puedes iniciar otro', EXPIRED: 'Registro expirado: puedes iniciar otro' }[info.status] || 'Estado pendiente';
  $('enrollment-link').hidden = !info.approvalUrl; if (info.approvalUrl) $('enrollment-link').href = info.approvalUrl;
  $('enroll').hidden = !['NOT_ENROLLED', 'FAILED', 'EXPIRED', 'REVOKED'].includes(info.status);
}
async function start() {
  session = await api('/api/session');
  $('mode').textContent = session.mode === 'fixture' ? 'Prueba local' : 'Sandbox'; $('mode').classList.toggle('warning', session.mode === 'fixture');
  const logged = !!session.user; $('login-view').hidden = logged; $('workspace').hidden = !logged; $('logout').hidden = !logged;
  $('identity').textContent = session.user?.id || '';
  if (!logged) { editing = null; return; }
  const responsible = session.user.role === 'approver';
  $('new-request-panel').hidden = responsible; $('enrollment-panel').hidden = !responsible || session.mode === 'fixture';
  $('workspace-title').textContent = responsible ? 'Tu aprobación marca el límite.' : 'Cada compra, bajo control.';
  $('workspace-description').textContent = responsible ? 'Revisa qué se compra, cuánto cuesta y a dónde se envía antes de autorizar.' : 'Prepara una solicitud. El responsable conserva la decisión de pago.';
  candidates = await api('/api/candidates'); $('candidate').replaceChildren(...candidates.map(c => { const o = node('option', c.label + ' · ' + c.domain); o.value = c.key; return o; })); resetEditor(); await load();
  if (responsible && session.mode === 'sandbox') try { await enrollment(); } catch (e) { message(e.message, true); }
  if (location.pathname === '/return') message('Regresaste de Reap. Consulta el estado de la tarjeta o compra; el regreso por sí solo no confirma éxito.');
}
$('login-form').addEventListener('submit', e => { e.preventDefault(); run(e.submitter, async () => { await api('/api/login', 'POST', { username: $('username').value, password: $('password').value }); $('password').value = ''; await start(); }); });
$('logout').addEventListener('click', e => run(e.currentTarget, async () => { await api('/api/logout', 'POST', {}); clearTimeout(poll); requests = []; selected = null; await start(); }));
$('reload').addEventListener('click', e => run(e.currentTarget, async () => { await load(); if (session?.user?.role === 'approver' && session.mode === 'sandbox') await enrollment(); })); $('candidate').addEventListener('change', preset);
$('enroll').addEventListener('click', e => run(e.currentTarget, () => enrollment(true))); $('check-enrollment').addEventListener('click', e => run(e.currentTarget, () => enrollment()));
$('request-form').addEventListener('submit', e => { e.preventDefault(); run(e.submitter, async () => {
  const address = Object.fromEntries(['firstName', 'lastName', 'phone', 'addressLine1', 'city', 'region', 'postalCode', 'country'].map(key => [key, $(key).value]));
  if (editing) {
    address.addressLine2 = editing.addressLine2 ?? null;
    let r;
    try { r = await api(`/api/requests/${editing.id}`, 'PATCH', { version: editing.version, quantity: Number($('quantity').value), address }); }
    catch (e) { if (e.code === 'STALE') e.message = 'La solicitud cambió. Cancela esta edición y vuelve a abrirla para revisar la versión actual. Tus cambios no se guardaron.'; throw e; }
    selected = r.id; resetEditor(); await load(); message('Cambios guardados. Obtén una cotización nueva para solicitar autorización.'); return;
  }
  const r = await api('/api/requests', 'POST', { candidateKey: $('candidate').value, quantity: Number($('quantity').value), budget: $('budget').value,
    currency: $('currency').value, description: $('description').value, address, requiredAttributes: $('attributes').value.split(',').map(x => x.trim()).filter(Boolean) });
  selected = r.id; await load(); message('Solicitud creada. Obtén una cotización antes de solicitar autorización.');
}); });
start().catch(e => message(e.message, true));
