window.GENESIS_WHATSAPP_NUMBER = "5492644131773";
window.GENESIS_WHATSAPP_MESSAGE =
  "Hola Genesis, quiero consultar por un trabajo de impresion 3D del catalogo. Puedo pasarles el ID o una imagen de referencia.";

// Catalogo en vivo: Cloudflare Worker gv-genesis-catalog (backend sin token expuesto,
// cache edge 10 min). Si cae, la UI cae automaticamente al catalogo local cacheado.
// En sandbox local con server.mjs, reemplazar por "/api/catalog".
window.GENESIS_BAMBU_API_URL =
  "https://gv-genesis-catalog.gentlevanguard.workers.dev/api/catalog";

// Sello de creacion (footer): contacto de servicios de desarrollo de sistemas/aplicaciones.
window.GENESIS_DEV_CONTACT_URL =
  "https://wa.me/5492645452221?text=Hola%20GentleVanguard!%20Me%20interesa%20el%20servicio%20de%20Software%20empresarial%20(apps%20y%20plataformas%20a%20medida).";
