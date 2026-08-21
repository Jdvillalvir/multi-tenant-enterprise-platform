# Multi-Tenant Enterprise Platform

Aplicación empresarial multi-tienda construida con Next.js 16 App Router, TypeScript, PostgreSQL, Prisma ORM 7, Auth.js, Tailwind CSS, Zod, React Hook Form, S3-compatible storage y controles de autorización por tenant.

> **Importante:** este repositorio implementa controles de seguridad de aplicación, pero no puede declararse 100% seguro. Producción requiere infraestructura endurecida, gestión de secretos, MFA/WAF/monitorización, backups, antivirus/ICAP para archivos y políticas IAM adecuadas.

## 1. Requisitos

- Node.js 20.19+; se recomienda Node 22.
- npm 10+.
- PostgreSQL 17 recomendado.
- S3, Cloudflare R2 o MinIO.
- Redis/Upstash recomendado para rate limiting distribuido en producción.
- Docker y Docker Compose opcionales para desarrollo.

Next.js 16 está en Active LTS. Prisma ORM 7 requiere Node 20.19+ y utiliza el generador `prisma-client` con driver adapter para PostgreSQL. Consulte la documentación oficial antes de actualizar versiones mayores.

## 2. Instalación

```bash
git clone <TU_REPOSITORIO>
cd multi-tenant-enterprise-platform
npm install
cp .env.example .env
```

Genere un secreto fuerte para `AUTH_SECRET` y configure todas las variables antes de iniciar.

## 3. PostgreSQL

### Con Docker

```bash
docker compose up -d postgres minio minio-init
```

### PostgreSQL instalado localmente

```sql
CREATE DATABASE multitenant;
CREATE USER app WITH ENCRYPTED PASSWORD 'cambie-esta-clave';
GRANT ALL PRIVILEGES ON DATABASE multitenant TO app;
```

Use una contraseña distinta en producción.

## 4. Variables de entorno

```env
DATABASE_URL=postgresql://app:app_password@localhost:5432/multitenant
AUTH_SECRET=replace-with-at-least-32-random-characters
AUTH_URL=http://localhost:3000
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=tenant-files
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
REDIS_URL=
REDIS_TOKEN=
ALLOWED_ORIGINS=http://localhost:3000
MAX_FILE_SIZE=10485760
SEED_ADMIN_EMAIL=admin@example.local
SEED_ADMIN_PASSWORD=change-this-development-password
PASSWORD_RESET_URL=http://localhost:3000/reset-password
MAIL_FROM=no-reply@example.local
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
```

`MAX_FILE_SIZE=10485760` equivale a 10 MiB.

### Producción

- AWS S3: use `S3_ENDPOINT` vacío y credenciales IAM/roles cuando la plataforma lo permita.
- Cloudflare R2: configure endpoint, región y credenciales de API de R2.
- MinIO: use endpoint privado y credenciales no predeterminadas.
- Redis/Upstash: configure `REDIS_URL` y `REDIS_TOKEN`.
- SMTP: configure un proveedor real para recuperación de contraseña. El endpoint nunca revela si el correo existe.

## 5. Prisma

Prisma 7 requiere generar el cliente después de cambiar el esquema:

```bash
npm run db:generate
npm run db:migrate -- --name init
```

En un entorno nuevo que ya contiene la migración incluida:

```bash
npm run db:deploy
```

Seed:

```bash
npm run db:seed
```

El seed crea una tienda DEMO, permisos, roles del sistema y el usuario indicado por `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`. Esas credenciales son solo para desarrollo y deben cambiarse.

## 6. Desarrollo

```bash
npm run dev
```

Abra `http://localhost:3000`.

## 7. Pruebas

Unitarias y seguridad:

```bash
npm test
```

E2E:

```bash
npm run test:e2e
```

Para E2E de archivos se recomienda levantar PostgreSQL + MinIO con Docker Compose, configurar `.env`, aplicar migraciones y seed, y después ejecutar la aplicación.

## 8. Calidad y build

```bash
npm run lint
npm run typecheck
npm run build
npm audit --audit-level=high
```

El workflow de GitHub ejecuta lint, TypeScript, tests y build. Dependabot y el workflow de seguridad revisan dependencias.

## 9. Docker

```bash
cp .env.example .env
# ajuste las variables

docker compose up -d postgres minio minio-init
npm install
npm run db:deploy
npm run db:seed

docker compose up --build app
```

El contenedor de aplicación usa el build standalone de Next.js.

## 10. S3 / R2 / MinIO

Los archivos nunca se guardan permanentemente en `/public/uploads`.

La clave física es generada por servidor:

```text
stores/{storeId}/files/{randomId}
```

El usuario nunca controla la clave. Las descargas consultan el registro mediante `id + storeId` y luego generan una URL firmada con expiración de 5 minutos.

## 11. Multi-tenancy

El tenant efectivo siempre se obtiene de la sesión autenticada y se usa en las consultas Prisma. Las rutas de recursos utilizan patrones como:

```ts
prisma.file.findFirst({
  where: { id: fileId, storeId: authenticatedUser.storeId }
})
```

No se acepta `storeId` del navegador como autoridad. Los endpoints administrativos verifican adicionalmente permisos y, cuando corresponde, el rol global `SUPER_ADMIN`.

## 12. Roles iniciales

- `SUPER_ADMIN`: administración global.
- `STORE_ADMIN`: administración de su tienda.
- `MANAGER`: operaciones de registros y archivos autorizados.
- `USER`: registros y archivos autorizados.
- `VIEWER`: consulta.

Los permisos se almacenan por separado y se asignan mediante `RolePermission`.

## 13. Seguridad implementada

- Hash de contraseñas con bcrypt.
- JWT de Auth.js en cookie de sesión gestionada por Auth.js.
- Sesiones con expiración.
- Invalidación mediante `sessionVersion` al desactivar usuario, cambiar contraseña o cambiar rol.
- Rate limiting para login, reset y operaciones sensibles.
- Fallback de rate limiting local para desarrollo; Redis/Upstash para producción distribuida.
- Errores genéricos de autenticación.
- Validación server-side con Zod.
- DTOs explícitos; no se hace mass assignment de objetos arbitrarios.
- Aislamiento de tenant en cada consulta sensible.
- URLs de descarga firmadas y temporales.
- Claves de objetos aleatorias y namespaced por tenant.
- Allowlist de MIME/extensiones y validación de imágenes con Sharp.
- Límite de tamaño de archivos.
- No se ejecutan archivos subidos.
- No se sirven uploads desde `/public`.
- Protección same-origin para operaciones mutables de la API.
- CSP, X-Content-Type-Options, Referrer-Policy, X-Frame-Options, Permissions-Policy y HSTS en producción.
- No se usa SQL concatenado; Prisma se usa para consultas normales.
- Auditoría de operaciones relevantes.
- No se almacenan passwords, tokens ni secretos en logs de auditoría.

## 14. Revisión frente a amenazas

| Amenaza | Medida |
|---|---|
| SQL Injection | Prisma + ninguna concatenación SQL |
| XSS | React escaping + CSP; sin `dangerouslySetInnerHTML` |
| CSRF | Auth.js + validación same-origin en operaciones mutables |
| SSRF | endpoints externos controlados únicamente por variables de entorno |
| IDOR | consultas con `id + storeId` y permiso |
| Broken Access Control | `apiAuth()` + `hasPermission()` server-side |
| Privilege Escalation | roles y permisos no confiados desde cliente; restricciones de SUPER_ADMIN |
| Mass Assignment | Zod DTOs explícitos |
| Path Traversal | storage keys generadas por servidor |
| File Upload | tamaño, MIME/extensión, magic bytes y Sharp |
| Authentication Bypass | Auth.js + sesión verificada contra DB |
| Session Fixation | sesiones gestionadas por Auth.js y `sessionVersion` |
| Brute Force | rate limiting |
| Credential Stuffing | rate limiting; producción debe añadir MFA/WAF/bot controls |
| Open Redirect | redirects internos controlados |
| Information Disclosure | errores genéricos y selección explícita de campos |
| Insecure Deserialization | JSON validado con Zod |
| Command Injection | no se ejecuta input del usuario como comando |
| Prototype Pollution | sin merges peligrosos de objetos no validados |
| Dependency Vulnerabilities | `npm audit`, Dependabot y workflow de seguridad |
| Race Conditions | operaciones críticas agrupadas en transacciones cuando corresponde |
| Tenant Isolation | `storeId` derivado del servidor en consultas y escrituras |

## 15. Controles que requieren infraestructura externa

- MFA/WebAuthn para cuentas administrativas.
- WAF/bot protection y detección avanzada de credential stuffing.
- Redis/Upstash para rate limiting consistente entre múltiples instancias.
- KMS/Secret Manager para secretos.
- Antivirus/ICAP o sandbox para archivos si el negocio necesita aceptar documentos no confiables.
- Backups, PITR y pruebas de restauración de PostgreSQL.
- Versionado/retención y políticas IAM de S3/R2.
- Monitoreo SIEM/APM y alertas de seguridad.
- TLS terminado en infraestructura de producción.

## 16. Estructura

```text
src/
  app/
    api/
      auth/
      users/
      stores/
      roles/
      permissions/
      records/
      files/
      audit/
      profile/
    dashboard/
      users/
      stores/
      roles/
      records/
      files/
      audit/
      profile/security/
    login/
    forgot-password/
    reset-password/
  components/
  generated/              # generado por Prisma; no se versiona
  lib/
    auth/
    audit/
    db/
    permissions/
    security/
    services/
    storage/
    validation/
  types/
prisma/
  schema.prisma
  seed.ts
  migrations/
.github/
  workflows/
  dependabot.yml
tests/
  unit/
  security/
  e2e/
Dockerfile
docker-compose.yml
.env.example
.gitignore
README.md
SECURITY.md
CONTRIBUTING.md
CODE_OF_CONDUCT.md
LICENSE
next.config.ts
prisma.config.ts
proxy.ts
auth.ts
auth.config.ts
```

## 17. GitHub

```bash
git init
git add .
git commit -m "Initial secure multi-tenant platform"
git branch -M main
git remote add origin <URL_DEL_REPOSITORIO>
git push -u origin main
```

Antes de `git push`, confirme:

```bash
git status
git ls-files .env
```

El segundo comando debe no mostrar `.env`.

## 18. Producción

1. Cree PostgreSQL administrado.
2. Cree bucket privado S3/R2.
3. Configure IAM con mínimo privilegio.
4. Configure Redis/Upstash.
5. Configure SMTP.
6. Genere `AUTH_SECRET` con un generador criptográficamente seguro.
7. Configure TLS y `AUTH_URL` con HTTPS.
8. Ejecute `npm ci`.
9. Ejecute `npm run db:deploy`.
10. Ejecute `npm run build`.
11. Ejecute `npm start` o despliegue el contenedor.
12. Verifique logs, backups, alertas y pruebas de aislamiento antes de abrir tráfico.

## 19. Limitación de validación de entrega

El entorno donde se generó este repositorio no pudo completar `npm install` dentro de la ventana disponible, por lo que no sería correcto afirmar que aquí se ejecutaron satisfactoriamente `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` y los E2E. El código y la configuración están preparados para ejecutarlos localmente/CI, pero deben correrse en un entorno con acceso al registro npm antes de considerar el artefacto listo para producción.
