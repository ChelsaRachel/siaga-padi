---
name: python-file-naming
description: "File naming and module structuring rules for Python/FastAPI. Load when adding a new feature module, creating new files, or organizing code."
---

# File Naming & Module Structure

---

## New Feature Module Layout

When adding a new feature/module, create all three layers:

```
dto/
└── <feature>.py          ← FeatureDTO, UpdateFeatureDTO, FindFeatureDTO(FindDTO)

service/
└── <feature>.py          ← class Feature(BaseSupabaseRepository)

router/
└── <feature>.py          ← router = APIRouter(**router_param_builder(tag))
```

---

## Naming Rules Per Layer

### DTO (`dto/<feature>.py`)

| Class | Pattern | Example |
|-------|---------|---------|
| Create payload | `<Feature>DTO` | `ProductDTO` |
| Update payload | `Update<Feature>DTO` | `UpdateProductDTO` |
| Search / filter | `Find<Feature>DTO` | `FindProductDTO` |

### Service (`service/<feature>.py`)

| Element | Pattern | Example |
|---------|---------|---------|
| Class name | `<Feature>` (PascalCase) | `class Product(BaseSupabaseRepository)` |
| Method names | `snake_case` verbs | `add`, `update`, `remove`, `get`, `find` |

### Router (`router/<feature>.py`)

| Element | Pattern | Example |
|---------|---------|---------|
| Tag variable | `tag = "<feature>"` | `tag = "product"` |
| Exported variable | `router` (always this name) | `router = APIRouter(...)` |

---

## File Naming Convention

| Layer | Convention | Example |
|-------|-----------|---------|
| DTO | `snake_case.py` | `product_category.py` |
| Service | `snake_case.py` | `product_category.py` |
| Router | `snake_case.py` | `product_category.py` |

Multi-word features use `snake_case` — never `kebab-case` or `camelCase` for Python file names.

---

## Registering a New Router

After creating `router/<feature>.py`, add it to `ROUTER_MODULES` in `api.py`:

```py
ROUTER_MODULES = [
    "router.auth",
    "router.user",
    "router.product",       # ← new module
]
```

Or conditionally via `settings.ENABLED_ROUTERS` if the module supports conditional loading.

---

## Forbidden Patterns

| Pattern | Reason |
|---------|--------|
| `router/ProductManager.py` (PascalCase filename) | Python files must be `snake_case` |
| Creating a router without registering it in `api.py` | The module will never load |
| Putting multiple unrelated features in one DTO file | One feature per file — keeps scope clear |
| Naming the exported router anything other than `router` | `api.py` relies on the `router` variable name |
