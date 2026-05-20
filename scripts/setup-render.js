/**
 * Script de setup para Render.com
 */

console.log('Configurando para Render.com...');

// Verificar se estamos no Render
const isRender = process.env.RENDER === 'true' || process.env.RENDER_EXTERNAL_URL;

if (!isRender) {
  console.log('Nao estamos no Render, pulando configuracao especifica');
  process.exit(0);
}

console.log('Detectado ambiente Render');
console.log('Instalacao completa!');
console.log('');
console.log('Proximos passos:');
console.log('1. Configure as variaveis de ambiente no dashboard do Render');
console.log('2. O banco de dados sera criado automaticamente');
console.log('3. Acesse sua URL publica apos o deploy');
console.log('');
console.log('URL da aplicacao:', process.env.RENDER_EXTERNAL_URL || 'Sera mostrada apos deploy');
