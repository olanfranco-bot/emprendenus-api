# Setup Emprendenus API — Guia paso a paso

Sistema completo: Cotizador → Stripe Checkout → Airtable → Email onboarding → Form onboarding → Webhook.

## Orden de ejecucion

1. Airtable (crear base + tabla)
2. Resend (crear cuenta + domain)
3. Vercel Blob (activar storage para documentos)
4. Vercel (deploy el backend)
5. Stripe (configurar webhook)
6. Cloudflare/SiteGround DNS (apuntar api.emprendenus.com)
7. WordPress (pegar cotizadores + pagina /onboarding)

---

## 1. Airtable

1. Ir a [airtable.com](https://airtable.com) → **Create a base** → nombre: `Emprendenus Orders`
2. Crear tabla llamada **Orders** con estos campos (copiar exactamente los nombres):

| Campo | Tipo |
|-------|------|
| Stripe Session ID | Single line text |
| Producto | Single line text |
| Tipo Producto | Single select (incorporation, annual) |
| Estado | Single select (los 15 estados) |
| Velocidad | Single select (standard, express) |
| Banco | Single select (virtual, traditional) |
| Total USD | Number (decimal) |
| Email | Email |
| Nombre | Single line text |
| Telefono | Phone |
| Pagado | Checkbox |
| Onboarding Completado | Checkbox |
| Fecha Pago | Date (include time) |
| Fecha Onboarding | Date (include time) |
| Estado Orden | Single select (Pendiente Pago, Pagado - Pendiente Onboarding, En Proceso, Completado) |
| Nombre LLC Opcion 1 | Single line text |
| Nombre LLC Opcion 2 | Single line text |
| Nombre LLC Opcion 3 | Single line text |
| Tipo Sociedad | Single select (unipersonal, multimiembro) |
| Objeto Social | Long text |
| Pais Residencia | Single line text |
| Socios JSON | Long text |
| Docs URLs | Long text |

3. Obtener credenciales:
   - **API Key:** [airtable.com/create/tokens](https://airtable.com/create/tokens) → Create token → scopes: `data.records:read`, `data.records:write` → access: tu base
   - **Base ID:** abrir la base en airtable, URL tipo `airtable.com/appXXXXXXXXX/...` → `appXXXXXXXXX` es el Base ID

Guardar ambos valores.

---

## 2. Resend

1. Crear cuenta en [resend.com](https://resend.com)
2. **Add Domain** → `emprendenus.com` → copiar los records DNS (SPF, DKIM, DMARC)
3. Pegar esos records en tu DNS (SiteGround o Cloudflare)
4. Esperar verificacion (5-30 min)
5. **API Keys** → Create API Key → guardar

---

## 3. Vercel Blob (para documentos)

1. En Vercel dashboard (despues de crear el proyecto en paso 4) → **Storage** → **Create Database** → **Blob**
2. Conectar al proyecto → copiar el token `BLOB_READ_WRITE_TOKEN`

---

## 4. Vercel Deploy

### 4a. Crear repo Git
```bash
cd emprendenus-api
git init
git add .
git commit -m "Initial setup"
# Push a GitHub/GitLab
```

### 4b. Importar a Vercel
1. [vercel.com/new](https://vercel.com/new) → Import el repo
2. Framework: **Other**
3. Root directory: `/`
4. **Environment Variables:**

```
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
AIRTABLE_API_KEY=patxxx
AIRTABLE_BASE_ID=appxxx
RESEND_API_KEY=re_xxx
FROM_EMAIL=Emprendenus <hola@emprendenus.com>
ADMIN_EMAIL=olanfranco@gmail.com
SITE_URL=https://emprendenus.com
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx
```

5. **Deploy**
6. Despues del deploy → **Settings → Domains** → add `api.emprendenus.com`

### 4c. DNS
En SiteGround (o donde tengas el DNS de emprendenus.com):
- Tipo: **CNAME**
- Name: `api`
- Value: `cname.vercel-dns.com`
- TTL: 3600

Esperar propagacion (5-60 min).

---

## 5. Stripe Webhook

1. Stripe Dashboard → **Developers → Webhooks** → Add endpoint
2. URL: `https://api.emprendenus.com/api/stripe-webhook`
3. Events: `checkout.session.completed`
4. Copiar **Signing secret** → pegar en Vercel env var `STRIPE_WEBHOOK_SECRET`
5. Redeploy Vercel para que tome el nuevo secret

---

## 6. WordPress Pages

### 6a. Pagina `/cotizador/`
Crear pagina en WordPress, pegar el HTML de `cotizador-incorporacion.html` dentro de un bloque Custom HTML.

### 6b. Pagina `/cotizador-anuales/`
Crear pagina, pegar HTML de `cotizador-anuales.html`.

### 6c. Pagina `/onboarding/`
Crear pagina, pegar HTML de `public/onboarding.html`. **Importante:** editar la variable `API_BASE` dentro del script para que apunte a `https://api.emprendenus.com`.

---

## 7. Testing

### Test modo sandbox Stripe
1. Usar `STRIPE_SECRET_KEY` de test (`sk_test_...`) en Vercel
2. Abrir `/cotizador/` → seleccionar Wyoming → Continuar al pago
3. Usar tarjeta test `4242 4242 4242 4242` cualquier fecha futura / CVC
4. Verificar que redirija a `/onboarding?session_id=...`
5. Verificar que en Airtable aparezca la orden con `Pagado=true`
6. Verificar que llegue el email de confirmacion

### Pasar a produccion
1. Cambiar a `sk_live_...` en Vercel env vars
2. Crear un nuevo webhook en Stripe (prod) y actualizar el signing secret
3. Hacer una prueba con $1 si queres (Wyoming + crear cupon -$751 en Stripe para llevarlo a $1)

---

## 8. Agente de Leads (taxes, notarizacion/apostilla, due diligence)

Flujo: Formulario web → `POST /api/lead-intake` → Airtable `Leads` → Claude califica + redacta borrador → email a ADMIN_EMAIL con boton → `/api/approve-lead` (pagina de confirmacion) → "Enviar al cliente" → Resend envia y marca "Respondido".
**Nada se envia al lead sin aprobacion.** Precios en `lib/pricing.js` → `SERVICE_PRICES`.

### 8a. Tabla `Leads` en Airtable (misma base)

| Campo | Tipo |
|-------|------|
| Nombre | Single line text |
| Email | Email |
| Telefono | Phone |
| Pais | Single line text |
| Servicio Solicitado | Single line text |
| Mensaje | Long text |
| Origen | Single line text |
| Estado Lead | Single select (Nuevo, Borrador - Pendiente Aprobacion, Respondido, Error - Revisar Manual) |
| Fecha Ingreso | Date (include time) |
| Servicio Detectado | Single select (notarizacion_apostilla, taxes_nra, taxes_residente, due_diligence, otro) |
| Segmento | Single select (no_residente, residente_florida, b2b_referidor, inversor_empresa, otro) |
| Score | Number (integer) |
| Prioridad | Single select (alta, media, baja) |
| Resumen | Long text |
| Datos Faltantes | Long text |
| Alertas Compliance | Long text |
| Borrador Asunto | Single line text |
| Borrador Email | Long text |
| Fecha Respuesta | Date (include time) |

### 8b. Env vars nuevas en Vercel

```
ANTHROPIC_API_KEY=sk-ant-xxx
LEAD_APPROVAL_SECRET=<string aleatorio largo>
API_URL=https://api.emprendenus.com
```

- `ANTHROPIC_API_KEY`: [platform.claude.com](https://platform.claude.com) → Settings → API Keys → Create Key. Cargar credito en Billing.
- `LEAD_APPROVAL_SECRET`: generar con `openssl rand -hex 32`. Firma el link de aprobacion.

### 8c. Formulario en WordPress

POST JSON a `https://api.emprendenus.com/api/lead-intake`:

```json
{ "nombre": "", "email": "", "telefono": "", "pais": "", "servicio": "", "mensaje": "", "origen": "web", "website": "" }
```

`website` es honeypot anti-bots: input oculto con CSS, siempre vacio.

---

## Troubleshooting

**CORS errors desde el cotizador:**
Revisar `vercel.json` → el origen debe matchear exactamente `https://emprendenus.com` (sin trailing slash).

**Webhook falla con signature verification:**
El bodyParser esta deshabilitado en `stripe-webhook.js` — no tocar eso. Si falla, verificar que el webhook secret sea el del endpoint correcto (prod vs test son distintos).

**Airtable "Unknown field":**
Los nombres de campos deben ser exactos (case-sensitive incluyendo espacios). Revisar paso 1.

**Upload de docs falla:**
Verificar que Blob este conectado al proyecto y que `BLOB_READ_WRITE_TOKEN` este en env vars.

---

## Checklist pre-launch

- [ ] Airtable base creada con todos los campos
- [ ] Dominio emprendenus.com verificado en Resend
- [ ] Vercel deploy OK, `api.emprendenus.com` responde
- [ ] Stripe webhook registrado y apuntando al endpoint prod
- [ ] Todas las env vars seteadas en Vercel
- [ ] Cotizador pegado en WP en `/cotizador/` y `/cotizador-anuales/`
- [ ] Pagina `/onboarding/` creada
- [ ] Test completo end-to-end: cotizar → pagar → onboarding → ver en Airtable
- [ ] Email de confirmacion llega
- [ ] Notificacion admin llega
- [ ] Tabla `Leads` creada + `ANTHROPIC_API_KEY` y `LEAD_APPROVAL_SECRET` en Vercel
- [ ] Test lead: enviar formulario → llega email admin → aprobar → llega respuesta al lead
