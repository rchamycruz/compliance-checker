# AUTENTICACIÓN GITHUB MODERNA
## Fine-Grained Tokens vs GitHub Apps (2026)

---

## 🔐 OPCIONES DE AUTENTICACIÓN (2026)

### Estado Actual:
- ❌ **Classic Tokens** - DEPRECADOS (dejar de usar)
- ✅ **Fine-Grained Tokens** - RECOMENDADO para scripts
- ✅ **GitHub App** - RECOMENDADO para automatización permanente
- ✅ **SSH Keys** - Alternativa sin token

---

## OPCIÓN 1: Fine-Grained Personal Access Token (RECOMENDADO PARA AHORA)

### Paso 1: Ir a Settings

```
https://github.com/settings/tokens?type=beta
(O manualmente: GitHub > Settings > Developer settings > Personal access tokens > Fine-grained tokens)
```

### Paso 2: Crear Fine-Grained Token

```
Haz clic en: "Generate new token"
```

### Paso 3: Configurar el Token

**Formulario a llenar:**

```
Token name:
  syntaxis-compliance-creator

Description:
  Para crear repositorio compliance-checker en GitHub

Expiration:
  7 days (o el que prefieras)

Repository access:
  ⊙ All repositories
  (O específico si ya existe el repo)

Permissions (Permisos específicos):

  Repository permissions:
    ✓ Contents: Read and Write (para subir código)
    ✓ Workflows: Read and Write (para GitHub Actions)
    ✓ Issues: Read and Write (para tracking)
    ✓ Pull requests: Read and Write (para PRs)
    ✓ Commit statuses: Read and Write
    ✓ Deployments: Read and Write

  Account permissions:
    ✓ Read user profile data
```

### Paso 4: Copiar Token

```
Se muestra UNA SOLA VEZ:

github_pat_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
(Empieza con github_pat_, ~130 caracteres)

⚠️ CÓPIALO INMEDIATAMENTE
```

---

## OPCIÓN 2: GitHub App (MEJOR PARA AUTOMATIZACIÓN PERMANENTE)

Si quieres que esto funcione a largo plazo sin renovar tokens:

### Paso 1: Crear GitHub App

```
Ve a: https://github.com/settings/apps/new
(O: GitHub > Settings > Developer settings > GitHub Apps)
```

### Paso 2: Configurar la App

**Formulario:**

```
GitHub App name:
  syntaxis-compliance-checker

Homepage URL:
  https://github.com/syntaxis-spa/compliance-checker

User authorization callback URL:
  (Dejar vacío para ahora)

Webhook:
  ⊘ Active (No necesario para crear repo)

Repository permissions:
  ✓ Contents: Read & write
  ✓ Workflows: Read & write
  ✓ Issues: Read & write
  ✓ Pull requests: Read & write
  ✓ Commit statuses: Read & write

Account permissions:
  ✓ Email addresses: Read-only
  ✓ Plan: Read-only

Where can this GitHub App be installed?
  ⊙ Only on this account
  ✓ Make this GitHub App public

Create GitHub App
```

### Paso 3: Generar Private Key

```
Después de crear:
1. Ve a "Private keys"
2. Haz clic en "Generate a private key"
3. Se descarga automáticamente: syntaxis-compliance-checker.2026-05-25.private-key.pem

⚠️ Guárdalo en lugar seguro
```

### Paso 4: Instalar en tu Cuenta

```
1. Ve a la página de tu GitHub App
2. Haz clic en "Install App"
3. Selecciona tu cuenta
4. Selecciona "All repositories" o los específicos
5. Autoriza
```

---

## OPCIÓN 3: SSH Key (Alternativa sin Token)

Si prefieres no usar tokens:

### Paso 1: Generar SSH Key

```bash
ssh-keygen -t ed25519 -C "tu@email.com" -f ~/.ssh/github_compliance

# Se crea:
# ~/.ssh/github_compliance (private, nunca compartir)
# ~/.ssh/github_compliance.pub (public, subir a GitHub)
```

### Paso 2: Agregar a GitHub

```
1. Ve a: https://github.com/settings/keys
2. "New SSH key"
3. Title: "Syntaxis Compliance Checker"
4. Key type: Authentication Key
5. Pega el contenido de github_compliance.pub
6. Add SSH key
```

### Paso 3: Usar en Git

```bash
# Configurar git para usar SSH
git config --global url."git@github.com:".insteadOf "https://github.com/"

# O en el proyecto específico
git remote set-url origin git@github.com:tu-usuario/compliance-checker.git
```

---

## 📊 COMPARACIÓN DE OPCIONES

| Aspecto | Fine-Grained Token | GitHub App | SSH Key |
|---------|------------------|-----------|---------|
| **Facilidad** | ⭐⭐⭐ Fácil | ⭐ Complejo | ⭐⭐ Medio |
| **Seguridad** | ⭐⭐⭐ Alta (permisos específicos) | ⭐⭐⭐ Muy alta | ⭐⭐⭐ Muy alta |
| **Durabilidad** | ⭐ Corta (7 días default) | ⭐⭐⭐ Permanente | ⭐⭐⭐ Permanente |
| **Para scripts** | ✅ SÍ | ❌ Complejo | ✅ SÍ |
| **Para automatización** | ⚠️ Requiere renovar | ✅ Ideal | ✅ Ideal |
| **Renovación** | Manual cada 7 días | Automática | Automática |
| **Para crear repo ahora** | ✅ RECOMENDADO | ✅ Funciona | ✅ Funciona |

---

## 🎯 RECOMENDACIÓN PARA TI

**Para crear TODO el repositorio AHORA:**

### Opción A: Rápido y Simple (RECOMENDADO)
```
Usar: Fine-Grained Token
Razón: Se crea en 2 minutos, funciona perfectamente
Duración: 7 días (suficiente para crear el repo)
```

### Opción B: A Largo Plazo
```
Usar: GitHub App + SSH Key
Razón: No necesita renovación, más profesional
Durabilidad: Permanente
```

### Opción C: Mi Recomendación Personal
```
Combinación:
1. Fine-Grained Token AHORA (crear repo)
2. SSH Key después (para operaciones futuras)
Ventaja: Mejor de ambos mundos
```

---

## 📝 INSTRUCCIONES PASO A PASO (FINE-GRAINED - RÁPIDO)

Si quieres la forma más rápida AHORA:

### Paso 1: Abrir Settings

```
https://github.com/settings/tokens?type=beta
```

### Paso 2: Crear Token

```
Generate new token → Generate new token (fine-grained)
```

### Paso 3: Llenar Formulario

```
Token name:
  syntaxis-creator

Expiration:
  7 days

Repository access:
  ⊙ All repositories

Permissions:
  Contents: Read and Write
  Workflows: Read and Write
```

### Paso 4: Generar y Copiar

```
Generate token
↓
COPIA EL TOKEN (github_pat_...)
↓
PÉGALO EN TU RESPUESTA
```

---

## 🔧 CÓMO USARLO CON MI CÓDIGO

Cuando me des el Fine-Grained Token, usaré esto para conectarme:

```bash
# Configurar git con el token
git config --global url."https://[TOKEN]@github.com/".insteadOf "https://github.com/"

# O como environment variable
export GITHUB_TOKEN="github_pat_XXXXXXX"

# Luego:
git clone https://github.com/tu-usuario/compliance-checker.git
cd compliance-checker
# Automaticamente usa el token para autenticación
```

---

## ¿CUÁL ELIJO?

### Si respondas "ahora mismo":
```
→ Fine-Grained Token
→ 2 minutos para crear
→ Perfecto para este caso
```

### Si respondas "quiero que funcione siempre":
```
→ GitHub App
→ 5 minutos para crear
→ Permanente sin renovación
```

### Si respondas "quiero lo más seguro":
```
→ SSH Key
→ 3 minutos para crear
→ Nada de tokens en la máquina
```

---

## 📋 RESPONDE EN CHAT

Cuando tengas el token, envía:

```
Opción elegida: [Fine-Grained / GitHub App / SSH Key]

Token / Key: [tu-token-o-key]

URL del repo: https://github.com/usuario/compliance-checker

Email: tu@email.com

Nombre: Tu Nombre
```

---

## ⚠️ NOTAS DE SEGURIDAD

### Para Fine-Grained Token:
```
✓ Cópialo inmediatamente (se muestra una sola vez)
✓ No lo compartas públicamente
✓ Revócalo cuando termines (en Settings)
✓ Duración: 7 días (lo revocamos después automáticamente)
```

### Para GitHub App:
```
✓ Guarda la private key en lugar seguro
✓ No la subas a GitHub o público
✓ La puedes desinstalar cuando quieras
✓ Permanente hasta que lo hagas
```

### Para SSH Key:
```
✓ Guarda la private key en ~/.ssh
✓ Nunca la compartas
✓ Puede durarte indefinidamente
✓ Desactívala en Settings si la pierdes
```

---

## 🚀 FLUJO FINAL

```
1. Eliges opción (Fine-Grained / App / SSH)
2. Creas el token/key
3. Me das:
   - Token/Key
   - URL del repo
   - Email + Nombre
4. Yo me conecto a GitHub
5. Creo TODO (10 min):
   - Estructura completa
   - Todos los archivos
   - Todos los commits
   - Tags y releases
6. ¡Listo para clonar!
```

---

## 💬 RESPONDE CUANDO TENGAS LISTO

```
Opción: [Fine-Grained / GitHub App / SSH Key]
Token: github_pat_XXXXXXXXXX (o la key)
URL: https://github.com/usuario/compliance-checker
Email: tu@email.com
Nombre: Tu Nombre
```

**Y yo crearé TODO automáticamente con autenticación moderna.**

---

## 📚 REFERENCIAS

- [Fine-Grained Tokens](https://github.blog/2022-10-18-introducing-fine-grained-personal-access-tokens-for-github/)
- [GitHub Apps](https://docs.github.com/en/developers/apps/getting-started-with-apps/about-apps)
- [SSH Keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)

---

¿Cuál prefieres? Te espero la respuesta con el token listo.
