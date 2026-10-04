# Genesis Impresiones 3D — Landing

Landing publica con catalogo de modelos de impresion 3D (Bambu/MakerWorld) y derivacion de
consultas a WhatsApp.

- Sitio: `https://genesisimpresiones.github.io/`
- Operacion: Emmanuel Ortiz (mantenedor tecnico)

## Contenido

| Archivo | Rol |
| --- | --- |
| `index.html` / `styles.css` | Interfaz publica |
| `config.js` | Numero de WhatsApp y mensaje base (archivo publico: nunca incluir tokens) |
| `src/catalog-cache.js` + `data/catalog-cache.json` | Catalogo pre-generado (fallback local) |
| `assets/` | Marca e imagenes optimizadas (WebP) |

## Como funciona el catalogo

En hosting estatico (GitHub Pages) el endpoint `/api/catalog` no existe: la UI lo detecta
automaticamente y usa el **catalogo local** (`src/catalog-cache.js`, generado desde MakerWorld).
No requiere backend ni claves.

## Como actualizar el catalogo

El mantenedor tecnico refresca el cache con token autorizado en maquina privada
(`npm run cache:refresh` en el proyecto interno) y publica con `npm run publish`.

## Contacto

- WhatsApp: +54 9 2644 13-1773
- Sello de pie de pagina: desarrollado por Gentle Vanguard — sistemas y apps a medida
  (contacto directo por WhatsApp desde el sello).
