# 📊 Cardinalidades Completas - Base de Datos Supabase

## Schema de Base de Datos - FarmaciaApp

---

## 📋 TABLAS Y SUS CAMPOS

### 1. auth.users (Tabla de Supabase Auth)
| Campo | Tipo | PK | FK | Descripción |
|-------|------|-----|-----|-----------|
| id | uuid | ✅ | - | ID único del usuario |
| email | text | - | - | Correo electrónico |
| created_at | timestamp | - | - | Fecha de creación |

---

### 2. profiles (Perfiles de usuarios)
| Campo | Tipo | PK | FK | Referencias |
|-------|------|-----|-----|-----------|
| id | uuid | ✅ | ✅ | auth.users(id) |
| email | text | - | - | Correo |
| nombre | text | - | - | Nombre completo |
| documento | text | - | - | Documento |
| telefono | text | - | - | Teléfono |
| direccion | text | - | - | Dirección |
| ciudad | text | - | - | Ciudad |
| barrio | text | - | - | Barrio |
| fecha_nacimiento | text | - | - | Fecha de nacimiento |
| rol | text | - | - | Rol del usuario |
| activo | boolean | - | - | Si está activo |
| pharmacy_id | uuid | - | ✅ | pharmacies(id) |
| foto_url | text | - | - | Foto de perfil |

**Cardinalidades:**
- auth.users **(1:1)** profiles
- profiles **(N:1)** pharmacies (cuando pharmacy_id no es null)

---

### 3. pharmacies (Farmacias)
| Campo | Tipo | PK | FK | Referencias |
|-------|------|-----|-----|-----------|
| id | uuid | ✅ | - | ID único |
| nombre | text | - | - | Nombre |
| nit | text | - | - | NIT |
| direccion | text | - | - | Dirección |
| ciudad | text | - | - | Ciudad |
| barrio | text | - | - | Barrio |
| telefono | text | - | - | Teléfono |
| email | text | - | - | Email |
| estado | text | - | - | Estado (pendiente/aprobado/rechazado) |
| user_id | uuid | - | ✅ | auth.users(id) |
| responsable_nombre | text | - | - | Nombre del responsable |
| hora_apertura | time | - | - | Hora apertura |
| hora_cierre | time | - | - | Hora cierre |
| logo | text | - | - | Logo |
| created_at | timestamp | - | - | Fecha creación |

**Cardinalidades:**
- auth.users **(1:1)** pharmacies (cada usuario admin tiene 1 pharmacy)
- profiles **(1:N)** pharmacies (un admin gestiona 1 pharmacy)
- pharmacies **(1:N)** productos
- pharmacies **(1:N)** pedidos

---

### 4. productos (Productos)
| Campo | Tipo | PK | FK | Referencias |
|-------|------|-----|-----|-----------|
| id | uuid | ✅ | - | ID único |
| nombre | text | - | - | Nombre |
| categoria | text | - | - | Categoría |
| precio | integer | - | - | Precio |
| stock | integer | - | - | Stock |
| imagen | text | - | - | Emoji/Imagen |
| formula_medica | boolean | - | - | Requiere fórmula |
| pharmacy_id | uuid | - | ✅ | pharmacies(id) |
| created_at | timestamp | - | - | Fecha |

**Cardinalidades:**
- pharmacies **(1:N)** productos
- productos **(1:N)** formulas

---

### 5. pedidos (Pedidos)
| Campo | Tipo | PK | FK | Referencias |
|-------|------|-----|-----|-----------|
| id | uuid | ✅ | - | ID único |
| cliente_id | uuid | - | ✅ | profiles(id) |
| pharmacy_id | uuid | - | ✅ | pharmacies(id) |
| estado | text | - | - | Estado pedido |
| total | integer | - | - | Total |
| costo_domicilio | integer | - | - | Costo domicilio |
| metodo_pago | text | - | - | Método pago |
| codigo_verificacion | text | - | - | Código entrega |
| domiciliariouser_id | uuid | - | ✅ | profiles(id) |
| entregado | boolean | - | - | Entregado |
| created_at | timestamp | - | - | Fecha |

**Cardinalidades:**
- profiles **(1:N)** pedidos (cliente hace pedidos)
- profiles **(1:N)** pedidos (domiciliario tiene pedidos asignados)
- pharmacies **(1:N)** pedidos
- pedidos **(1:1)** facturas
- pedidos **(1:N)** pedido_productos

---

### 6. pedido_productos (Items del pedido)
| Campo | Tipo | PK | FK | Referencias |
|-------|------|-----|-----|-----------|
| id | uuid | ✅ | - | ID único |
| pedido_id | uuid | - | ✅ | pedidos(id) |
| producto_id | uuid | - | ✅ | productos(id) |
| cantidad | integer | - | - | Cantidad |
| precio_unitario | integer | - | - | Precio unitario |

**Cardinalidades:**
- pedidos **(1:N)** pedido_productos
- pedido_productos **(N:1)** pedidos
- pedido_productos **(N:1)** productos

---

### 7. formulas (Fórmulas médicas)
| Campo | Tipo | PK | FK | Referencias |
|-------|------|-----|-----|-----------|
| id | uuid | ✅ | - | ID único |
| usuario_id | uuid | - | ✅ | profiles(id) |
| producto_id | uuid | - | ✅ | productos(id) |
| foto_url | text | - | - | URL imagen |
| estado | text | - | - | Estado |
| observacion | text | - | - | Observación |
| created_at | timestamp | - | - | Fecha |

**Cardinalidades:**
- profiles **(1:N)** formulas
- formulas **(N:1)** profiles
- productos **(1:N)** formulas
- formulas **(N:1)** productos

---

### 8. facturas (Facturas)
| Campo | Tipo | PK | FK | Referencias |
|-------|------|-----|-----|-----------|
| id | uuid | ✅ | - | ID único |
| pedido_id | uuid | - | ✅ | pedidos(id) |
| total | integer | - | - | Total |
| fecha | timestamp | - | - | Fecha |

**Cardinalidades:**
- pedidos **(1:1)** facturas
- facturas **(N:1)** pedidos

---

### 9. domiciliario (Se gestiona desde profiles)
**No es una tabla separada**. Se usa **profiles** con `rol = 'domiciliario'`

| Campo | Tipo | Descripción |
|-------|------|-----------|
| Sehereda todos los campos de profiles | - | Perfil del domiciliario |

**Cardinalidades:**
- profiles **(1:N)** pedidos (domiciliario tiene pedidos asignados)
- pedidos **(N:1)** profiles (domiciliario asignado)

---

## 📊 RESUMEN COMPLETO DE CARDINALIDADES

```
╔════════════════════════════════════════════════════════════════════════════════════╗
║          TODAS LAS RELACIONES (BASADO EN SCHEMA SUPABASE)           ║
╚════════════════════════════════════════════════════════════════════════════════════╝


┌────────────────────────────────────────────────────────────────────────┐
│  # │     ORIGEN     │  REL  │    DESTINO    │  DESCRIPCIÓN              │
├────────────────────────────────────────────────────────────────────────┤
│ 1 │ auth.users    │  1:1 │ profiles    │ Un usuario tiene un perfil   │
├────────────────────────────────────────────────────────────────────────┤
│ 2 │ profiles    │  1:1 │ auth.users  │ Un perfil es de un usuario │
├────────────────────────────────────────────────────────────────────────┤
│ 3 │ profiles    │  N:1  │ pharmacies │ belongs a pharmacy      │
├────────────────────────────────────────────────────────────────────────┤
│ 4 │ profiles    │  1:N  │ pedidos   │ many pedidos (cliente) │
├���───────────────────────────────────────────────────────────────────────┤
│ 5 │ profiles    │  1:N  │ formulas  │ many fórmulas (usuario) │
├────────────────────────────────────────────────────────────────────────┤
│ 6 │ profiles    │  1:N  │ pedidos   │ many pedidos (domicil.) │
├────────────────────────────────────────────────────────────────────────┤
│ 7 │ auth.users    │  1:1 │ pharmacies│ Un usuario es admin     │
├────────────────────────────────────────────────────────────────────────┤
│ 8 │ pharmacies  │  1:N  │ productos │ Una pharmacy tiene N prod │
├────────────────────────────────────────────────────────────────────────┤
│ 9 │ pharmacies  │  1:N  │ pedidos  │ Una pharmacy tiene N ped │
├────────────────────────────────────────────────────────────────────────┤
│10 │ productos   │  1:N  │ formulas │ Un producto tiene N form │
├────────────────────────────────────────────────────────────────────────┤
│11 │ pedidos    │  1:1  │ facturas │ Un pedido tiene 1 fact │
├────────────────────────────────────────────────────────────────────────┤
│12 │ pedidos    │  1:N  │ pedido_prod│ Un pedido tiene N items│
├────────────────────────────────────────────────────────────────────────┤
│13 │ pedido_prod│  N:1  │ pedidos  │ Item es de un pedido     │
├────────────────────────────────────────────────────────────────────────┤
│14 │ pedido_prod│  N:1  │ productos│ Item es de un producto │
├────────────────────────────────────────────────────────────────────────┤
│15 │ formulas  │  N:1  │ profiles │ Fórmula es de usuario  │
├────────────────────────────────────────────────────────────────────────┤
│16 │ formulas  │  N:1  │productos │ Fórmula es de producto │
├────────────────────────────────────────────────────────────────────────┤
│17 │ facturas  │  N:1  │ pedidos  │ Factura es de pedido   │
└──────────────────────────────────────────────��─��───────────────────────┘


══════════════════════════════════════════════════════════════════════════

                    DIAGRAMA RELACIONAL COMPLETO

    ┌──────────────────┐
    │  auth.users   │
    │  (PK) id    │
    └──────┬───────┘
           │
           │ 1:1            │ 1:1
           ▼                  ▼
    ┌──────────────────┐      ┌──────────────────┐
    │   profiles   │      │  pharmacies   │
    │  (PK) id    │◄────►│  (PK) id    │
    │ pharmacy_id│ N:1  │ user_id   │
    │ (FK)     │      │ (FK)     │
    │ rol = 'domiciliario'  (se manage desde profiles)
    └──────┬───────┘      └──────┬───────┘
           │                  │
           │ 1:N              │ 1:N
           ▼                  ▼
    ┌──────────────────┐      ┌──────────────────┐
    │    pedidos    │      │  productos    │
    │  (PK) id    │      │  (PK) id    │
    │ cliente_id │      │ pharmacy_id│
    │ (FK)     │      │ (FK)     │
    │ pharmacy_id│      └──────┬───────┘
    │ (FK)     │           │
    │domiciliario_id│           │ 1:N
    │ (FK)     │           ▼
    └──────┬───────┘    ┌──────────────────┐
           │ 1:N      │  formulas    │
           ▼          │  (PK) id    │
    ┌──────────────────┐ │ usuario_id │
    │pedido_productos│ │ (FK)     │
    │  (PK) id    │ │ producto_id│
    │ pedido_id │ │ (FK)     │
    │ (FK)     │ └──────┬───────┘
    │ producto_id│        │ N:1
    │ (FK)     │        ▼
    └──────┬───────┘   ┌──────────────────┐
           │ N:1    │  factorials    │
           ▼        │  (PK) id    │
    ┌──────────────────┐ │ pedido_id│
    │  productos   │ │ (FK)     │
    │  (PK) id    │ └──────────────┘
    └──────────────────┘


══════════════════════════════════════════════════════════════════════════

                    LLAVES FORÁNEAS (FOREIGN KEYS)

┌────────────┬────────────────────────────┬──────────────────────────────┐
│  TABLA   │         FK CAMPO          │    REFERENCIA             │
├────────────┼────────────────────────────┼──────────────────────────────┤
│ profiles │ id (PK)                 │ auth.users(id)            │
│ profiles │ pharmacy_id             │ pharmacies(id)          │
├────────────┼────────────────────────────┼──────────────────────────────┤
│pharmacies│ user_id                │ auth.users(id)            │
├────────────┼────────────────────────────┼──────────────────────────────┤
│productos │ pharmacy_id              │ pharmacies(id)          │
├────────────┼────────────────────────────┼──────────────────────────────┤
│ pedidos │ cliente_id              │ profiles(id)            │
│ pedidos │ pharmacy_id             │ pharmacies(id)          │
│ pedidos │domici iariouser_id │ profiles(id)           │
├────────────┼────────────────────────────┼──────────────────────────────┤
│pedido_prod│ pedido_id               │ pedidos(id)            │
│pedido_prod│ producto_id             │ productos(id)          │
├────────────┼────────────────────────────┼──────────────────────────────┤
│ formulas│ usuario_id             │ profiles(id)            │
│ formulas│ producto_id            │ productos(id)          │
├────────────┼────────────────────────────┼──────────────────────────────┤
│facturas │ pedido_id               │ pedidos(id)            │
└────────────┴────────────────────────────┴──────────────────────────────┘


═══════════════════════════════════════════════���═���════════════════════════════════

                    DOMICILIARIO ESPECIAL

El domiciliario NO es una tabla separada.
Se gestiona mediante la tabla profiles con:
- Campo: rol = 'domiciliario'
- Campo: activo = true/false (para activar/desactivar)

┌──────────────────────────────────────────────────────────────────┐
│ profiles (con rol = 'domiciliario')            │
├──────────────────────────────────────┤
│ Relations:                            │
│ - profiles → pedidos (1:N)              │
│   (domiciliario tiene pedidos         │
│    asignados mediante              │
│    domiciliariouser_id en pedidos)   │
└──────────────────────────────────────┘


══════════════════════════════════════════════════════════════════════════

                    RESUMEN DE CARDINALIDAD

- auth.users → profiles: 1:1
- auth.users → pharmacies: 1:1
- profiles → pharmacies: N:1 (cuando es admin)
- profiles → pedidos (cliente): 1:N
- profiles → formulas: 1:N
- profiles → pedidos (domiciliario): 1:N
- pharmacies → productos: 1:N
- pharmacies → pedidos: 1:N
- productos → formulas: 1:N
- pedidos → factura: 1:1
- pedidos → pedido_productos: 1:N
- pedido_productos → pedidos: N:1
- pedido_productos → productos: N:1
- formulas → profiles: N:1
- formulas → productos: N:1
- facturas → pedidos: N:1


══════════════════════════════════════════════════════════════════════════════════

                    TOTAL DE RELACIONES

┌─────────────────────────────────────┐
│ TIPO DE RELACIÓN │ CANTIDAD          │
├─────────────────────────────────────┤
│ 1:1             │ 5              │
│ 1:N             │ 9              │
│ N:1             │ 5              │
├─────────────────────────────────────┤
│ TOTAL           │ 19             │
└─────────────────────────────────────┘


*Cardinalidades basadas en schema real de Supabase - FarmaciaApp v1.0*