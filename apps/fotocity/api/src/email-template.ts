interface Produto {
  nome: string;
  foto?: string;
  url: string;
}

export interface BrandConfig {
  name: string;
  domain: string;
  logoUrl: string;
  primaryColor: string;
  whatsapp?: string;
  whatsappDisplay?: string;
  instagram?: string;
  facebook?: string;
  tagline?: string;
}

export function buildEmailHtml(primeiroNome: string, produtos: Produto[], brand: BrandConfig): string {
  const productCards = produtos
    .map(
      (p) => `
      <tr>
        <td style="padding: 8px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <tr>
              ${
                p.foto
                  ? `<td width="90" style="padding: 12px; vertical-align: middle;">
                      <img src="${p.foto}" alt="${p.nome}" width="80" height="80" style="display: block; border-radius: 6px; object-fit: cover;" />
                    </td>`
                  : ''
              }
              <td style="padding: 12px; vertical-align: middle;">
                <p style="margin: 0 0 10px 0; font-size: 15px; font-weight: 600; color: #333333; font-family: 'Roboto', Arial, sans-serif;">
                  ${p.nome}
                </p>
                <a href="${p.url}" target="_blank" style="display: inline-block; background: #1e88e5; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-size: 14px; font-weight: 700; font-family: 'Roboto', Arial, sans-serif;">
                  Enviar Fotos &rarr;
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    )
    .join('');

  const socialIcons = [
    brand.instagram
      ? `<td style="padding: 0 8px;">
          <a href="${brand.instagram}" target="_blank" style="display: inline-block; width: 32px; height: 32px; background: ${brand.primaryColor}; border-radius: 50%; text-align: center; line-height: 32px; text-decoration: none; color: #ffffff; font-size: 14px;">
            IG
          </a>
        </td>`
      : '',
    brand.facebook
      ? `<td style="padding: 0 8px;">
          <a href="${brand.facebook}" target="_blank" style="display: inline-block; width: 32px; height: 32px; background: ${brand.primaryColor}; border-radius: 50%; text-align: center; line-height: 32px; text-decoration: none; color: #ffffff; font-size: 14px;">
            FB
          </a>
        </td>`
      : '',
    brand.whatsapp
      ? `<td style="padding: 0 8px;">
          <a href="https://wa.me/${brand.whatsapp}" target="_blank" style="display: inline-block; width: 32px; height: 32px; background: #25d366; border-radius: 50%; text-align: center; line-height: 32px; text-decoration: none; color: #ffffff; font-size: 14px;">
            WA
          </a>
        </td>`
      : '',
  ]
    .filter(Boolean)
    .join('');

  const socialBlock = socialIcons
    ? `<tr>
        <td align="center" style="padding: 16px 0;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>${socialIcons}</tr>
          </table>
        </td>
      </tr>`
    : '';

  const whatsappLine = brand.whatsapp
    ? `<tr>
        <td align="center" style="font-size: 13px; color: #666666; font-family: 'Roboto', Arial, sans-serif;">
          <a href="https://wa.me/${brand.whatsapp}" target="_blank" style="color: #25d366; text-decoration: none; font-weight: 600;">
            WhatsApp${brand.whatsappDisplay ? `: ${brand.whatsappDisplay}` : ''}
          </a>
        </td>
      </tr>`
    : '';

  const taglineRow = brand.tagline
    ? `<tr>
        <td align="center" style="font-size: 13px; color: #666666; line-height: 1.6; font-family: 'Roboto', Arial, sans-serif;">
          ${brand.tagline}
        </td>
      </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${brand.name} - Envie suas fotos</title>
</head>
<body style="margin: 0; padding: 0; background: #f4f4f9; font-family: 'Roboto', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f4f4f9; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">

          <!-- TOP BAR -->
          <tr>
            <td style="background: ${brand.primaryColor}; padding: 10px 24px; border-radius: 8px 8px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <img src="${brand.logoUrl}" alt="${brand.name}" height="36" style="display: block;" />
                  </td>
                  <td align="right" style="font-size: 12px; color: #ffcccb; font-family: 'Roboto', Arial, sans-serif;">
                    ${brand.domain}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background: #ffffff; padding: 32px 24px;">
              <p style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #333333; font-family: 'Roboto', Arial, sans-serif;">
                Ol&aacute; ${primeiroNome}! &#128247;
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #555555; line-height: 1.6; font-family: 'Roboto', Arial, sans-serif;">
                Muito obrigado pela compra! Clique no bot&atilde;o de cada item para enviar suas fotos.
              </p>

              <!-- PRODUCT CARDS -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${productCards}
              </table>

              <p style="margin: 24px 0 0 0; font-size: 13px; color: #999999; line-height: 1.5; font-family: 'Roboto', Arial, sans-serif;">
                Os links acima s&atilde;o exclusivos para o seu pedido. Basta clicar e arrastar suas fotos!
              </p>
            </td>
          </tr>

          <!-- FOOTER / SIGNATURE -->
          <tr>
            <td style="background: #fafafa; padding: 24px; border-top: 2px solid ${brand.primaryColor}; border-radius: 0 0 8px 8px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <img src="${brand.logoUrl}" alt="${brand.name}" height="40" style="display: block;" />
                  </td>
                </tr>
                ${taglineRow}
                ${socialBlock}
                ${whatsappLine}
                <tr>
                  <td align="center" style="padding-top: 16px; font-size: 11px; color: #999999; font-family: 'Roboto', Arial, sans-serif;">
                    &copy; ${new Date().getFullYear()} ${brand.name} &mdash; ${brand.domain}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
