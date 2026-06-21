// Tenant config: reads VITE_* env vars at build time, falls back to fotocity defaults.
// To switch tenants, set the matching .env.<tenant> file and build with --mode <tenant>.

export const config = {
  apiUrl: import.meta.env.VITE_API_URL || '',

  brandName: import.meta.env.VITE_BRAND_NAME || 'FotoCity',
  brandDomain: import.meta.env.VITE_BRAND_DOMAIN || 'fotocity.com.br',
  brandLogo: import.meta.env.VITE_BRAND_LOGO || 'https://cdn.iset.io/assets/73325/imagens/logo-foto-city.png',
  primaryColor: import.meta.env.VITE_PRIMARY_COLOR || '#d62828',

  // ?? (não ||) para que VITE_*= vazio no .env mantenha empty string
  // e os elementos sumam pela conditional && no JSX, em vez de cair no default fotocity.
  whatsapp: import.meta.env.VITE_WHATSAPP ?? '5511957323619',
  instagramUrl: import.meta.env.VITE_INSTAGRAM_URL ?? 'https://www.instagram.com/fotocityoficial/',
  facebookUrl: import.meta.env.VITE_FACEBOOK_URL ?? 'https://www.facebook.com/fotocitygrafica/',

  // ?? (não ||) para que VITE_*= vazio no .env desative o webhook (string vazia),
  // em vez de cair no default fotocity. Upload.tsx só dispara quando a URL é truthy.
  webhookUrl: import.meta.env.VITE_WEBHOOK_URL ?? 'https://n8n.fotocity.com.br/webhook/envio-fotos',
  confirmationWebhookUrl: import.meta.env.VITE_CONFIRMATION_WEBHOOK_URL ?? 'https://n8n.fotocity.com.br/webhook/pedidos/envio-fotos-confirmacao',
  publicWebUrl: import.meta.env.VITE_PUBLIC_WEB_URL || 'https://envios.fotocity.com.br',
  managerUrl: import.meta.env.VITE_MANAGER_URL || 'https://envios.fotocity.com.br/manager',

  postMsgKey: import.meta.env.VITE_POSTMSG_KEY || 'fotocity:upload-complete',
}
