# Security Policy

## Reportar vulnerabilidades
No publique vulnerabilidades explotables en issues. Envíe un reporte privado al mantenedor del repositorio con pasos de reproducción, impacto y evidencia mínima.

## Secretos
Nunca committee `.env`, contraseñas, tokens, claves S3, credenciales Redis ni secretos de Auth.js. Rote inmediatamente cualquier secreto expuesto.

## Dependencias
Ejecute `npm audit --audit-level=high` y mantenga Dependabot habilitado. Revise cambios mayores antes de actualizar producción.

## Backups
Realice backups cifrados de PostgreSQL y pruebe restauraciones periódicamente. El bucket S3/R2/MinIO debe tener versionado y políticas de retención según el negocio.

## Rotación
Rote `AUTH_SECRET`, credenciales de base de datos, S3 y Redis. Al rotar `AUTH_SECRET`, las sesiones JWT existentes quedan inválidas.

## Limitaciones
La aplicación implementa controles de aplicación, pero no sustituye WAF, gestión de secretos, MFA, monitoreo, antivirus/ICAP para archivos, cifrado de base de datos, backups ni controles IAM de la infraestructura.
